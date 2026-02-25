import * as THREE from "three";
import { GLTFLoader, OBJLoader } from "three/examples/jsm/Addons.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

export type TypeLoad = "gltf" | "obj"
export interface TemplatePayload {
    model: THREE.Group;
    animations: THREE.AnimationClip[];
}

export class LoaderAssets {
    private static obj_loader: OBJLoader = new OBJLoader();
    private static gltf_loader: GLTFLoader = new GLTFLoader();

    public static KNIGHT_TEMPLATE: TemplatePayload | null = null;
    public static BARBARIAN_TEMPLATE: TemplatePayload | null = null;
    public static MAGE_TEMPLATE: TemplatePayload | null = null;
    public static RANGER_TEMPLATE: TemplatePayload | null = null;
    public static ROGUE_HOODED_TEMPLATE: TemplatePayload | null = null;
    public static ROGUE_TEMPLATE: TemplatePayload | null = null;

    public static STAFF_TEMPLATE: TemplatePayload | null = null;

    public static CRATE_LONG_B_TEMPLATE: TemplatePayload | null = null;

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

            LoaderAssets.KNIGHT_TEMPLATE = KNIGHT;
            LoaderAssets.BARBARIAN_TEMPLATE = BARBARIAN;
            LoaderAssets.MAGE_TEMPLATE = MAGE;
            LoaderAssets.RANGER_TEMPLATE = RANGER;
            LoaderAssets.ROGUE_TEMPLATE = ROGUE;
            LoaderAssets.ROGUE_HOODED_TEMPLATE = ROGUE_HOODED;
            LoaderAssets.STAFF_TEMPLATE = STAFF;
            LoaderAssets.CRATE_LONG_B_TEMPLATE = CRATE_LONG_B;
        } catch (error) {
            console.error("Error preloading assets:", error);
        }
    }

    public static getPlayerByName(name: string): { name: string, data: TemplatePayload } {
        const templates = [
            { name: "Knight", model: LoaderAssets.KNIGHT_TEMPLATE },
            { name: "Barbarian", model: LoaderAssets.BARBARIAN_TEMPLATE },
            { name: "Mage", model: LoaderAssets.MAGE_TEMPLATE },
            { name: "Ranger", model: LoaderAssets.RANGER_TEMPLATE },
            { name: "Rogue", model: LoaderAssets.ROGUE_TEMPLATE },
            { name: "Rogue Hooded", model: LoaderAssets.ROGUE_HOODED_TEMPLATE }
        ];

        const template = templates.find(t => t.name === name);
        if (!template) return { name: "Unknown", data: { model: new THREE.Group(), animations: [] } };

        return { name: template.name, data: this.cloneTemplate(template.model!) };
    }

    public static randomPlayer(): { name: string, data: TemplatePayload } {
        const templates = [
            { name: "Knight", model: LoaderAssets.KNIGHT_TEMPLATE },
            { name: "Barbarian", model: LoaderAssets.BARBARIAN_TEMPLATE },
            { name: "Mage", model: LoaderAssets.MAGE_TEMPLATE },
            { name: "Ranger", model: LoaderAssets.RANGER_TEMPLATE },
            { name: "Rogue", model: LoaderAssets.ROGUE_TEMPLATE },
            { name: "Rogue Hooded", model: LoaderAssets.ROGUE_HOODED_TEMPLATE }
        ];

        const template = templates[Math.floor(Math.random() * templates.length)];
        if (!template) return { name: "Unknown", data: { model: new THREE.Group(), animations: [] } };

        return { name: template.name, data: this.cloneTemplate(template.model!) };
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
            model: clone,
            animations: template.animations
        };
    }

    public static async load(source: string, type: TypeLoad): Promise<TemplatePayload> {
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

    private static loadGLTF(source: string): Promise<TemplatePayload> {
        return new Promise((resolve, reject) => {
            LoaderAssets.gltf_loader.load(source, (gltf) => {
                const model = gltf.scene;
                console.log(source.split("/").pop(), gltf.animations)
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

    private static loadObj(source: string): Promise<TemplatePayload> {
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