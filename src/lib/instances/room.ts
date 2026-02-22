import * as THREE from "three";
import { Render3JS } from "../render";
import { type PlayerProps, Player } from "./player";
import { v4 as uuidv4 } from "uuid";

interface PlayerRoom extends PlayerProps {
    id: string
}

export class Room {
    private render: Render3JS;

    constructor(render: Render3JS) {
        this.render = render;
    }

    public createPlayer(options: PlayerRoom): Player {
        const player = new Player(this.render, {
            id: options.id || uuidv4(),
            name: options.name,
            speed: 120,
            jump_force: 150,
            hasController: options.hasController,
            position: options.position || new THREE.Vector3(0, 0, 0)
        });

        player.join();

        return player;
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