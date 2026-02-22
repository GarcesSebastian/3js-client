import * as THREE from "three";
import { Render3JS } from "../render";
import { WorldText } from "../helpers/WorldText";

interface PlayerProps {
    name: string;
    speed: number;
    jump_force: number;
    hasController: boolean;
    position?: THREE.Vector3;
    maxHealth?: number;
}

export class Player {
    private render: Render3JS;
    public name: string;
    public mesh: THREE.Mesh;
    private playerGroup: THREE.Group;
    private cameraPivot: THREE.Group;
    private uiLabel: WorldText;

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
        jumpRequested: false
    };

    public velocityY: number = 0;
    public isGrounded: boolean = true;

    private rotY: number = 0;
    private rotX: number = 0;

    constructor(render: Render3JS, props: PlayerProps) {
        this.render = render;
        this.name = props.name;
        this.speed = props.speed;
        this.jump_force = props.jump_force;
        this.hasController = props.hasController;
        this.maxHealth = props.maxHealth || 100;
        this.health = this.maxHealth;

        this.playerGroup = new THREE.Group();
        this.cameraPivot = new THREE.Group();

        if (props.position) {
            this.playerGroup.position.copy(props.position);
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

        if (this.health <= 0) {
            this.die();
        }
    }

    private die() {
        this.isDead = true;
        (this.mesh.material as THREE.MeshStandardMaterial).color.set(0xff0000);
    }

    public setPosition(x: number, y: number, z: number) {
        this.playerGroup.position.set(x, y, z);
    }

    public getPosition() {
        return this.playerGroup.position;
    }

    private initEvents() {
        window.addEventListener("keydown", (event) => {
            if (event.key === "w") this.input_direction.forward = true;
            if (event.key === "s") this.input_direction.backward = true;
            if (event.key === "a") this.input_direction.left = true;
            if (event.key === "d") this.input_direction.right = true;
            if (event.key === " " && !this.input_direction.jumpRequested) {
                this.input_direction.jumpRequested = true;
            }
        });

        window.addEventListener("keyup", (event) => {
            if (event.key === "w") this.input_direction.forward = false;
            if (event.key === "s") this.input_direction.backward = false;
            if (event.key === "a") this.input_direction.left = false;
            if (event.key === "d") this.input_direction.right = false;
        });

        window.addEventListener("mousemove", (event) => {
            if (document.pointerLockElement !== this.render.renderer.domElement) return;

            const sensitivity = 0.002;

            this.rotY -= event.movementX * sensitivity;
            this.rotX -= event.movementY * sensitivity;

            const maxPitch = Math.PI / 2 - 0.01;
            this.rotX = Math.max(-maxPitch, Math.min(maxPitch, this.rotX));
        });
    }

    public jump() {
        if (!this.input_direction.jumpRequested) {
            this.input_direction.jumpRequested = true;
        }
    }

    public update(delta: number) {
        this.uiLabel.updateUI(this.name, (this.health / this.maxHealth) * 100);

        if (this.isDead) return;

        if (this.hasController) {
            this.playerGroup.rotation.y = this.rotY;
            this.cameraPivot.rotation.x = this.rotX;
        }

        const moveX = (this.input_direction.right ? 1 : 0) - (this.input_direction.left ? 1 : 0);
        const moveZ = (this.input_direction.backward ? 1 : 0) - (this.input_direction.forward ? 1 : 0);

        const direction = new THREE.Vector3(moveX, 0, moveZ);
        if (direction.lengthSq() > 0) direction.normalize();

        direction.applyEuler(new THREE.Euler(0, this.playerGroup.rotation.y, 0));
        direction.multiplyScalar(this.speed * delta);

        this.playerGroup.position.add(direction);
    }
}