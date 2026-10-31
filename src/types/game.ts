export type ResourceType = 
  | 'wood' 
  | 'scrapMetal' 
  | 'quartzCrystal' 
  | 'biomass' 
  | 'purifiedWater' 
  | 'naniteCircuit'
  | 'treeSeeds'
  | 'foodRations';

export type EquippedItem = 'tool' | 'tablet';

export interface EcoStats {
  treesCut: number;
  seedsPlanted: number;
}

export interface TabletSDGMessage {
  id: string;
  category: 'water' | 'food' | 'trees' | 'innovation';
  sdgNumber: number;
  sdgTitle: string;
  headline: string;
  realWorldFact: string;
  ecoActionRule: string;
  sdgUrl: string;
  timestamp: number;
  read: boolean;
}

export interface Inventory {
  wood: number;
  scrapMetal: number;
  quartzCrystal: number;
  biomass: number;
  purifiedWater: number;
  naniteCircuit: number;
  treeSeeds: number;
  foodRations: number;
}

export interface SurvivorVitals {
  health: number; // 0 - 100
  hunger: number; // 0 - 100
  hydration: number; // 0 - 100
  stamina: number; // 0 - 100
  dnaIntegrity: number; // 0 - 100%
  dnaTemperature: number; // Celsius (-18 is optimal)
  radiationExposure: number; // 0 - 100%
}

export type WeatherType = 'clear' | 'rain' | 'radiation_storm';

export interface WeatherTelemetry {
  weather: WeatherType;
  harvestSpeedMultiplier: number;
  isSheltered: boolean;
  areMachinesSheltered: boolean;
  timeRemaining: number;
}

export type StructureType = 
  | 'foundation'
  | 'wall'
  | 'roof'
  | 'solar_panel'
  | 'water_condenser'
  | 'campfire'
  | 'cryo_stasis_pod'
  | 'nutrient_bioreactor'
  | 'gene_shifter_matrix'
  | 'rgshsc_core';

export interface StructureItem {
  id: string;
  type: StructureType;
  position: [number, number, number];
  rotation: number;
  health: number;
  builtBy: string;
}

export interface ResourceNode {
  id: string;
  type: ResourceType;
  position: [number, number, number];
  scale: [number, number, number];
  health: number;
  maxHealth: number;
  yields: { resource: ResourceType; amount: number };
  depleted: boolean;
  respawnTimer?: number;
  respawnDuration?: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  category: 'survival' | 'shelter' | 'cloner_tech';
  description: string;
  costs: Partial<Record<ResourceType, number>>;
  resultType?: StructureType;
  producesItem?: { resource: ResourceType; amount: number };
  tier: number;
}

export interface RemoteSurvivor {
  id: string;
  name: string;
  color: string;
  position: [number, number, number];
  rotation: [number, number];
  action: string;
  health: number;
}

export interface ChatMessage {
  sender: string;
  color: string;
  text: string;
  time: number;
}

export type ModelTargetCategory = 'map' | 'cloner' | 'structure' | 'resource' | 'avatar';

export type ModelSlotId =
  | 'world_map'
  | StructureType
  | 'wood'
  | 'quartzCrystal'
  | 'scrapMetal'
  | 'biomass'
  | 'survivor_avatar'
  | 'fp_tool';

export type TerrainPreset = 'default' | 'flat' | 'canyon' | 'crater' | 'islands' | 'heightmap';

export interface CustomMapConfig {
  terrainPreset: TerrainPreset;
  elevationScale: number;
  biomeColor: string;
  hideProceduralTerrain: boolean;
  heightmapName?: string;
}

export interface CustomModelTransform {
  scale: number;
  rotation: [number, number, number]; // Euler degrees [X, Y, Z]
  yOffset: number;
  autoNormalize: boolean;
  overrideMaterial: boolean;
  tintColor: string;
  roughness: number;
  metalness: number;
  emissiveIntensity: number;
  wireframe: boolean;
}

export interface CustomModelEntry {
  slotId: ModelSlotId;
  fileName: string;
  format: 'glb' | 'gltf' | 'obj';
  vertexCount: number;
  triangleCount: number;
  originalDimensions: [number, number, number];
  transform: CustomModelTransform;
  updatedAt: number;
}

export interface ModelSlotMetadata {
  slotId: ModelSlotId;
  name: string;
  category: ModelTargetCategory;
  description: string;
  canonicalSize: number; // Target max dimension in meters when autoNormalize is enabled
  groundPivot: boolean;  // True if bottom-center sits on y=0; false for handheld fp_tool
}

