import * as THREE from "three";
import { Render3JS } from "../../render";
import { WorldText } from "../_ui/WorldText";
import { PlayerEvents } from "../../events/PlayerEvents";
import { LoaderAssets, TemplatePayload } from "../../helpers/LoaderAssets";
import { v4 as uuidv4 } from "uuid";

export interface PlayerStats {
    id: string;
    meshName?: string;
    username: string;
    health: number;
    maxHealth: number;
    speed: number;
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number, z: number };
    velocityY?: number;
    isJumping?: boolean;
    shootCooldownMs?: number;
}

export interface PlayerProps extends PlayerStats {
    hasController: boolean;
    jump_force?: number;
}

export class Player {
    private render: Render3JS;
    public id: string;
    public username: string;
    public mesh: THREE.Object3D = new THREE.Object3D();
    public meshName: string = "";

    private colliderOffset: THREE.Vector3 = new THREE.Vector3();
    private colliderSize: THREE.Vector3 = new THREE.Vector3();
    private currentBox: THREE.Box3 = new THREE.Box3();

    private debugHelper: THREE.Box3Helper | null = null;
    public static showWireframes: boolean = false;

    private playerGroup: THREE.Group = new THREE.Group();
    private cameraPivot: THREE.Group = new THREE.Group();
    private uiLabel!: WorldText;
    private mixer: THREE.AnimationMixer | null = null;
    private currentAction: THREE.AnimationAction | null = null;
    private actions: Map<string, THREE.AnimationAction> = new Map();
    private animations: THREE.AnimationClip[] = [];

    public events: PlayerEvents = new PlayerEvents();
    private isAnimationLocked: boolean = false;
    private currentActionName: string = "";
    private animationSequence: {
        name: string,
        targetTime: number,
        pauseDuration: number,
        pauseElapsed: number,
        speedAfter: number,
        nextAnimation?: string,
        onEventAt?: number,
        onEvent?: () => void,
        eventDone?: boolean,
        state: 'playing_to_target' | 'paused' | 'finishing'
    } | null = null;

