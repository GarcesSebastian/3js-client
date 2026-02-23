import * as THREE from "three";
import { Render3JS } from "../render";
import { type PlayerProps, Player } from "./player";
import { v4 as uuidv4 } from "uuid";
import { type ProjectileProps, Projectile } from "./projectile";

interface PlayerRoom extends PlayerProps {
    id: string
}

interface RoomProps {
    id: string;
    name: string;
    maxPlayers: number;
    players: PlayerRoom[];
    projectiles: Map<string, Projectile>;
}

export class Room {
    private render: Render3JS;

    constructor(render: Render3JS) {
        this.render = render;
    }

    public createPlayer(options: PlayerRoom): Player {
        const player = new Player(this.render, {
            id: options.id || uuidv4(),
            username: options.username,
            speed: options.speed || 120,
            jump_force: options.jump_force || 150,
            hasController: options.hasController,
            position: options.position || new THREE.Vector3(0, 0, 0),
            rotation: options.rotation || new THREE.Euler(0, 0, 0),
            health: options.health || 100,
            maxHealth: options.maxHealth || 100
        });

        player.join();

        return player;
    }

    public createProjectile(options: ProjectileProps, noEmit: boolean = false): Projectile {
        return new Projectile(options, this.render, noEmit);
    }

    public getProjectileById(id: string): Projectile | undefined {
        return this.render.projectiles.get(id);
    }

    public join(player: Player, callback?: (player: Player) => void) {
        player.join();

        if (callback) {
            callback(player);
        }
    }

    public leave(player: Player, callback?: (player: Player) => void) {
        player.leave();

        if (callback) {
            callback(player);
        }
    }

    public getPlayerById(id: string): Player | undefined {
        return this.render.players.find((player) => player.id === id);
    }

    public getPlayers(): Player[] {
        return this.render.players;
    }
}