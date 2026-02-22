self.onmessage = (e: MessageEvent) => {
    const { players, delta, gravity } = e.data;
    const results = players.map((p: any) => ({
        id: p.id,
        position: { ...p.position },
        velocityY: p.velocityY,
        isGrounded: p.isGrounded,
        jumpRequested: p.jumpRequested,
        jumpForce: p.jumpForce,
        jumpProcessed: false
    }));

    for (let i = 0; i < results.length; i++) {
        const p = results[i];

        if (p.jumpRequested && p.isGrounded) {
            p.velocityY = p.jumpForce;
            p.isGrounded = false;
            p.jumpProcessed = true;
        }

        p.velocityY -= gravity * delta;
        p.position.y += p.velocityY * delta;
        p.isGrounded = false;

        if (p.position.y <= 0) {
            p.position.y = 0;
            p.velocityY = 0;
            p.isGrounded = true;
        }
    }

    const size = 10;

    for (let i = 0; i < results.length; i++) {
        const p1 = results[i];
        for (let j = 0; j < results.length; j++) {
            if (i === j) continue;
            const p2 = results[j];

            const dx = p1.position.x - p2.position.x;
            const dy = p1.position.y - p2.position.y;
            const dz = p1.position.z - p2.position.z;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            const absDz = Math.abs(dz);

            if (absDx < size && absDy < size && absDz < size) {
                const overlapX = size - absDx;
                const overlapY = size - absDy;
                const overlapZ = size - absDz;

                if (overlapY < overlapX && overlapY < overlapZ) {
                    if (dy > 0) {
                        p1.position.y += overlapY;
                        if (p1.velocityY < 0) {
                            p1.velocityY = 0;
                            p1.isGrounded = true;
                        }
                    } else {
                        p1.position.y -= overlapY;
                        p1.velocityY = Math.max(0, p1.velocityY);
                    }
                } else if (overlapX < overlapZ) {
                    p1.position.x += dx > 0 ? overlapX : -overlapX;
                } else {
                    p1.position.z += dz > 0 ? overlapZ : -overlapZ;
                }
            }
        }
    }

    self.postMessage({ players: results });
};
