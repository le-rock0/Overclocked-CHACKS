import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import {
  CustomModelEntry,
  CustomModelTransform,
  ModelSlotId,
  ModelSlotMetadata,
} from '../types/game';

export const DEFAULT_MODEL_TRANSFORM: CustomModelTransform = {
  scale: 1.0,
  rotation: [0, 0, 0],
  yOffset: 0,
  autoNormalize: true,
  overrideMaterial: false,
  tintColor: '#38bdf8',
  roughness: 0.35,
  metalness: 0.65,
  emissiveIntensity: 0.15,
  wireframe: false,
};

export const MODEL_SLOTS: ModelSlotMetadata[] = [
  // 0. Full 3D World Map / Environment
  {
    slotId: 'world_map',
    name: 'Full 3D World Map / Level',
    category: 'map',
    description: 'Import a complete 3D terrain, island, city ruins, or custom level (.glb/.gltf/.obj) with walkable surface collision.',
    canonicalSize: 120.0,
    groundPivot: true,
  },

  // 1. RGSHSC Cloner Machine Stages
  {
    slotId: 'cryo_stasis_pod',
    name: 'Tier 1: Cryo-Stasis Chamber',
    category: 'cloner',
    description: 'Deep cryogenic stabilization pod that locks human DNA at -18°C.',
    canonicalSize: 3.2,
    groundPivot: true,
  },
  {
    slotId: 'nutrient_bioreactor',
    name: 'Tier 2: Nutrient Bioreactor',
    category: 'cloner',
    description: 'Pressurized bio-synthesis vat cultivating maternal protein matrices.',
    canonicalSize: 3.4,
    groundPivot: true,
  },
  {
    slotId: 'gene_shifter_matrix',
    name: 'Tier 3: Gene Shifter Matrix',
    category: 'cloner',
    description: 'Quantum genomic ring array that purges radiation mutations.',
    canonicalSize: 3.8,
    groundPivot: true,
  },
  {
    slotId: 'rgshsc_core',
    name: 'Tier 4: RGSHSC Master Cloner',
    category: 'cloner',
    description: 'Complete Reproductive Gene Shifting Homo Sapien Cloner assembly.',
    canonicalSize: 5.2,
    groundPivot: true,
  },

  // 2. Buildable Structures & Base Props
  {
    slotId: 'foundation',
    name: 'Foundation Deck',
    category: 'structure',
    description: 'Modular 3x3m structural base deck with support pilings.',
    canonicalSize: 3.0,
    groundPivot: true,
  },
  {
    slotId: 'wall',
    name: 'Reinforced Wall',
    category: 'structure',
    description: 'Insulated 3m shelter bulkhead wall that snaps to Foundation Deck edges.',
    canonicalSize: 3.0,
    groundPivot: true,
  },
  {
    slotId: 'roof',
    name: 'Thermal Roof Slab',
    category: 'structure',
    description: 'Radiation-shielded 3x3m overhead shelter canopy.',
    canonicalSize: 3.0,
    groundPivot: true,
  },
  {
    slotId: 'solar_panel',
    name: 'Solar Generator',
    category: 'structure',
    description: 'Photovoltaic array on articulated tracking pedestal.',
    canonicalSize: 2.6,
    groundPivot: true,
  },
  {
    slotId: 'water_condenser',
    name: 'Atmospheric Water Condenser',
    category: 'structure',
    description: 'Moisture condenser tower with purified collection tank.',
    canonicalSize: 2.5,
    groundPivot: true,
  },
  {
    slotId: 'campfire',
    name: 'Thermal Campfire Rig',
    category: 'structure',
    description: 'Stone-ringed thermal beacon for warmth and DNA stabilization.',
    canonicalSize: 1.4,
    groundPivot: true,
  },

  // 3. Harvestable World Resources
  {
    slotId: 'wood',
    name: 'Mutated Tree (Wood Node)',
    category: 'resource',
    description: 'Bioluminescent wasteland flora harvested for structural timber.',
    canonicalSize: 5.2,
    groundPivot: true,
  },
  {
    slotId: 'quartzCrystal',
    name: 'Quartz Crystal Outcrop',
    category: 'resource',
    description: 'Refractive silicate monoliths harvested for optics and electronics.',
    canonicalSize: 2.4,
    groundPivot: true,
  },
  {
    slotId: 'scrapMetal',
    name: 'Ancient Scrap Wreckage',
    category: 'resource',
    description: 'Salvageable alloy hull debris and structural beams.',
    canonicalSize: 2.2,
    groundPivot: true,
  },
  {
    slotId: 'biomass',
    name: 'Biomass Flora Cluster',
    category: 'resource',
    description: 'Nutrient-rich spore pods harvested for biofuel and bioreactor medium.',
    canonicalSize: 1.5,
    groundPivot: true,
  },

  // 4. Player / Survivor Character Avatars & Handheld Rig
  {
    slotId: 'survivor_avatar',
    name: 'Survivor Character Avatar',
    category: 'avatar',
    description: 'Full-body environmental hazard suit worn by co-op survivors.',
    canonicalSize: 1.85,
    groundPivot: true,
  },
  {
    slotId: 'fp_tool',
    name: 'First-Person Harvester Pickaxe',
    category: 'avatar',
    description: 'Handheld heavy mining pickaxe and cryo-DNA vial rig attached to player camera.',
    canonicalSize: 0.72,
    groundPivot: false,
  },
];

