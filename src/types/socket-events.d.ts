export interface PlayerMoveData {
    id: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    isMoving?: boolean;
    isSprinting?: boolean;
    isJumping?: boolean;
}