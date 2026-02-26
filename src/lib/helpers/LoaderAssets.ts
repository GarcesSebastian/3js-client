import * as THREE from "three";
import { GLTFLoader, OBJLoader } from "three/examples/jsm/Addons.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

export type TypeLoad = "gltf" | "obj"

export type TemplateCharacters = "Barbarian" | "Knight" | "Mage" | "Ranger" | "Rogue" | "Rogue_Hooded";
export type TemplateWeapons = "Staff";
export type TemplateDecorations = "Crate_Long_B";

export interface TemplatePayload {
    name: string;
    model: THREE.Group;
    animations: THREE.AnimationClip[];
}

export class LoaderAssets {
    private static obj_loader: OBJLoader = new OBJLoader();
    private static gltf_loader: GLTFLoader = new GLTFLoader();

    public static TEMPLATES: {
        CHARACTERS: Record<TemplateCharacters, TemplatePayload>,
        WEAPONS: Record<TemplateWeapons, TemplatePayload>,
        DECORATIONS: Record<TemplateDecorations, TemplatePayload>
    } = {
            CHARACTERS: {} as Record<TemplateCharacters, TemplatePayload>,
            WEAPONS: {} as Record<TemplateWeapons, TemplatePayload>,
            DECORATIONS: {} as Record<TemplateDecorations, TemplatePayload>
        };

    public static async preload(): Promise<void> {
        try {
            const [
                KNIGHT,
                BARBARIAN,
                MAGE,
                RANGER,
                ROGUE,
                ROGUE_HOODED,
                STAFF,
                CRATE_LONG_B
            ] = await Promise.all([
                LoaderAssets.load("/assets/characters/Knight.glb", "gltf"),
                LoaderAssets.load("/assets/characters/Barbarian.glb", "gltf"),
                LoaderAssets.load("/assets/characters/Mage.glb", "gltf"),
                LoaderAssets.load("/assets/characters/Ranger.glb", "gltf"),
                LoaderAssets.load("/assets/characters/Rogue.glb", "gltf"),
                LoaderAssets.load("/assets/characters/Rogue_Hooded.glb", "gltf"),
                LoaderAssets.load("/assets/weapons/Staff.glb", "gltf"),
                LoaderAssets.load("/assets/decoration/Crate_Long_B.glb", "gltf")
            ]);

            LoaderAssets.TEMPLATES = {
                CHARACTERS: {
                    "Knight": { name: "Knight", model: KNIGHT.model, animations: KNIGHT.animations },
                    "Barbarian": { name: "Barbarian", model: BARBARIAN.model, animations: BARBARIAN.animations },
                    "Mage": { name: "Mage", model: MAGE.model, animations: MAGE.animations },
                    "Ranger": { name: "Ranger", model: RANGER.model, animations: RANGER.animations },
                    "Rogue": { name: "Rogue", model: ROGUE.model, animations: ROGUE.animations },
                    "Rogue_Hooded": { name: "Rogue Hooded", model: ROGUE_HOODED.model, animations: ROGUE_HOODED.animations },
                },
                WEAPONS: {
                    "Staff": { name: "Staff", model: STAFF.model, animations: STAFF.animations },
                },
                DECORATIONS: {
                    "Crate_Long_B": { name: "Crate Long B", model: CRATE_LONG_B.model, animations: CRATE_LONG_B.animations }
                }
            };
        } catch (error) {
            console.error("Error preloading assets:", error);
        }
    }

    public static getPlayerByName(name: TemplateCharacters): TemplatePayload {
        const template = LoaderAssets.TEMPLATES.CHARACTERS[name];
        if (!template) return { name: "Unknown", model: new THREE.Group(), animations: [] };

        return this.cloneTemplate(template);
    }

    public static randomCharacter(): TemplatePayload {
        const keys = Object.keys(LoaderAssets.TEMPLATES.CHARACTERS);
        const option = keys[Math.floor(Math.random() * keys.length)] as TemplateCharacters;
        const template = LoaderAssets.TEMPLATES.CHARACTERS[option];
        if (!template) return { name: "Unknown", model: new THREE.Group(), animations: [] };

        return template;
    }

    public static cloneTemplate(template: TemplatePayload): TemplatePayload {
        const clone = SkeletonUtils.clone(template.model) as THREE.Group;

        clone.traverse((node) => {
            if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                if (Array.isArray(mesh.material)) {
                    mesh.material = mesh.material.map(m => m.clone());
                } else if (mesh.material) {
                    mesh.material = mesh.material.clone();
                }
            }
        });

        return {
            name: template.name,
            model: clone,
            animations: template.animations
        };
    }

    public static async load(source: string, type: TypeLoad): Promise<Omit<TemplatePayload, "name">> {
        if (type == "gltf") {
            return await this.loadGLTF(source);
        }

        if (type == "obj") {
            return await this.loadObj(source);
        }

        return {
            model: new THREE.Group(),
            animations: []
        };
    }

    private static loadGLTF(source: string): Promise<Omit<TemplatePayload, "name">> {
        return new Promise((resolve, reject) => {
            LoaderAssets.gltf_loader.load(source, (gltf) => {
                const model = gltf.scene;
                model.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        const mesh = child as THREE.Mesh;
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;

                        if (mesh.material instanceof THREE.MeshStandardMaterial) {
                            mesh.material.side = THREE.FrontSide;
                            if (mesh.material.map) {
                                mesh.material.map.anisotropy = 4;
                                mesh.material.map.wrapS = THREE.RepeatWrapping;
                                mesh.material.map.wrapT = THREE.RepeatWrapping;
                            }
                            mesh.material.needsUpdate = true;
                        }
                    }
                });

                resolve({
                    model,
                    animations: gltf.animations
                });
            }, undefined, (error) => reject(error));
        });
    }

    private static loadObj(source: string): Promise<Omit<TemplatePayload, "name">> {
        return new Promise((resolve, reject) => {
            LoaderAssets.obj_loader.load(source, (object) => {
                object.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        const mesh = child as THREE.Mesh;
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                    }
                });

                resolve({
                    model: object as unknown as THREE.Group,
                    animations: []
                });
            }, undefined, (error) => reject(error));
        });
    }
}