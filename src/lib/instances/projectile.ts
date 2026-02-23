import * as THREE from "three"
import { ProjectileEvents } from "../events/ProjectileEvents";
import { Render3JS } from "../render";

export interface ProjectileProps {
    id: string,
    ownerId: string,
    position: { x: number, y: number, z: number },
    rotation: { x: number, y: number, z: number },
    speed: number,
    damage: number,
    radius: number,
    ttl?: number,
    createdAt?: number
}

const MAX_PROJECTILES = 400;

export class Projectile extends ProjectileEvents {
    public render: Render3JS;
    public mesh: THREE.Mesh;

    public id: string;
    public ownerId: string;

    private position: { x: number, y: number, z: number };
    private rotation: { x: number, y: number, z: number };
    private velocity: { x: number, y: number, z: number };

    private speed: number;
    private damage: number;
    private radius: number;

    private ttl: number;
    private startTime: number;
    private destroyed: boolean = false;

    public constructor(props: ProjectileProps, render: Render3JS, noEmit: boolean = false) {
        super();

        if (render.projectiles.size >= MAX_PROJECTILES) {
            const oldest = render.projectiles.values().next().value;
            if (oldest) oldest.destroy();
        }

        this.render = render;
        this.id = props.id;
        this.ownerId = props.ownerId;
        this.position = { x: props.position.x, y: props.position.y, z: props.position.z };
        this.rotation = { x: props.rotation.x, y: props.rotation.y, z: props.rotation.z };
        this.speed = props.speed;
        this.ttl = props.ttl ?? 5000;
        this.damage = props.damage;
        this.radius = props.radius;

        const yaw = props.rotation.y;
        this.velocity = {
            x: -Math.sin(yaw),
            y: 0,
            z: -Math.cos(yaw)
        };

        const elapsedMs = props.createdAt ? Math.max(0, Date.now() - props.createdAt) : 0;
        const elapsedSec = elapsedMs / 1000;

        if (elapsedSec > 0) {
            this.position.x += this.velocity.x * this.speed * elapsedSec;
            this.position.y += this.velocity.y * this.speed * elapsedSec;
            this.position.z += this.velocity.z * this.speed * elapsedSec;
        }

        this.startTime = performance.now() - elapsedMs;

        const geometry = new THREE.SphereGeometry(props.radius, 6, 6);
        const material = new THREE.MeshBasicMaterial({ color: 0xff4400 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);

        if (!noEmit) this.render.socket.emit("projectile:create", this.getStats());
        this.render.scene.add(this.mesh);
        this.render.projectiles.set(this.id, this);
    }

    public update(delta: number) {
        if (this.destroyed) return;

        this.position.x += this.velocity.x * this.speed * delta;
        this.position.y += this.velocity.y * this.speed * delta;
        this.position.z += this.velocity.z * this.speed * delta;
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);

        if (performance.now() - this.startTime > this.ttl) {
            this.destroy();
            return;
        }

        for (const player of this.render.players) {
            if (player.id === this.ownerId || player.isDead) continue;

            const dist = this.mesh.position.distanceTo(player.getPosition());
            const collisionDist = 10;

            if (dist < collisionDist) {
                this.emitHit({
                    id: this.id,
                    ownerId: this.ownerId,
                    targetId: player.id
                });
                this.destroy();
                return;
            }
        }
    }

    public getStats(): ProjectileProps {
        return {
            id: this.id,
            ownerId: this.ownerId,
            position: { x: this.position.x, y: this.position.y, z: this.position.z },
            rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
            speed: this.speed,
            damage: this.damage,
            radius: this.radius,
            ttl: this.ttl
        };
    }

    public destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.render.scene.remove(this.mesh);
        this.render.projectiles.delete(this.id);
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.MeshBasicMaterial).dispose();
        this.emitDeath({ id: this.id, ownerId: this.ownerId });
    }
}