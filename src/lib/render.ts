import * as THREE from "three";
import { EventsListener } from "./helpers/EventsListener";
import { Player } from "./instances/player";
import { Physics } from "./helpers/Physics";

export class Render3JS {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;

    public width: number = window.innerWidth;
    public height: number = window.innerHeight;
    public gravity: number = 9.8 * 40;

    private animateId: number | null = null;
    private clock: THREE.Clock = new THREE.Clock();

    public players: Player[] = [];
    public physics: Physics;

    private fpsCounter: HTMLDivElement;
    private frameCount: number = 0;
    private lastFpsUpdate: number = 0;

    constructor() {
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
            powerPreference: "high-performance"
        })
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(window.devicePixelRatio)

        document.body.appendChild(this.renderer.domElement);
        document.body.style.cursor = "none";

        this.renderer.domElement.addEventListener("click", () => {
            this.renderer.domElement.requestPointerLock();
        });

        this.fpsCounter = document.createElement("div");
        this.fpsCounter.style.position = "absolute";
        this.fpsCounter.style.top = "10px";
        this.fpsCounter.style.right = "10px";
        this.fpsCounter.style.padding = "5px 10px";
        this.fpsCounter.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        this.fpsCounter.style.borderRadius = "5px";
        this.fpsCounter.style.fontFamily = "monospace";
        this.fpsCounter.style.fontSize = "18px";
        this.fpsCounter.style.fontWeight = "bold";
        document.body.appendChild(this.fpsCounter);

        const player1 = new Player(this, {
            name: "Main Player",
            speed: 120,
            jump_force: 150,
            hasController: true,
            position: new THREE.Vector3(0, 0, 0)
        });

        const player2 = new Player(this, {
            name: "Target NPC",
            speed: 80,
            jump_force: 100,
            hasController: false,
            position: new THREE.Vector3(50, 0, -100)
        });

        setInterval(() => {
            player2.takeDamage(10);
        }, 1000);

        this.players.push(player1, player2);

        this.physics = new Physics(this);

        const floorGeometry = new THREE.PlaneGeometry(1000, 1000);
        const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -5;
        this.scene.add(floor);

        const grid = new THREE.GridHelper(1000, 100, 0x444444, 0x222222);
        grid.position.y = -4.9;
        this.scene.add(grid);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);

        window.addEventListener("keydown", (e) => {
            if (e.key === "k") {
                player2.takeDamage(10);
            }
        });
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
        const delta = this.clock.getDelta();
        this.updateFps();
        this.update(delta)
        this.render();
    }

    public update(delta: number) {
        this.players.forEach(player => player.update(delta));
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
}