    public isFreeCam: boolean = false;
    private freeRotX: number = 0;
    private freeRotY: number = 0;
    private backup_speed: number = 10;
    public speed: number = 10;
    public jump_force: number = 10;
    public hasController: boolean = false;
    public health: number = 100;
    public maxHealth: number = 100;
    public isSprinting: boolean = false;
    public isDead: boolean = false;
    public input_direction = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jumpRequested: false,
        shooting: false,
        joystickX: 0,
        joystickY: 0
    };
    public velocityY: number = 0;
    public isGrounded: boolean = true;
    private isMoving: boolean = false;
    private isJumping: boolean = false;
    private lastRemoteJumping: boolean = false;
    private rotY: number = 0;
    private rotX: number = 0;
    private targetPosition = new THREE.Vector3();
    private targetRotation = new THREE.Euler();
    private targetQuaternion = new THREE.Quaternion();
    private lerpSpeed: number = 20;
    private lastEmittedPosition = new THREE.Vector3();
    private lastEmittedRotationY: number = 0;
    private lastEmitTime: number = 0;
    private lastSentIsMoving: boolean = false;
    private lastSentIsSprinting: boolean = false;
    private lastSentIsJumping: boolean = false;
    private readonly emitInterval: number = 15;
    private shootCooldownMs: number = 300;
    private lastShootTime: number = 0;
    private cameraDistance: number = 100;
    private targetCameraDistance: number = 100;
    private readonly minCameraDistance: number = 30;
    private readonly maxCameraDistance: number = 300;
    private readonly zoomSpeed: number = 0.2;
    private readonly zoomLerp: number = 10;

    constructor(render: Render3JS, props: PlayerProps) {
        this.render = render;
        this.id = props.id;
        this.username = props.username;
        this.backup_speed = props.speed ?? 80;
        this.speed = props.speed ?? 80;
        this.jump_force = props.jump_force ?? 10;
        this.hasController = props.hasController;
        this.maxHealth = props.maxHealth || 100;
        this.health = props.health || 100;
        this.shootCooldownMs = props.shootCooldownMs ?? 300;

        this.playerGroup = new THREE.Group();
        this.cameraPivot = new THREE.Group();

        if (props.position) {
            this.playerGroup.position.set(props.position.x, props.position.y, props.position.z);
            this.targetPosition.copy(this.playerGroup.position);
        }

        if (props.rotation) {
            this.playerGroup.rotation.set(props.rotation.x, props.rotation.y, props.rotation.z);
            this.targetRotation.set(props.rotation.x, props.rotation.y, props.rotation.z);
            this.targetQuaternion.setFromEuler(this.targetRotation);
            this.rotY = props.rotation.y;
        }

        this.loadPlayerCharacterModel(LoaderAssets.TEMPLATES.CHARACTERS["Mage"])

        this.uiLabel = new WorldText(this.username);
        this.uiLabel.sprite.position.y = this.colliderSize.y + 10;
        this.playerGroup.add(this.uiLabel.sprite);

        if (this.hasController) {
            this.playerGroup.add(this.cameraPivot);
            this.cameraPivot.add(this.render.camera);

            this.cameraPivot.position.y = 25;

            this.render.camera.position.set(0, 0, this.cameraDistance);
            this.render.camera.lookAt(0, 0, 0);
            this.initEvents();
        }

        this.render.scene.add(this.playerGroup);
        this.updateWireframe();
    }

    public loadPlayerCharacterModel(template: TemplatePayload) {
        this.meshName = template.name;
        this.mesh = template.model;
        this.mesh.rotation.y = Math.PI;
        this.mesh.position.set(0, 0, 0);
        this.mesh.scale.set(10, 10, 10);

        const boneHandSlotRight = this.mesh.getObjectByName("handslotr");
        const position = boneHandSlotRight?.position.clone();
        if (boneHandSlotRight && position) {
            const { model, animations } = LoaderAssets.cloneTemplate(LoaderAssets.TEMPLATES.WEAPONS["Staff"]);
            model.position.copy(position);
            boneHandSlotRight.add(model)
        }

        this.mixer = new THREE.AnimationMixer(this.mesh);
        template.animations.forEach(clip => {
            const name = clip.name.toLowerCase();
            const action = this.mixer!.clipAction(clip);
            action.clampWhenFinished = true;
            this.actions.set(name, action);
        });

        this.buildCollider();
        this.playerGroup.add(this.mesh);
        this.animations = template.animations;

        this.events.emitChangeCharacter(this);
    }

    public playAnimation(name: string, options: {
        speed?: number,
        fadeTime?: number,
        loop?: THREE.AnimationActionLoopStyles,
        repetitions?: number,
        force?: boolean,
        atPercent?: number
    } = {}) {
        const next = this.actions.get(name.toLowerCase());
        if (!next || (next === this.currentAction && !options.force)) return;
        if (this.isAnimationLocked && !options.force) return;

        const fadeTime = options.fadeTime ?? 0.2;

        if (this.currentAction) {
            this.currentAction.fadeOut(fadeTime);
        }

        next.reset();
        next.setEffectiveWeight(1);
        next.setEffectiveTimeScale(options.speed ?? 1);

        if (options.loop !== undefined) {
            next.setLoop(options.loop, options.repetitions ?? Infinity);
        }

        if (options.atPercent !== undefined) {
            next.time = next.getClip().duration * options.atPercent;
        }

        next.fadeIn(fadeTime).play();
        this.currentAction = next;
        this.currentActionName = name.toLowerCase();
    }

    public playAnimationSequence(name: string, sequence: {
        atPercent: number,
        pauseFor: number,
        speedBefore?: number,
        speedAfter?: number,
        nextAnimation?: string,
        onEventAt?: number,
        onEvent?: () => void
    }) {
        const next = this.actions.get(name.toLowerCase());
        if (!next) return;

        this.isAnimationLocked = true;
        const duration = next.getClip().duration;

        this.animationSequence = {
            name: name.toLowerCase(),
            targetTime: duration * sequence.atPercent,
            pauseDuration: sequence.pauseFor,
            pauseElapsed: 0,
            speedAfter: sequence.speedAfter ?? 1,
            nextAnimation: sequence.nextAnimation,
            onEventAt: sequence.onEventAt,
            onEvent: sequence.onEvent,
            eventDone: false,
            state: 'playing_to_target'
        };

        this.playAnimation(name, {
            speed: sequence.speedBefore ?? 1,
            loop: THREE.LoopOnce,
            force: true
        });
    }

    private updateAnimationSequence(delta: number) {
        if (!this.animationSequence || !this.currentAction) return;

        const seq = this.animationSequence;

        if (seq.onEvent && !seq.eventDone && seq.onEventAt !== undefined) {
            const currentPercent = this.currentAction.time / this.currentAction.getClip().duration;
            if (currentPercent >= seq.onEventAt) {
                seq.onEvent();
                seq.eventDone = true;
            }
        }

        if (seq.state === 'playing_to_target') {
            if (this.currentAction.time >= seq.targetTime) {
                this.currentAction.paused = true;
                this.currentAction.time = seq.targetTime;
                seq.state = 'paused';
            }
        } else if (seq.state === 'paused') {
            seq.pauseElapsed += delta * 1000;
            if (seq.pauseElapsed >= seq.pauseDuration) {
                this.currentAction.paused = false;
                this.currentAction.setEffectiveTimeScale(seq.speedAfter);
                seq.state = 'finishing';
            }
        } else if (seq.state === 'finishing') {
            const clip = this.currentAction.getClip();
            if (this.currentAction.time >= clip.duration - 0.05) {
                const nextAnim = seq.nextAnimation;
                this.isAnimationLocked = false;
                this.animationSequence = null;

                if (nextAnim) {
                    this.playAnimation(nextAnim, { loop: THREE.LoopRepeat });
                    this.isAnimationLocked = true;
                }
            }
        }
    }

    private buildCollider() {
        this.mesh.updateMatrixWorld(true);
        const box3 = new THREE.Box3().setFromObject(this.mesh);

        const center = box3.getCenter(new THREE.Vector3());
        const size = box3.getSize(new THREE.Vector3());

        this.colliderSize.set(size.x * 0.6, size.y * 0.95, size.z * 0.6);
        this.colliderOffset.copy(center);
    }

    private updateWireframe() {
        if (Player.showWireframes) {
            if (!this.debugHelper) {
                this.debugHelper = new THREE.Box3Helper(this.currentBox, 0x00ff00);
                this.render.scene.add(this.debugHelper);
            }
            this.debugHelper.visible = !this.isDead;
        } else if (this.debugHelper) {
            this.debugHelper.visible = false;
        }
    }

    public getCollider() {
        const pos = this.playerGroup.position;
        const center = new THREE.Vector3(
            pos.x + this.colliderOffset.x,
            pos.y + this.colliderOffset.y,
            pos.z + this.colliderOffset.z
        );

        this.currentBox.setFromCenterAndSize(center, this.colliderSize);

        return {
            center: { x: center.x, y: center.y, z: center.z },
            size: { x: this.colliderSize.x, y: this.colliderSize.y, z: this.colliderSize.z }
        };
    }

    public getAnimations() {
        return this.animations;
    }

    public takeDamage(amount: number) {
        if (this.isDead) return;
        this.health = Math.max(0, this.health - amount);
        this.events.emitHealth({
            health: this.health,
            maxHealth: this.maxHealth,
            percentage: (this.health / this.maxHealth) * 100
        });
        if (this.health <= 0) this.die();
    }

    private die() {
        this.isDead = true;
        this.input_direction.forward = false;
        this.input_direction.backward = false;
        this.input_direction.left = false;
        this.input_direction.right = false;
        this.input_direction.jumpRequested = false;
        this.input_direction.shooting = false;
        this.input_direction.joystickX = 0;
        this.input_direction.joystickY = 0;

        this.mesh.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                if (mesh.material instanceof THREE.MeshStandardMaterial) {
                    mesh.material.color.set(0xff0000);
                }
            }
        });

        this.playAnimationSequence("Death_A", {
            atPercent: 1.0,
            pauseFor: 0,
            nextAnimation: "Death_A_Pose"
        });

        if (this.debugHelper) this.debugHelper.visible = false;
        this.events.emitDeath();
    }

    public setPosition(x: number, y: number, z: number) {
        if (this.hasController) {
            this.playerGroup.position.set(x, y, z);
            this.checkAndEmitMove();
        } else {
            this.targetPosition.set(x, y, z);
        }
    }

    public setVelocityY(vy: number) {
        if (!this.hasController) {
            this.velocityY = vy;
        }
    }

    public setIsMoving(isMoving: boolean) {
        if (!this.hasController) {
            this.isMoving = isMoving;
        }
    }

    public setIsJumping(isJumping: boolean) {
        if (!this.hasController) {
            if (isJumping && !this.lastRemoteJumping && this.isGrounded) {
                this.jump();
            }
            this.isJumping = isJumping;
            this.lastRemoteJumping = isJumping;
        }
    }

    public setRotation(x: number, y: number, z: number) {
        if (this.hasController) {
            this.playerGroup.rotation.set(x, y, z);
            this.checkAndEmitMove();
        } else {
            this.targetRotation.set(x, y, z);
            this.targetQuaternion.setFromEuler(this.targetRotation);
        }
    }

    public setHealth(health: number, callback?: (health: number) => void): void {
        this.health = health;

        if (this.health <= 0 && !this.isDead) {
            this.die();
        } else if (this.health > 0 && this.isDead) {
            this.isDead = false;
            this.mesh.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    if (mesh.material instanceof THREE.MeshStandardMaterial) {
                        mesh.material.color.set(0xffffff);
                    }
                }
            });

            this.playAnimationSequence("Spawn_Air", {
                atPercent: 1.0,
                pauseFor: 0,
                speedBefore: 1.0,
                speedAfter: 1.0
            });

            if (this.debugHelper) this.debugHelper.visible = Player.showWireframes;
        }

        if (callback) callback(this.health);
    }

    public getStats(): PlayerStats {
        return {
            id: this.id,
            username: this.username,
            meshName: this.meshName,
            position: { x: this.playerGroup.position.x, y: this.playerGroup.position.y, z: this.playerGroup.position.z },
            rotation: { x: this.playerGroup.rotation.x, y: this.playerGroup.rotation.y, z: this.playerGroup.rotation.z },
            health: this.health,
            maxHealth: this.maxHealth,
            speed: this.speed
        };
    }

    public updateRotation(deltaX: number, deltaY: number) {
        const sensitivity = 0.002;

        if (this.isFreeCam) {
            this.freeRotY -= deltaX * sensitivity;
            this.freeRotX -= deltaY * sensitivity;
            const maxPitch = Math.PI / 2 - 0.01;
            this.freeRotX = Math.max(-maxPitch, Math.min(maxPitch, this.freeRotX));
            this.render.camera.rotation.set(this.freeRotX, this.freeRotY, 0, 'YXZ');
            return;
        }

        this.rotY -= deltaX * sensitivity;
        this.rotX -= deltaY * sensitivity;

        const TWO_PI = Math.PI * 2;
        this.rotY = ((this.rotY % TWO_PI) + TWO_PI) % TWO_PI;

        const maxPitch = Math.PI / 2 - 0.01;
        this.rotX = Math.max(-maxPitch, Math.min(maxPitch, this.rotX));
    }

    private onKeyDown = (e: KeyboardEvent) => {
        if (this.isDead) return;
        const key = e.key.toLowerCase();

        if (key === "tab") {
            e.preventDefault();
            this.toggleFreeCam();
            return;
        }

        if (key === "w") this.input_direction.forward = true;
        if (key === "s") this.input_direction.backward = true;
        if (key === "a") this.input_direction.left = true;
        if (key === "d") this.input_direction.right = true;
        if (key === " " && !this.input_direction.jumpRequested) this.input_direction.jumpRequested = true;
        if (key === "f") this.input_direction.shooting = true;
        if (key === "shift") this.run();

        if (key === "c") this.changeCharacter(LoaderAssets.TEMPLATES.CHARACTERS["Rogue_Hooded"]);
    };

    private onKeyUp = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (key === "w") this.input_direction.forward = false;
        if (key === "s") this.input_direction.backward = false;
        if (key === "a") this.input_direction.left = false;
        if (key === "d") this.input_direction.right = false;
        if (key === "f") this.input_direction.shooting = false;
        if (key === "shift") this.noRun();
    };

    private onMouseMove = (e: MouseEvent) => {
        if (document.pointerLockElement !== this.render.renderer.domElement) return;
        this.updateRotation(e.movementX, e.movementY);
    };

    private onMouseDown = (e: MouseEvent) => {
        if (e.target !== this.render.renderer.domElement) return;
        if (this.isDead) return;

        if (document.pointerLockElement !== this.render.renderer.domElement) {
            this.render.renderer.domElement.requestPointerLock();
            return;
        }

        if (e.button === 0) this.input_direction.shooting = true;
    };

    private onMouseUp = (e: MouseEvent) => {
        if (e.button === 0) this.input_direction.shooting = false;
    };

    private onWheel = (e: WheelEvent) => {
        if (e.target !== this.render.renderer.domElement) return;
        this.targetCameraDistance += e.deltaY * this.zoomSpeed;
        this.targetCameraDistance = Math.max(this.minCameraDistance, Math.min(this.maxCameraDistance, this.targetCameraDistance));
    };

    private initEvents() {
        window.addEventListener("keydown", this.onKeyDown);
        window.addEventListener("keyup", this.onKeyUp);
        window.addEventListener("mousemove", this.onMouseMove);
        window.addEventListener("mousedown", this.onMouseDown);
        window.addEventListener("mouseup", this.onMouseUp);
        window.addEventListener("wheel", this.onWheel);
    }

    public changeCharacter(template_character: TemplatePayload) {
        if (!template_character) throw new Error("Template character is not defined");
        const template_character_cloned = LoaderAssets.cloneTemplate(template_character);

        this.mesh.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.geometry.dispose();
                if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
                else mesh.material.dispose();
            }
        })

        this.playerGroup.remove(this.mesh);
        this.loadPlayerCharacterModel(template_character_cloned);
    }

    public jump() {
        if (this.isDead || !this.isGrounded) return;
        this.input_direction.jumpRequested = true;

        if (!this.hasController) {
            this.velocityY = this.jump_force;
            this.isGrounded = false;
        }
    }

    public move() {
        if (this.isDead) return;
        this.isMoving = true;
    }

    public noMove() {
        if (this.isDead) return;
        this.isMoving = false;
    }

    public run() {
        if (this.isDead) return;
        this.isSprinting = true;
    }

    public noRun() {
        if (this.isDead) return;
        this.isSprinting = false;
    }

    public shoot() {
        if (this.isDead || this.isAnimationLocked) return;
        if (document.pointerLockElement !== this.render.renderer.domElement) return;

        const now = performance.now();
        if (now - this.lastShootTime < this.shootCooldownMs) return;
        this.lastShootTime = now;

        this.render.socket.emit("player:animate", {
            id: this.id,
            animation: "Throw",
            atPercent: 1.0,
            pauseFor: 0,
            speedBefore: 1.5,
            speedAfter: 1.0
        });

        this.playAnimationSequence("Throw", {
            atPercent: 1.0,
            pauseFor: 0,
            speedBefore: 1.5,
            speedAfter: 1.0,
            onEventAt: 0.5,
            onEvent: () => this.performShootAction()
        });
    }

    private performShootAction() {
        const radius = 3;
        const plr_pos = this.playerGroup.position.clone();
        const yaw = this.playerGroup.rotation.y;
        const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        const spawnPos = plr_pos.clone().add(forward.multiplyScalar(20));
        spawnPos.y += 10;

        const projectile = this.render.room.createProjectile({
            id: uuidv4(),
            ownerId: this.id,
            position: { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z },
            rotation: { x: 0, y: yaw, z: 0 },
            speed: 300,
            damage: 10,
            radius
        });

        projectile.onDeath((data) => {
            this.render.socket.emit("projectile:death", data);
        });

        projectile.onHit((data) => {
            this.render.socket.emit("projectile:hit", data);
        });
    }

    public getPosition() { return this.playerGroup.position; }

    public join() {
        if (!this.render.players.find(p => p.id === this.id)) {
            this.render.players.push(this);
        }
    }

    public leave() {
        this.render.players = this.render.players.filter(p => p.id !== this.id);
        this.render.scene.remove(this.playerGroup);
        if (this.debugHelper) {
            this.render.scene.remove(this.debugHelper);
            this.debugHelper = null;
        }
        if (this.hasController) {
            this.cameraPivot.remove(this.render.camera);
            window.removeEventListener("keydown", this.onKeyDown);
            window.removeEventListener("keyup", this.onKeyUp);
            window.removeEventListener("mousemove", this.onMouseMove);
            window.removeEventListener("mousedown", this.onMouseDown);
            window.removeEventListener("mouseup", this.onMouseUp);
            window.removeEventListener("wheel", this.onWheel);
        }
    }

    private toggleFreeCam() {
        this.isFreeCam = !this.isFreeCam;
        if (this.isFreeCam) {
            this.freeRotX = this.rotX;
            this.freeRotY = this.rotY;
            this.render.scene.attach(this.render.camera);
        } else {
            this.cameraPivot.add(this.render.camera);
            this.render.camera.position.set(0, 0, this.cameraDistance);
            this.render.camera.rotation.set(0, 0, 0);
            this.render.camera.quaternion.set(0, 0, 0, 1);
        }
    }

    private updateFreeCam(delta: number) {
        const moveSpeed = (this.isSprinting ? 40 : 200) * delta;
        const dir = new THREE.Vector3();
        if (this.input_direction.forward) dir.z -= 1;
        if (this.input_direction.backward) dir.z += 1;
        if (this.input_direction.left) dir.x -= 1;
        if (this.input_direction.right) dir.x += 1;

        dir.normalize().multiplyScalar(moveSpeed);
        dir.applyQuaternion(this.render.camera.quaternion);
        this.render.camera.position.add(dir);
    }

    public destroy() {
        this.leave();
        this.events.clear();
        this.uiLabel.destroy();
    }

    public update(delta: number) {
        const controlled = this.render.players.find(p => p.hasController);
        const globalFreeCam = !!controlled?.isFreeCam;

        if (this.isFreeCam) {
            this.updateFreeCam(delta);
        }

        this.updateAnimationSequence(delta);
        this.mixer?.update(delta);
        this.uiLabel.updateUI(this.username, (this.health / this.maxHealth) * 100);

        if (globalFreeCam) {
            if (this.currentActionName !== "t-pose") {
                this.playAnimation("T-Pose", { force: true });
            }
            return;
        }

        if (this.currentActionName === "t-pose" && !globalFreeCam) {
            this.isAnimationLocked = false;
            this.animationSequence = null;
            this.playAnimation("Idle_A", { force: true });
        }

        if (this.isSprinting) this.speed = this.backup_speed * 1.5;
        else this.speed = this.backup_speed;

        const isMovingState = this.hasController ? (
            this.input_direction.forward || this.input_direction.backward ||
            this.input_direction.left || this.input_direction.right ||
            this.input_direction.joystickX !== 0 || this.input_direction.joystickY !== 0
        ) : this.isMoving;

        const isJumpingState = this.hasController ? (
            !this.isGrounded || this.input_direction.jumpRequested
        ) : (
            !this.isGrounded || this.isJumping
        );

        if (this.isDead) {
            if (!this.isAnimationLocked && this.currentActionName !== "death_a_pose") {
                this.playAnimation("Death_A_Pose", { loop: THREE.LoopRepeat });
                this.isAnimationLocked = true;
            }
            return;
        }

        if (this.hasController && this.input_direction.jumpRequested && this.isGrounded) {
            this.playAnimation("Jump_Start");
        } else if (isJumpingState) {
            this.playAnimation("Jump_Idle");
        } else if (isMovingState && this.isGrounded) {
            if (this.isSprinting) this.playAnimation("Running_A");
            else this.playAnimation("Walking_B");
        } else {
            this.playAnimation("Idle_A");
            if (!this.hasController) {
                this.input_direction.jumpRequested = false;
            }
        }

        this.getCollider();
        this.updateWireframe();

        if (this.hasController) {
            const zoomStep = Math.min(1, this.zoomLerp * delta);
            this.cameraDistance = THREE.MathUtils.lerp(this.cameraDistance, this.targetCameraDistance, zoomStep);
            this.render.camera.position.z = this.cameraDistance;
            if (this.input_direction.shooting) this.shoot();
            this.playerGroup.rotation.y = this.rotY;
            this.cameraPivot.rotation.x = this.rotX;

            let moveX = (this.input_direction.right ? 1 : 0) - (this.input_direction.left ? 1 : 0);
            let moveZ = (this.input_direction.backward ? 1 : 0) - (this.input_direction.forward ? 1 : 0);

            if (this.input_direction.joystickX !== 0 || this.input_direction.joystickY !== 0) {
                moveX = this.input_direction.joystickX;
                moveZ = -this.input_direction.joystickY;
            }

            const direction = new THREE.Vector3(moveX, 0, moveZ);
            if (direction.lengthSq() > 1) direction.normalize();

            direction.applyEuler(new THREE.Euler(0, this.playerGroup.rotation.y, 0));
            direction.multiplyScalar(this.speed * delta);

            this.playerGroup.position.add(direction);

            this.mesh.position.set(0, 0, 0);

            this.checkAndEmitMove();
        } else {
            const lerpStep = Math.min(1, this.lerpSpeed * delta);
            this.playerGroup.position.lerp(this.targetPosition, lerpStep);
            this.playerGroup.quaternion.slerp(this.targetQuaternion, lerpStep);

            if (!this.isGrounded) {
                this.velocityY -= this.render.gravity * delta;
                this.playerGroup.position.y += this.velocityY * delta;
                if (this.playerGroup.position.y <= this.targetPosition.y) {
                    this.playerGroup.position.y = this.targetPosition.y;
                    this.velocityY = 0;
                    this.isGrounded = true;
                }
            }
        }
    }

    private checkAndEmitMove() {
        if (!this.hasController) return;
        const now = performance.now();
        if (now - this.lastEmitTime < this.emitInterval) return;

        const pos = this.playerGroup.position;
        const dist = pos.distanceTo(this.lastEmittedPosition);
        const rotDist = Math.abs(this.playerGroup.rotation.y - this.lastEmittedRotationY);
        const isAirborne = !this.isGrounded || Math.abs(this.velocityY) > 0.1;

        const isMoving = this.input_direction.forward || this.input_direction.backward ||
            this.input_direction.left || this.input_direction.right ||
            this.input_direction.joystickX !== 0 || this.input_direction.joystickY !== 0;

        const isSprinting = this.isSprinting;
        const isJumping = isAirborne;

        if (dist > 0.01 || rotDist > 0.01 || isMoving !== this.lastSentIsMoving || isSprinting !== this.lastSentIsSprinting || isJumping !== this.lastSentIsJumping) {
            this.events.emitMove({
                position: { x: pos.x, y: pos.y, z: pos.z },
                rotation: { x: 0, y: this.playerGroup.rotation.y, z: 0 },
                isMoving,
                isSprinting,
                isJumping
            });

            this.lastEmittedPosition.copy(pos);
            this.lastEmittedRotationY = this.playerGroup.rotation.y;
            this.lastSentIsMoving = isMoving;
            this.lastSentIsSprinting = isSprinting;
            this.lastSentIsJumping = isJumping;
            this.lastEmitTime = now;
        }
    }
}
