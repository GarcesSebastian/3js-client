export type MoveEventData = {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
};

export type DeathEventData = {
    id: string;
    ownerId: string;
};

export class ProjectileEvents {
    private onMoveCallbacks: ((data: MoveEventData) => void)[] = [];
    private onDeathCallbacks: ((data: DeathEventData) => void)[] = [];

    public onMove(callback: (data: MoveEventData) => void) {
        this.onMoveCallbacks.push(callback);
    }

    public onDeath(callback: (data: DeathEventData) => void) {
        this.onDeathCallbacks.push(callback);
    }

    public emitMove(data: MoveEventData) {
        this.onMoveCallbacks.forEach(cb => cb(data));
    }

    public emitDeath(data: DeathEventData) {
        this.onDeathCallbacks.forEach(cb => cb(data));
    }

    public clear() {
        this.onMoveCallbacks = [];
        this.onDeathCallbacks = [];
    }
}
