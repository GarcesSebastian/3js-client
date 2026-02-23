import * as THREE from "three";
import { GLTFLoader, OBJLoader } from "three/examples/jsm/Addons.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

export type TypeLoad = "gltf" | "obj"

export class LoaderAssets {
    private static obj_loader: OBJLoader = new OBJLoader();
    private static gltf_loader: GLTFLoader = new GLTFLoader();

    public static KNIGHT_TEMPLATE: THREE.Group | null = null;
    public static BARBARIAN_TEMPLATE: THREE.Group | null = null;
    public static MAGE_TEMPLATE: THREE.Group | null = null;
    public static RANGER_TEMPLATE: THREE.Group | null = null;
    public static ROGUE_HOODED_TEMPLATE: THREE.Group | null = null;

    public static async preload(): Promise<void> {
        try {
            const [KNIGHT, BARBARIAN, MAGE, RANGER, ROGUE_HOODED] = await Promise.all([
                LoaderAssets.load("/assets/characters/Knight.glb", "gltf"),
                LoaderAssets.load("/assets/characters/Barbarian.glb", "gltf"),
                LoaderAssets.load("/assets/characters/Mage.glb", "gltf"),
                LoaderAssets.load("/assets/characters/Ranger.glb", "gltf"),
                LoaderAssets.load("/assets/characters/Rogue_Hooded.glb", "gltf")
            ]);

            LoaderAssets.KNIGHT_TEMPLATE = KNIGHT;
            LoaderAssets.BARBARIAN_TEMPLATE = BARBARIAN;
            LoaderAssets.MAGE_TEMPLATE = MAGE;
            LoaderAssets.RANGER_TEMPLATE = RANGER;
            LoaderAssets.ROGUE_HOODED_TEMPLATE = ROGUE_HOODED;
        } catch (error) {
            console.error("Error preloading assets:", error);
        }
    }

    public static getPlayerByName(name: string): { name: string, model: THREE.Group } {
        const templates = [
            { name: "Knight", model: LoaderAssets.KNIGHT_TEMPLATE },
            { name: "Barbarian", model: LoaderAssets.BARBARIAN_TEMPLATE },
            { name: "Mage", model: LoaderAssets.MAGE_TEMPLATE },
            { name: "Ranger", model: LoaderAssets.RANGER_TEMPLATE },
            { name: "Rogue Hooded", model: LoaderAssets.ROGUE_HOODED_TEMPLATE }
        ];

        const template = templates.find(t => t.name === name);
        if (!template) return { name: "Unknown", model: new THREE.Group() };

        return { name: template.name, model: this.cloneTemplate(template.model!) };
    }

    public static randomPlayer(): { name: string, model: THREE.Group } {
        const templates = [
            { name: "Knight", model: LoaderAssets.KNIGHT_TEMPLATE },
            { name: "Barbarian", model: LoaderAssets.BARBARIAN_TEMPLATE },
            { name: "Mage", model: LoaderAssets.MAGE_TEMPLATE },
            { name: "Ranger", model: LoaderAssets.RANGER_TEMPLATE },
            { name: "Rogue Hooded", model: LoaderAssets.ROGUE_HOODED_TEMPLATE }
        ];

        const template = templates[Math.floor(Math.random() * templates.length)];
        if (!template) return { name: "Unknown", model: new THREE.Group() };

        return { name: template.name, model: this.cloneTemplate(template.model!) };
    }

    public static cloneTemplate(template: THREE.Group): THREE.Group {
        const clone = SkeletonUtils.clone(template) as THREE.Group;

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

        return clone;
    }

    public static async load(source: string, type: TypeLoad): Promise<THREE.Group> {
        if (type == "gltf") {
            return await this.loadGLTF(source);
        }

        if (type == "obj") {
            return await this.loadObj(source);
        }

        return new THREE.Group();
    }

    private static loadGLTF(source: string): Promise<THREE.Group> {
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

                resolve(model);
            }, undefined, (error) => reject(error));
        });
    }

    private static loadObj(source: string): Promise<THREE.Group> {
        return new Promise((resolve, reject) => {
            LoaderAssets.obj_loader.load(source, (object) => {
                object.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        const mesh = child as THREE.Mesh;
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                    }
                });
                resolve(object as unknown as THREE.Group);
            }, undefined, (error) => reject(error));
        });
    }
}