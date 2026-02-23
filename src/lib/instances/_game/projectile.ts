import * as THREE from "three"
import { ProjectileEvents } from "../../events/ProjectileEvents";
import { Render3JS } from "../../render";

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
    public mesh: THREE.Object3D;

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

        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(this.radius, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00 })
        );

        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh.rotation.y = yaw;

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

            const collider = player.getCollider();
            const playerCenter = new THREE.Vector3(
                collider.center.x,
                collider.center.y,
                collider.center.z
            );

            const dist = this.mesh.position.distanceTo(playerCenter);

            const xMatch = Math.abs(this.mesh.position.x - playerCenter.x) < (collider.size.x / 2 + this.radius);
            const yMatch = Math.abs(this.mesh.position.y - playerCenter.y) < (collider.size.y / 2 + this.radius);
            const zMatch = Math.abs(this.mesh.position.z - playerCenter.z) < (collider.size.z / 2 + this.radius);

            if (xMatch && yMatch && zMatch) {
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
        this.render.projectiles.delete(this.id);

        this.mesh.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.geometry.dispose();
                if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
                else mesh.material.dispose();
            }
        });

        this.render.scene.remove(this.mesh);
        this.emitDeath({ id: this.id, ownerId: this.ownerId });
    }
}