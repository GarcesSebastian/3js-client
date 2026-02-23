interface ColliderId {
    center: { x: number; y: number; z: number };
    size: { x: number; y: number; z: number };
}

self.onmessage = (e: MessageEvent) => {
    const { local, obstacles, delta, gravity } = e.data;

    const pos = { ...local.position };
    let velocityY: number = local.velocityY;
    let isGrounded: boolean = local.isGrounded;
    let jumpProcessed: boolean = false;

    const s = local.size;
    const co = local.colliderCenter;
    const offsetX = co.x - pos.x;
    const offsetY = co.y - pos.y;
    const offsetZ = co.z - pos.z;

    if (local.jumpRequested && isGrounded) {
        velocityY = local.jumpForce;
        isGrounded = false;
        jumpProcessed = true;
    }

    velocityY -= gravity * delta;
    pos.y += velocityY * delta;
    isGrounded = false;

    if (pos.y <= 0) {
        pos.y = 0;
        velocityY = 0;
        isGrounded = true;
    }

    const cx = pos.x + offsetX;
    const cy = pos.y + offsetY;
    const cz = pos.z + offsetZ;

    for (const obs of obstacles as ColliderId[]) {
        const halfX = (s.x + obs.size.x) / 2;
        const halfY = (s.y + obs.size.y) / 2;
        const halfZ = (s.z + obs.size.z) / 2;

        const dx = cx - obs.center.x;
        const dy = cy - obs.center.y;
        const dz = cz - obs.center.z;

        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const absDz = Math.abs(dz);

        if (absDx < halfX && absDy < halfY && absDz < halfZ) {
            const overlapX = halfX - absDx;
            const overlapY = halfY - absDy;
            const overlapZ = halfZ - absDz;

            if (overlapY < overlapX && overlapY < overlapZ) {
                if (dy > 0) {
                    pos.y += overlapY;
                    if (velocityY < 0) {
                        velocityY = 0;
                        isGrounded = true;
                    }
                } else {
                    pos.y -= overlapY;
                    if (velocityY > 0) velocityY = 0;
                }
            } else if (overlapX < overlapZ) {
                pos.x += dx > 0 ? overlapX : -overlapX;
            } else {
                pos.z += dz > 0 ? overlapZ : -overlapZ;
            }
        }
    }

    self.postMessage({ position: pos, velocityY, isGrounded, jumpProcessed });
};
