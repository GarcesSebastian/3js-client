import * as THREE from "three";
import { EventsListener } from "./helpers/EventsListener";
import { Player } from "./instances/_game/player";
import { Physics } from "./helpers/Physics";
import { Room } from "./instances/_logic/room";
import { Projectile } from "./instances/_game/projectile";
import { Socket } from "socket.io-client";
import { LoaderAssets } from "./helpers/LoaderAssets";
import { GameEvents } from "./events/GameEvents";

export class Render3JS {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;

    public width: number = window.innerWidth;
    public height: number = window.innerHeight;
    public gravity: number = 9.8 * 40;

    private animateId: number | null = null;
    private timer: any = new THREE.Timer();

    public players: Player[] = [];
    public projectiles: Map<string, Projectile> = new Map();
    public physics: Physics;
    public room: Room;
    public socket: Socket;
    public events: GameEvents;

    private fpsCounter: HTMLDivElement;
    private frameCount: number = 0;
    private lastFpsUpdate: number = 0;

    public constructor(socket: Socket, container?: HTMLElement) {
        this.socket = socket;
        this.events = new GameEvents();
        new EventsListener(this);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.width / this.height,
            0.1,
            1000
        )

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance",
        })
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

        const target = container || document.body;
        target.appendChild(this.renderer.domElement);

        if (!container) {
            document.body.style.cursor = "none";
        }

        this.renderer.domElement.addEventListener("click", () => {
            this.renderer.domElement.requestPointerLock();
        });

        this.fpsCounter = document.createElement("div");
        this.fpsCounter.className = "fps-counter";

        const style = document.createElement("style");
        style.textContent = `
            .fps-counter {
                position: absolute;
                top: 10px;
                right: 10px;
                padding: 4px 8px;
                background: rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(4px);
                border-radius: 6px;
                font-family: 'JetBrains Mono', monospace;
                font-size: 14px;
                font-weight: 800;
                z-index: 100;
                pointer-events: none;
                border: 1px solid rgba(255, 255, 255, 0.05);
            }
            @media (max-width: 768px) {
                .fps-counter {
                    font-size: 10px;
                    padding: 2px 6px;
                    top: 5px;
                    right: 5px;
                }
            }
        `;
        document.head.appendChild(style);
        target.appendChild(this.fpsCounter);

        this.physics = new Physics(this);
        this.room = new Room(this);

        this.loadAssets().then(() => {
            this.events.emitLoaded();
        });
    }

    private async loadAssets(): Promise<void> {
        const [base] = await Promise.all([
            LoaderAssets.load("/assets/base.glb", "gltf"),
            LoaderAssets.preload()
        ]);

        base.model.position.set(0, -0.1, 0);
        base.model.scale.set(100, 1, 100);
        this.scene.add(base.model);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);
    }

    private updateFps() {
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFpsUpdate >= 1000) {
            const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
            this.fpsCounter.innerText = `${fps} FPS`;

            if (fps >= 60) this.fpsCounter.style.color = "#00ff00";
            else if (fps >= 30) this.fpsCounter.style.color = "#ff8800";
            else this.fpsCounter.style.color = "#ff0000";

            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }
    }

    public animate() {
        this.animateId = requestAnimationFrame(this.animate.bind(this));
        this.timer.update();
        const delta = this.timer.getDelta();
        this.updateFps();
        this.update(delta)
        this.render();
    }

    public update(delta: number) {
        this.players.forEach(player => player.update(delta));
        this.projectiles.forEach(projectile => projectile.update(delta));
        this.physics.update(delta);
    }

    public render() {
        this.renderer.render(this.scene, this.camera);
    }

    public start() {
        if (this.animateId) return;
        this.animate();
    }

    public stop() {
        if (!this.animateId) return;
        cancelAnimationFrame(this.animateId);
        this.animateId = null;
    }

    public destroy() {
        this.stop();
        this.renderer.dispose();
        this.scene.clear();
        this.players = [];
        this.fpsCounter.remove();
    }
}