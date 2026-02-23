import { Render3JS } from "../render";
import { Player } from "../instances/_game/player";

export class Physics {
    private render: Render3JS;
    private worker: Worker;
    private isCalculating: boolean = false;

    constructor(render: Render3JS) {
        this.render = render;
        this.worker = new Worker(new URL('../workers/physics.worker.ts', import.meta.url));
        this.initWorker();
    }

    private getLocalPlayer(): Player | undefined {
        return this.render.players.find(p => p.hasController);
    }

    private initWorker() {
        this.worker.onmessage = (e) => {
            const { position, velocityY, isGrounded, jumpProcessed } = e.data;
            const local = this.getLocalPlayer();
            if (local) {
                local.setPosition(position.x, position.y, position.z);
                local.velocityY = velocityY;
                local.isGrounded = isGrounded;
                if (jumpProcessed) {
                    local.input_direction.jumpRequested = false;
                }
            }
            this.isCalculating = false;
        };
    }

    public update(delta: number) {
        if (this.isCalculating) return;

        const local = this.getLocalPlayer();
        if (!local || local.isDead) return;

        this.isCalculating = true;

        const localCollider = local.getCollider();
        const localPos = local.getPosition();

        const obstacles = this.render.players
            .filter(p => !p.hasController && !p.isDead)
            .map(p => p.getCollider());

        this.worker.postMessage({
            local: {
                position: { x: localPos.x, y: localPos.y, z: localPos.z },
                colliderCenter: localCollider.center,
                velocityY: local.velocityY,
                isGrounded: local.isGrounded,
                jumpRequested: local.input_direction.jumpRequested,
                jumpForce: local.jump_force,
                size: localCollider.size
            },
            obstacles,
            delta,
            gravity: this.render.gravity
        });
    }
}