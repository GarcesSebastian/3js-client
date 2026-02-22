import * as THREE from "three";
import { Render3JS } from "../render";

export class Physics {
    private render: Render3JS;
    private worker: Worker;
    private isCalculating: boolean = false;

    constructor(render: Render3JS) {
        this.render = render;
        this.worker = new Worker(new URL('../workers/physics.worker.ts', import.meta.url));
        this.initWorker();
    }

    private initWorker() {
        this.worker.onmessage = (e) => {
            const { players } = e.data;
            players.forEach((pData: any, index: number) => {
                const player = this.render.players[index];
                if (player) {
                    player.setPosition(pData.position.x, pData.position.y, pData.position.z);
                    player.velocityY = pData.velocityY;
                    player.isGrounded = pData.isGrounded;

                    if (pData.jumpProcessed) {
                        player.input_direction.jumpRequested = false;
                    }
                }
            });
            this.isCalculating = false;
        };
    }

    public update(delta: number) {
        if (this.isCalculating) return;

        this.isCalculating = true;

        const playersData = this.render.players.map((p, index) => ({
            id: index,
            position: p.getPosition(),
            velocityY: p.velocityY,
            isGrounded: p.isGrounded,
            jumpRequested: p.input_direction.jumpRequested,
            jumpForce: p.jump_force
        }));

        this.worker.postMessage({
            players: playersData,
            delta,
            gravity: this.render.gravity
        });
    }
}