export interface ParsedModelResult {
  rawGroup: THREE.Group;
  format: 'glb' | 'gltf' | 'obj';
  vertexCount: number;
  triangleCount: number;
  originalDimensions: [number, number, number];
}

interface StoredCustomModel {
  entry: CustomModelEntry;
  rawGroup: THREE.Group;
  configuredPrototype: THREE.Group;
}

class CustomModelRegistry {
  private gltfLoader: GLTFLoader;
  private objLoader: OBJLoader;
  private models = new Map<ModelSlotId, StoredCustomModel>();
  private listeners = new Set<() => void>();

  constructor() {
    this.gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    this.gltfLoader.setDRACOLoader(dracoLoader);
    this.objLoader = new OBJLoader();
  }

  public getSlotMetadata(slotId: ModelSlotId): ModelSlotMetadata {
    return MODEL_SLOTS.find((s) => s.slotId === slotId) || MODEL_SLOTS[0];
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public hasCustomModel(slotId: ModelSlotId): boolean {
    return this.models.has(slotId);
  }

  public getEntry(slotId: ModelSlotId): CustomModelEntry | undefined {
    return this.models.get(slotId)?.entry;
  }

  public getRawGroup(slotId: ModelSlotId): THREE.Group | undefined {
    return this.models.get(slotId)?.rawGroup;
  }

  public getAllEntries(): CustomModelEntry[] {
    return Array.from(this.models.values()).map((m) => m.entry);
  }

  /**
   * Parses a user-uploaded File (.glb, .gltf, .obj) into a clean THREE.Group
   * and extracts geometry telemetry.
   */
  public async parseFile(file: File): Promise<ParsedModelResult> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (ext !== 'glb' && ext !== 'gltf' && ext !== 'obj') {
      throw new Error(`Unsupported file extension ".${ext}". Please upload a .glb, .gltf, or .obj file.`);
    }

    if (ext === 'obj') {
      const text = await file.text();
      const objGroup = this.objLoader.parse(text);
      return this.inspectGroup(objGroup, 'obj');
    } else {
      const buffer = await file.arrayBuffer();
      const gltf = await new Promise<any>((resolve, reject) => {
        this.gltfLoader.parse(buffer, '', resolve, reject);
      });
      const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
      if (!root) {
        throw new Error('No 3D scene found inside the uploaded glTF/GLB file.');
      }
      const wrapper = new THREE.Group();
      wrapper.add(root);
      return this.inspectGroup(wrapper, ext as 'glb' | 'gltf');
    }
  }

