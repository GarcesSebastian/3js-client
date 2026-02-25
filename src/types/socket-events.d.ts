export interface PlayerMoveData {
    id: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    isMoving?: boolean;
    isSprinting?: boolean;
    isJumping?: boolean;
}

export interface PlayerAnimateData {
    id: string;
    animation: string;
    atPercent: number;
    pauseFor: number;
    speedBefore: number;
    speedAfter: number;
}