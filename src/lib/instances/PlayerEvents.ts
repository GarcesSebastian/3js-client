import * as THREE from "three";

export type MoveEventData = {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
};

export type HealthEventData = {
    health: number;
    maxHealth: number;
    percentage: number;
};

export class PlayerEvents {
    private onMoveCallbacks: ((data: MoveEventData) => void)[] = [];
    private onJumpingCallbacks: (() => void)[] = [];
    private onDeathCallbacks: (() => void)[] = [];
    private onHealthCallbacks: ((data: HealthEventData) => void)[] = [];

    public onMove(callback: (data: MoveEventData) => void) {
        this.onMoveCallbacks.push(callback);
    }

    public onJumping(callback: () => void) {
        this.onJumpingCallbacks.push(callback);
    }

    public onDeath(callback: () => void) {
        this.onDeathCallbacks.push(callback);
    }

    public onHealth(callback: (data: HealthEventData) => void) {
        this.onHealthCallbacks.push(callback);
    }

    public emitMove(data: MoveEventData) {
        this.onMoveCallbacks.forEach(cb => cb(data));
    }

    public emitJumping() {
        this.onJumpingCallbacks.forEach(cb => cb());
    }

    public emitDeath() {
        this.onDeathCallbacks.forEach(cb => cb());
    }

    public emitHealth(data: HealthEventData) {
        this.onHealthCallbacks.forEach(cb => cb(data));
    }

    public clear() {
        this.onMoveCallbacks = [];
        this.onJumpingCallbacks = [];
        this.onDeathCallbacks = [];
        this.onHealthCallbacks = [];
    }
}
