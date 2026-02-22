import * as THREE from "three";
import { Render3JS } from "../render";
import { WorldText } from "../helpers/WorldText";
import { PlayerEvents } from "./PlayerEvents";

export interface PlayerProps {
    id: string;
    name: string;
    hasController: boolean;
    speed?: number;
    jump_force?: number;
    position?: THREE.Vector3;
    maxHealth?: number;
}

export class Player {
    private render: Render3JS;
    public id: string;
    public name: string;
    public mesh: THREE.Mesh;
    private playerGroup: THREE.Group;
    private cameraPivot: THREE.Group;
    private uiLabel: WorldText;
    public events: PlayerEvents = new PlayerEvents();

    public speed: number = 10;
    public jump_force: number = 10;
    public hasController: boolean = false;

    public health: number = 100;
    public maxHealth: number = 100;
    public isDead: boolean = false;

    public input_direction = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jumpRequested: false,
        joystickX: 0,
        joystickY: 0
    };

    public velocityY: number = 0;
    public isGrounded: boolean = true;

    private rotY: number = 0;
    private rotX: number = 0;

    private targetPosition = new THREE.Vector3();
    private targetRotation = new THREE.Euler();
    private readonly lerpSpeed: number = 20;

    private lastEmittedPosition = new THREE.Vector3();
    private lastEmittedRotationY: number = 0;
    private lastEmitTime: number = 0;
    private readonly emitInterval: number = 15;

    constructor(render: Render3JS, props: PlayerProps) {
        this.render = render;
        this.id = props.id;
        this.name = props.name;
        this.speed = props.speed ?? 10;
        this.jump_force = props.jump_force ?? 10;
        this.hasController = props.hasController;
        this.maxHealth = props.maxHealth || 100;
        this.health = this.maxHealth;

        this.playerGroup = new THREE.Group();
        this.cameraPivot = new THREE.Group();

        if (props.position) {
            this.playerGroup.position.copy(props.position);
            this.targetPosition.copy(props.position);
        }

        const geometry = new THREE.BoxGeometry(10, 10, 10);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            roughness: 0.7,
            metalness: 0.3
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.playerGroup.add(this.mesh);

        this.uiLabel = new WorldText(this.name);
        this.uiLabel.sprite.position.y = 10;
        this.playerGroup.add(this.uiLabel.sprite);

        if (this.hasController) {
            this.playerGroup.add(this.cameraPivot);
            this.cameraPivot.add(this.render.camera);
            this.render.camera.position.set(0, 10, 60);
            this.initEvents();
        }

        this.render.scene.add(this.playerGroup);
    }

    public takeDamage(amount: number) {
        if (this.isDead) return;
        this.health = Math.max(0, this.health - amount);
        this.events.emitHealth({
            health: this.health,
            maxHealth: this.maxHealth,
            percentage: (this.health / this.maxHealth) * 100
        });
        if (this.health <= 0) this.die();
    }

    private die() {
        this.isDead = true;
        (this.mesh.material as THREE.MeshStandardMaterial).color.set(0xff0000);
        this.events.emitDeath();
    }

    public setPosition(x: number, y: number, z: number) {
        if (this.hasController) {
            this.playerGroup.position.set(x, y, z);
            this.checkAndEmitMove();
        } else {
            const dist = this.playerGroup.position.distanceTo(new THREE.Vector3(x, y, z));
            if (dist > 15) this.playerGroup.position.set(x, y, z);
            this.targetPosition.set(x, y, z);
        }
    }

    public setRotation(x: number, y: number, z: number) {
        if (this.hasController) {
            this.playerGroup.rotation.set(x, y, z);
            this.checkAndEmitMove();
        } else {
            const currentY = this.playerGroup.rotation.y;
            let targetY = y;
            while (targetY - currentY > Math.PI) targetY -= Math.PI * 2;
            while (targetY - currentY < -Math.PI) targetY += Math.PI * 2;
            this.targetRotation.set(x, targetY, z);
        }
    }

    public updateRotation(deltaX: number, deltaY: number) {
        const sensitivity = 0.002;
        this.rotY -= deltaX * sensitivity;
        this.rotX -= deltaY * sensitivity;
        const maxPitch = Math.PI / 2 - 0.01;
        this.rotX = Math.max(-maxPitch, Math.min(maxPitch, this.rotX));
    }

    private onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "w") this.input_direction.forward = true;
        if (e.key === "s") this.input_direction.backward = true;
        if (e.key === "a") this.input_direction.left = true;
        if (e.key === "d") this.input_direction.right = true;
        if (e.key === " " && !this.input_direction.jumpRequested) this.input_direction.jumpRequested = true;
    };

    private onKeyUp = (e: KeyboardEvent) => {
        if (e.key === "w") this.input_direction.forward = false;
        if (e.key === "s") this.input_direction.backward = false;
        if (e.key === "a") this.input_direction.left = false;
        if (e.key === "d") this.input_direction.right = false;
    };

    private onMouseMove = (e: MouseEvent) => {
        if (document.pointerLockElement !== this.render.renderer.domElement) return;
        this.updateRotation(e.movementX, e.movementY);
    };

    private initEvents() {
        window.addEventListener("keydown", this.onKeyDown);
        window.addEventListener("keyup", this.onKeyUp);
        window.addEventListener("mousemove", this.onMouseMove);
    }

    public jump() {
        if (!this.input_direction.jumpRequested) {
            this.input_direction.jumpRequested = true;
            this.events.emitJumping();
        }
    }

    public getPosition() { return this.playerGroup.position; }

    public join() {
        if (!this.render.players.find(p => p.id === this.id)) this.render.players.push(this);
    }

    public leave() {
        this.render.players = this.render.players.filter(p => p.id !== this.id);
        this.render.scene.remove(this.playerGroup);
        if (this.hasController) {
            this.cameraPivot.remove(this.render.camera);
            window.removeEventListener("keydown", this.onKeyDown);
            window.removeEventListener("keyup", this.onKeyUp);
            window.removeEventListener("mousemove", this.onMouseMove);
        }
    }

    public destroy() {
        this.leave();
        this.events.clear();
        this.mesh.geometry.dispose();
        if (Array.isArray(this.mesh.material)) this.mesh.material.forEach(m => m.dispose());
        else this.mesh.material.dispose();
        this.uiLabel.destroy();
    }

    public update(delta: number) {
        this.uiLabel.updateUI(this.name, (this.health / this.maxHealth) * 100);
        if (this.isDead) return;

        if (this.hasController) {
            this.playerGroup.rotation.y = this.rotY;
            this.cameraPivot.rotation.x = this.rotX;

            let moveX = (this.input_direction.right ? 1 : 0) - (this.input_direction.left ? 1 : 0);
            let moveZ = (this.input_direction.backward ? 1 : 0) - (this.input_direction.forward ? 1 : 0);

            if (this.input_direction.joystickX !== 0 || this.input_direction.joystickY !== 0) {
                moveX = this.input_direction.joystickX;
                moveZ = -this.input_direction.joystickY;
            }

            const direction = new THREE.Vector3(moveX, 0, moveZ);
            if (direction.lengthSq() > 1) direction.normalize();

            direction.applyEuler(new THREE.Euler(0, this.playerGroup.rotation.y, 0));
            direction.multiplyScalar(this.speed * delta);

            this.playerGroup.position.add(direction);
            this.checkAndEmitMove();
        } else {
            const lerpStep = Math.min(1, this.lerpSpeed * delta);
            this.playerGroup.position.lerp(this.targetPosition, lerpStep);
            this.playerGroup.rotation.y = THREE.MathUtils.lerp(this.playerGroup.rotation.y, this.targetRotation.y, lerpStep);
        }
    }

    private checkAndEmitMove() {
        if (!this.hasController) return;
        const now = performance.now();
        if (now - this.lastEmitTime < this.emitInterval) return;
        const dist = this.playerGroup.position.distanceTo(this.lastEmittedPosition);
        const rotDist = Math.abs(this.playerGroup.rotation.y - this.lastEmittedRotationY);

        if (dist > 0.001 || rotDist > 0.001) {
            this.lastEmittedPosition.copy(this.playerGroup.position);
            this.lastEmittedRotationY = this.playerGroup.rotation.y;
            this.lastEmitTime = now;
            this.events.emitMove({
                position: { x: this.playerGroup.position.x, y: this.playerGroup.position.y, z: this.playerGroup.position.z },
                rotation: { x: 0, y: Number(this.playerGroup.rotation.y.toFixed(3)), z: 0 }
            });
        }
    }
}