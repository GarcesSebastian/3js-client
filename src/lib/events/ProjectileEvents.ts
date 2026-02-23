export type MoveEventData = {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
};

export type DeathEventData = {
    id: string;
    ownerId: string;
};

export type HitEventData = {
    id: string;
    ownerId: string;
    targetId: string;
};

export class ProjectileEvents {
    private onMoveCallbacks: ((data: MoveEventData) => void)[] = [];
    private onDeathCallbacks: ((data: DeathEventData) => void)[] = [];
    private onHitCallbacks: ((data: HitEventData) => void)[] = [];

    public onMove(callback: (data: MoveEventData) => void) {
        this.onMoveCallbacks.push(callback);
    }

    public onDeath(callback: (data: DeathEventData) => void) {
        this.onDeathCallbacks.push(callback);
    }

    public onHit(callback: (data: HitEventData) => void) {
        this.onHitCallbacks.push(callback);
    }

    public emitMove(data: MoveEventData) {
        this.onMoveCallbacks.forEach(cb => cb(data));
    }

    public emitDeath(data: DeathEventData) {
        this.onDeathCallbacks.forEach(cb => cb(data));
    }

    public emitHit(data: HitEventData) {
        this.onHitCallbacks.forEach(cb => cb(data));
    }

    public clear() {
        this.onMoveCallbacks = [];
        this.onDeathCallbacks = [];
        this.onHitCallbacks = [];
    }
}