  /**
   * Loads a 3D model from a direct URL (.glb, .gltf, .obj)
   */
  public async parseUrl(url: string): Promise<{ result: ParsedModelResult; fileName: string }> {
    const cleanUrl = url.trim();
    const fileName = cleanUrl.split('/').pop()?.split('?')[0] || 'remote_model.glb';
    const ext = fileName.split('.').pop()?.toLowerCase() || 'glb';

    if (ext === 'obj') {
      const objGroup = await new Promise<THREE.Group>((resolve, reject) => {
        this.objLoader.load(cleanUrl, resolve, undefined, reject);
      });
      return {
        result: this.inspectGroup(objGroup, 'obj'),
        fileName,
      };
    } else {
      const gltf = await new Promise<any>((resolve, reject) => {
        this.gltfLoader.load(cleanUrl, resolve, undefined, reject);
      });
      const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
      if (!root) {
        throw new Error('No 3D scene found at the provided URL.');
      }
      const wrapper = new THREE.Group();
      wrapper.add(root);
      return {
        result: this.inspectGroup(wrapper, ext === 'gltf' ? 'gltf' : 'glb'),
        fileName,
      };
    }
  }

  private inspectGroup(group: THREE.Group, format: 'glb' | 'gltf' | 'obj'): ParsedModelResult {
    let vertexCount = 0;
    let triangleCount = 0;

    group.updateMatrixWorld(true);
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geom = child.geometry as THREE.BufferGeometry;
        if (!geom.attributes.normal) {
          geom.computeVertexNormals();
        }
        const pos = geom.attributes.position;
        if (pos) {
          vertexCount += pos.count;
          if (geom.index) {
            triangleCount += Math.floor(geom.index.count / 3);
          } else {
            triangleCount += Math.floor(pos.count / 3);
          }
        }
      }
    });

    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    if (box.isEmpty()) {
      size.set(1, 1, 1);
    } else {
      box.getSize(size);
    }

    return {
      rawGroup: group,
      format,
      vertexCount,
      triangleCount,
      originalDimensions: [
        Number(size.x.toFixed(2)),
        Number(size.y.toFixed(2)),
        Number(size.z.toFixed(2)),
      ],
    };
  }

  /**
   * Deep-clones a THREE.Group along with cloning materials so overrides do not mutate raw source
   */
  public cloneGroupWithMaterials(source: THREE.Group): THREE.Group {
    const clone = source.clone(true);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map((m) => m.clone());
        } else {
          child.material = child.material.clone();
        }
      }
    });
    return clone;
  }

  /**
   * Builds a normalized, transformed, and material-configured THREE.Group ready for
   * previewing or placing into the live game scene.
   */
  public buildConfiguredGroup(
    rawGroup: THREE.Group,
    slotMeta: ModelSlotMetadata,
    transform: CustomModelTransform
  ): THREE.Group {
    const outerWrapper = new THREE.Group();
    const modelClone = this.cloneGroupWithMaterials(rawGroup);

    // 1. Apply Euler rotation on an inner pivot container first so bounding box grounds accurately
    const rotatedContainer = new THREE.Group();
    rotatedContainer.add(modelClone);
    rotatedContainer.rotation.set(
      THREE.MathUtils.degToRad(transform.rotation[0]),
      THREE.MathUtils.degToRad(transform.rotation[1]),
      THREE.MathUtils.degToRad(transform.rotation[2]),
      'XYZ'
    );
    rotatedContainer.updateMatrixWorld(true);

    // 2. Measure rotated bounding box
    const box = new THREE.Box3().setFromObject(rotatedContainer);
    const size = new THREE.Vector3(1, 1, 1);
    const center = new THREE.Vector3(0, 0, 0);
    if (!box.isEmpty()) {
      box.getSize(size);
      box.getCenter(center);
    }

    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const baseScale = transform.autoNormalize ? slotMeta.canonicalSize / maxDim : 1.0;
    const finalScale = Math.max(0.01, baseScale * transform.scale);

    // 3. Wrap in a scale & pivot alignment container
    const alignedContainer = new THREE.Group();
    alignedContainer.add(rotatedContainer);
    alignedContainer.scale.setScalar(finalScale);

    if (slotMeta.groundPivot) {
      // Align horizontal center to (0, 0) and bottom-most vertex to y = 0, then add yOffset
      alignedContainer.position.set(
        -center.x * finalScale,
        -box.min.y * finalScale + transform.yOffset,
        -center.z * finalScale
      );
    } else {
      // Handheld FP tool: center at camera tool anchor (0.3, -0.25, -0.55) + yOffset
      alignedContainer.position.set(
        0.3 - center.x * finalScale,
        -0.25 - center.y * finalScale + transform.yOffset,
        -0.55 - center.z * finalScale
      );
    }

    // 4. Configure shadows and optional PBR material overrides
    const tint = new THREE.Color(transform.tintColor);
    alignedContainer.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (transform.overrideMaterial) {
          child.material = new THREE.MeshStandardMaterial({
            color: tint,
            roughness: transform.roughness,
            metalness: transform.metalness,
            emissive: tint,
            emissiveIntensity: transform.emissiveIntensity,
            wireframe: transform.wireframe,
          });
        } else if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m: any) => {
            if ('wireframe' in m) {
              m.wireframe = transform.wireframe;
            }
          });
        }
      }
    });

    outerWrapper.add(alignedContainer);

    // If this is the RGSHSC Master Cloner, tag the inner container as dnaHelix if none exists so it can still animate if desired
    if (slotMeta.slotId === 'rgshsc_core' && !outerWrapper.getObjectByName('dnaHelix')) {
      alignedContainer.name = 'customClonerRoot';
    }

    return outerWrapper;
  }

  /**
   * Registers a custom 3D model for a game slot and notifies the engine/UI.
   */
  public registerCustomModel(
    slotId: ModelSlotId,
    fileName: string,
    parsed: ParsedModelResult,
    transform: CustomModelTransform
  ): CustomModelEntry {
    const slotMeta = this.getSlotMetadata(slotId);
    const configuredPrototype = this.buildConfiguredGroup(parsed.rawGroup, slotMeta, transform);

    const entry: CustomModelEntry = {
      slotId,
      fileName,
      format: parsed.format,
      vertexCount: parsed.vertexCount,
      triangleCount: parsed.triangleCount,
      originalDimensions: parsed.originalDimensions,
      transform: { ...transform, rotation: [...transform.rotation] as [number, number, number] },
      updatedAt: Date.now(),
    };

    this.models.set(slotId, {
      entry,
      rawGroup: parsed.rawGroup,
      configuredPrototype,
    });

    this.notify();
    return entry;
  }

  /**
   * Updates transform/material settings on an already-registered custom model slot.
   */
  public updateSlotTransform(slotId: ModelSlotId, transform: CustomModelTransform): CustomModelEntry | null {
    const stored = this.models.get(slotId);
    if (!stored) return null;

    const slotMeta = this.getSlotMetadata(slotId);
    stored.configuredPrototype = this.buildConfiguredGroup(stored.rawGroup, slotMeta, transform);
    stored.entry = {
      ...stored.entry,
      transform: { ...transform, rotation: [...transform.rotation] as [number, number, number] },
      updatedAt: Date.now(),
    };

    this.notify();
    return stored.entry;
  }

  /**
   * Removes a custom model from a slot, restoring the procedural mesh.
   */
  public clearSlotModel(slotId: ModelSlotId): void {
    if (this.models.has(slotId)) {
      this.models.delete(slotId);
      this.notify();
    }
  }

  /**
   * Returns a fresh clone of the configured custom model for a slot, or null if using procedural default.
   */
  public createCustomInstance(slotId: ModelSlotId): THREE.Group | null {
    const stored = this.models.get(slotId);
    if (!stored) return null;
    return this.cloneGroupWithMaterials(stored.configuredPrototype);
  }
}

export const customModelRegistry = new CustomModelRegistry();
