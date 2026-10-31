import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CustomMapConfig,
  EquippedItem,
  Inventory,
  ModelSlotId,
  RemoteSurvivor,
  ResourceNode,
  ResourceType,
  StructureItem,
  StructureType,
  SurvivorVitals,
  WeatherTelemetry,
  WeatherType,
} from '../types/game';
import {
  groundTexture,
  FOUNDATION_GRID_SIZE,
  createMutatedTree,
  createSaplingTreeMesh,
  createQuartzCrystalNode,
  createScrapWreckageNode,
  createBiomassFloraNode,
  createStructureMesh,
  createFirstPersonToolMesh,
  createFirstPersonTabletMesh,
  createSurvivorAvatarMesh,
} from './proceduralAssets';
import { customModelRegistry } from './customModelRegistry';
import { sound } from '../audio/soundEffects';


export interface EngineCallbacks {
  onVitalsChange: (vitals: SurvivorVitals) => void;
  onInventoryChange: (inv: Inventory) => void;
  onHoverTargetChange: (targetText: string | null) => void;
  onLocalPlayerMove: (pos: [number, number, number], rot: [number, number], action: string, health: number) => void;
  onStructureBuilt: (structure: StructureItem) => void;
  onClonerProgress: (stage: number) => void;
  onResourceHarvested?: (nodeId: string) => void;
  onWeatherBroadcast?: (weather: WeatherType) => void;
  onHumanityRestored: () => void;
  onHumanityExtinct?: (reason: 'health' | 'dna') => void;
  onNotification: (text: string, type?: 'info' | 'warn' | 'success') => void;
  onPointerLockChange?: (isLocked: boolean) => void;
  onTimeOfDayChange?: (timeOfDay: number, phaseLabel: string, dayCount: number, isAuto: boolean) => void;
  onTreeCut?: () => void;
  onWaterCollected?: () => void;
  onBuildModeChange?: (type: StructureType | null) => void;
  onWeatherChange?: (telemetry: WeatherTelemetry) => void;
}

interface RemoteAvatarEntry {
  mesh: THREE.Group;
  name: string;
  color: string;
  targetPos: THREE.Vector3;
  targetYaw: number;
  action: string;
  walkPhase: number;
}

export class ThreeEngine {
  private container: HTMLElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  private fpToolGroup: THREE.Group | null = null;
  private fpTabletGroup: THREE.Group | null = null;
  public equippedItem: EquippedItem = 'tool';

  private isSoftwareGl: boolean = false;
  private frameId: number = 0;
  private isDestroyed: boolean = false;
  private callbacks: EngineCallbacks;

  // Game state
  public isPlaying: boolean = false;
  public isPaused: boolean = false;
  public isExtinct: boolean = false;
  public buildModeType: StructureType | null = null;
  public ghostMesh: THREE.Group | null = null;
  private isGhostPlacementValid: boolean = true;
  private ghostInvalidReason: string = '';


  // Player physics and motion
  private playerPos = new THREE.Vector3(0, 1.65, 8);
  private playerVelocity = new THREE.Vector3();
  private playerPitch: number = 0; // Up/down look in radians
  private playerYaw: number = 0;   // Left/right look in radians
  private isGrounded: boolean = true;
  private headBobTimer: number = 0;
  private cameraShake: number = 0;
  private hitstopTimer: number = 0;
  private lastNetBroadcastTime: number = 0;
  private localHarvestActionTimer: number = 0;

  // Keys held
  private keysHeld = new Set<string>();

  // World collections
  private resourceNodes: Map<string, { node: ResourceNode; mesh: THREE.Group }> = new Map();
  private structures: Map<string, { item: StructureItem; mesh: THREE.Group }> = new Map();
  private remoteAvatars: Map<string, RemoteAvatarEntry> = new Map();
  private terrainMesh: THREE.Mesh | null = null;
  private perimeterRocks: THREE.Mesh[] = [];
  private customMapGroup: THREE.Group | null = null;
  private mapHeightCache = new Map<string, number>();
  private mapRaycaster = new THREE.Raycaster();
  private mapDownVec = new THREE.Vector3(0, -1, 0);
  private mapRayOrigin = new THREE.Vector3();

  public mapConfig: CustomMapConfig = {
    terrainPreset: 'default',
    elevationScale: 1.0,
    biomeColor: '#94a3b8',
    hideProceduralTerrain: false,
  };
  private heightmapData: { data: Float32Array; width: number; height: number } | null = null;

  private raycaster = new THREE.Raycaster();
  private centerCoord = new THREE.Vector2(0, 0);

  // Survival Simulation Vitals
  public vitals: SurvivorVitals = {
    health: 100,
    hunger: 95,
    hydration: 90,
    stamina: 100,
    dnaIntegrity: 100,
    dnaTemperature: -18, // optimal cryo temp
    radiationExposure: 5,
  };

  public inventory: Inventory = {
    wood: 12,
    scrapMetal: 10,
    quartzCrystal: 6,
    biomass: 8,
    purifiedWater: 4,
    naniteCircuit: 2,
    treeSeeds: 4,
    foodRations: 2,
  };

  public clonerStage: number = 0;
  private hoveredNodeId: string | null = null;
  private hoveredStructureId: string | null = null;
  private dnaHelixMesh: THREE.Object3D | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private ambientLight: THREE.HemisphereLight | null = null;
  private sunOrbMesh: THREE.Mesh | null = null;
  private moonOrbMesh: THREE.Mesh | null = null;
  private gameTime: number = 0;

  // Day & Night Cycle State (starts at 10:30 AM bright daylight!)
  public timeOfDay: number = 10.5; // 0.0 to 24.0 hours
  public dayCount: number = 1;
  public isAutoDayNight: boolean = true;
  private lastReportedMinute: number = -1;

  // Dynamic Weather System State ('clear' | 'rain' | 'radiation_storm')
  public currentWeather: WeatherType = 'clear';
  public weatherTimer: number = 50; // Seconds until next automatic weather shift
  public isSheltered: boolean = false;
  public areMachinesSheltered: boolean = true;
  private rainLines: THREE.LineSegments | null = null;
  private radStormPoints: THREE.Points | null = null;
  private lastWeatherNotifySec: number = -1;
  private lastRadStormWarnSec: number = -1;

  // Pre-allocated colors for zero-GC day/night & weather interpolation
  private readonly colDaySky = new THREE.Color(0x60a5fa);
  private readonly colDawnDuskSky = new THREE.Color(0xea580c);
  private readonly colNightSky = new THREE.Color(0x0b1528);
  private readonly colDaySun = new THREE.Color(0xfffbeb);
  private readonly colSunsetSun = new THREE.Color(0xfdba74);
  private readonly colNightMoon = new THREE.Color(0x7dd3fc);
  private readonly colRainSky = new THREE.Color(0x334155);
  private readonly colRadStormSky = new THREE.Color(0x365314);
  private readonly colRadStormLight = new THREE.Color(0xa3e635);
  private readonly colWorkSky = new THREE.Color();
  private readonly colWorkLight = new THREE.Color();

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
  }

  public mount(container: HTMLElement) {
    this.container = container;
    this.isDestroyed = false;

    // 1. Detect Software GL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Setup WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    // 3. Environment Reflection & Atmospheric Fog (Initialized to crisp Daylight)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    this.scene.background = new THREE.Color(0x60a5fa);
    this.scene.fog = new THREE.FogExp2(0x60a5fa, 0.0085);

    // 4. Lighting Rig & Celestial Sun/Moon Orbs
    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 2.4);
    this.sunLight.position.set(45, 75, 30);
    this.sunLight.castShadow = !this.isSoftwareGl;
    if (this.sunLight.castShadow) {
      this.sunLight.shadow.mapSize.width = 1024;
      this.sunLight.shadow.mapSize.height = 1024;
      this.sunLight.shadow.camera.near = 0.5;
      this.sunLight.shadow.camera.far = 160;
      const d = 45;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0005;
      this.sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.sunLight);

    this.ambientLight = new THREE.HemisphereLight(0xe0f2fe, 0x334155, 1.15);
    this.scene.add(this.ambientLight);

    // Visible Sun Disc
    const sunGeom = new THREE.SphereGeometry(5.5, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false });
    this.sunOrbMesh = new THREE.Mesh(sunGeom, sunMat);
    this.scene.add(this.sunOrbMesh);

    // Visible Moon Disc
    const moonGeom = new THREE.SphereGeometry(4.2, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, fog: false });
    this.moonOrbMesh = new THREE.Mesh(moonGeom, moonMat);
    this.scene.add(this.moonOrbMesh);

    // 5. Build Procedural Terrain, Weather Particles & Features
    this.initTerrain();
    this.initWeatherParticles();
    this.seedResourceNodes();
    this.applyDayNightAtmosphere();

    // 6. First-Person Camera & Tool Assembly
    this.camera.position.copy(this.playerPos);
    this.camera.up.set(0, 1, 0);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    this.fpToolGroup = createFirstPersonToolMesh();
    this.fpToolGroup.visible = false; // Hidden on title screen
    this.camera.add(this.fpToolGroup);

    this.fpTabletGroup = createFirstPersonTabletMesh();
    this.fpTabletGroup.visible = false; // Hidden until player equips tablet
    this.camera.add(this.fpTabletGroup);

    // 7. Event Listeners
    window.addEventListener('resize', this.onResize);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('blur', this.onWindowBlur);
    this.renderer.domElement.addEventListener('mousedown', this.onCanvasMouseDown);
    this.renderer.domElement.addEventListener('contextmenu', this.onContextMenu);

    // 8. Start Loop
    this.clock = new THREE.Clock();
    this.tick();
  }

  private clock = new THREE.Clock();

  private baseTerrainHeightAt(x: number, z: number): number {
    const preset = this.mapConfig.terrainPreset;
    const scale = this.mapConfig.elevationScale;

    if (preset === 'flat') {
      return 0;
    }

    if (preset === 'heightmap' && this.heightmapData) {
      const { data, width, height } = this.heightmapData;
      // Map [-90, 90] world space to [0, width - 1]
      const u = Math.max(0, Math.min(1, (x + 90) / 180)) * (width - 1);
      const v = Math.max(0, Math.min(1, (z + 90) / 180)) * (height - 1);
      const x0 = Math.floor(u);
      const z0 = Math.floor(v);
      const x1 = Math.min(width - 1, x0 + 1);
      const z1 = Math.min(height - 1, z0 + 1);
      const tx = u - x0;
      const tz = v - z0;

      const h00 = data[z0 * width + x0] || 0;
      const h10 = data[z0 * width + x1] || 0;
      const h01 = data[z1 * width + x0] || 0;
      const h11 = data[z1 * width + x1] || 0;

      const hx0 = h00 * (1 - tx) + h10 * tx;
      const hx1 = h01 * (1 - tx) + h11 * tx;
      const normalized = hx0 * (1 - tz) + hx1 * tz;
      return (normalized - 0.25) * 14.0 * scale;
    }

    if (preset === 'canyon') {
      const ridge = Math.abs(Math.sin(x * 0.035 + Math.cos(z * 0.025))) * 5.5;
      const step = Math.floor(ridge * 1.4) / 1.4;
      return (step - 1.2) * scale;
    }

    if (preset === 'crater') {
      const r = Math.hypot(x, z);
      const rim = Math.exp(-Math.pow((r - 36) / 10, 2)) * 7.5;
      const bowl = r < 36 ? -1.8 * (1 - r / 36) : 0;
      const noise = Math.sin(x * 0.06) * Math.cos(z * 0.06) * 0.7;
      return (rim + bowl + noise) * scale;
    }

    if (preset === 'islands') {
      const wave1 = Math.sin(x * 0.055) * Math.sin(z * 0.055) * 4.2;
      const terrace = Math.round(wave1 * 1.5) / 1.5;
      return terrace * scale;
    }

    // Default rolling hills
    const d1 = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 1.8;
    const d2 = Math.cos(x * 0.08 + 1.2) * Math.sin(z * 0.08) * 0.8;
    return (d1 + d2) * scale;
  }

  public groundHeightAt(x: number, z: number): number {
    // If a custom 3D World Map (.glb/.gltf/.obj) is active, raycast down onto its surface (with fast spatial grid cache)
    if (this.customMapGroup) {
      const key = `${Math.round(x * 2)},${Math.round(z * 2)}`;
      const cached = this.mapHeightCache.get(key);
      if (cached !== undefined) return cached;

      this.mapRayOrigin.set(x, 160, z);
      this.mapRaycaster.set(this.mapRayOrigin, this.mapDownVec);
      const hits = this.mapRaycaster.intersectObjects(this.customMapGroup.children, true);
      if (hits.length > 0) {
        const surfaceY = hits[0].point.y;
        this.mapHeightCache.set(key, surfaceY);
        return surfaceY;
      }

      const fallback = this.mapConfig.hideProceduralTerrain ? 0 : this.baseTerrainHeightAt(x, z);
      this.mapHeightCache.set(key, fallback);
      return fallback;
    }

    return this.baseTerrainHeightAt(x, z);
  }

  private initTerrain() {
    const size = 180;
    const segments = 90;
    const geom = new THREE.PlaneGeometry(size, size, segments, segments);
    geom.rotateX(-Math.PI / 2);

    const posAttr = geom.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      posAttr.setY(i, this.baseTerrainHeightAt(x, z));
    }
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 0.82,
      metalness: 0.12,
      color: new THREE.Color(this.mapConfig.biomeColor),
    });
    this.terrainMesh = new THREE.Mesh(geom, mat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    // Add perimeter natural boundaries: mountain monoliths so it's not a rectangular void
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, flatShading: true });
    this.perimeterRocks = [];
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      const radius = 78 + (Math.sin(i * 3) * 6);
      const bx = Math.cos(angle) * radius;
      const bz = Math.sin(angle) * radius;
      const h = 14 + Math.sin(i * 4) * 6;
      const rockGeom = new THREE.DodecahedronGeometry(h * 0.4, 1);
      const rock = new THREE.Mesh(rockGeom, barrierMat);
      rock.scale.set(1.5, 2.2, 1.5);
      rock.position.set(bx, h * 0.4 + this.baseTerrainHeightAt(bx, bz), bz);
      rock.userData = { baseH: h * 0.4 };
      rock.castShadow = !this.isSoftwareGl;
      this.scene.add(rock);
      this.perimeterRocks.push(rock);
    }
  }

  public rebuildTerrainGeometry() {
    this.mapHeightCache.clear();

    if (this.terrainMesh) {
      this.terrainMesh.visible = !this.mapConfig.hideProceduralTerrain;
      const geom = this.terrainMesh.geometry as THREE.BufferGeometry;
      const posAttr = geom.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const z = posAttr.getZ(i);
        posAttr.setY(i, this.baseTerrainHeightAt(x, z));
      }
      posAttr.needsUpdate = true;
      geom.computeVertexNormals();

      if (this.terrainMesh.material instanceof THREE.MeshStandardMaterial) {
        this.terrainMesh.material.color.set(this.mapConfig.biomeColor);
      }
    }

    // Re-ground perimeter rocks
    for (const rock of this.perimeterRocks) {
      rock.visible = !this.mapConfig.hideProceduralTerrain;
      const baseH = rock.userData?.baseH || 5;
      rock.position.y = baseH + this.baseTerrainHeightAt(rock.position.x, rock.position.z);
    }

    // Re-ground all resource nodes (including regenerating ones) onto the new map surface
    this.resourceNodes.forEach((entry) => {
      const nx = entry.node.position[0];
      const nz = entry.node.position[2];
      const ny = this.groundHeightAt(nx, nz);
      entry.node.position[1] = ny;
      entry.mesh.position.y = ny;
    });

    // Re-ground player position
    this.playerPos.y = this.groundHeightAt(this.playerPos.x, this.playerPos.z) + 1.65;
    this.camera.position.y = this.playerPos.y;
  }

  public updateMapConfig(partial: Partial<CustomMapConfig>) {
    this.mapConfig = { ...this.mapConfig, ...partial };
    this.rebuildTerrainGeometry();
  }

  public async applyHeightmapImage(file: File): Promise<{ width: number; height: number }> {
    const bitmap = await createImageBitmap(file);
    const gridW = 128;
    const gridH = 128;
    const canvas = document.createElement('canvas');
    canvas.width = gridW;
    canvas.height = gridH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable.');

    ctx.drawImage(bitmap, 0, 0, gridW, gridH);
    const imgData = ctx.getImageData(0, 0, gridW, gridH).data;
    const floatData = new Float32Array(gridW * gridH);

    for (let i = 0; i < gridW * gridH; i++) {
      const r = imgData[i * 4];
      const g = imgData[i * 4 + 1];
      const b = imgData[i * 4 + 2];
      // Luminance in [0..1]
      floatData[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }

    this.heightmapData = { data: floatData, width: gridW, height: gridH };
    this.mapConfig = {
      ...this.mapConfig,
      terrainPreset: 'heightmap',
      heightmapName: file.name,
      hideProceduralTerrain: false,
    };
    this.rebuildTerrainGeometry();
    return { width: bitmap.width, height: bitmap.height };
  }

  public exportWorldMapJson(): string {
    const structuresList: StructureItem[] = [];
    this.structures.forEach(({ item }) => structuresList.push(item));

    const payload = {
      format: 'RGSHSC_WORLD_MAP_V1',
      exportedAt: new Date().toISOString(),
      mapConfig: this.mapConfig,
      clonerStage: this.clonerStage,
      timeOfDay: this.timeOfDay,
      structures: structuresList,
    };
    return JSON.stringify(payload, null, 2);
  }

  public importWorldMapJson(jsonStr: string): { structuresCount: number; preset: string } {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON Map file.');
    }

    if (parsed.mapConfig) {
      this.mapConfig = {
        ...this.mapConfig,
        ...parsed.mapConfig,
      };
    }

    if (typeof parsed.timeOfDay === 'number') {
      this.setTimeOfDay(parsed.timeOfDay);
    }

    this.rebuildTerrainGeometry();

    if (Array.isArray(parsed.structures)) {
      // Clear existing structures and load imported map structures
      this.structures.forEach(({ mesh }) => this.scene.remove(mesh));
      this.structures.clear();

      for (const s of parsed.structures) {
        if (s && s.id && s.type && Array.isArray(s.position)) {
          this.addStructureMesh(s as StructureItem);
          this.callbacks.onStructureBuilt(s as StructureItem);
        }
      }
    }

    if (typeof parsed.clonerStage === 'number') {
      this.clonerStage = 0;
      this.advanceClonerStage(parsed.clonerStage, false);
    }

    return {
      structuresCount: Array.isArray(parsed.structures) ? parsed.structures.length : 0,
      preset: this.mapConfig.terrainPreset,
    };
  }

  private seedResourceNodes() {
    // Fixed deterministic placements
    const placeNodes = (count: number, type: ResourceType, builder: () => THREE.Group, maxHp: number, yieldAmt: number) => {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (type === 'quartzCrystal' ? 0.8 : 0);
        const dist = 12 + ((i * 17) % 52);
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        const y = this.groundHeightAt(x, z);

        const mesh = builder();
        mesh.position.set(x, y, z);
        mesh.rotation.y = (i * 1.3) % (Math.PI * 2);
        this.scene.add(mesh);

        const id = `${type}_${i}`;
        const node: ResourceNode = {
          id,
          type,
          position: [x, y, z],
          scale: [1, 1, 1],
          health: maxHp,
          maxHealth: maxHp,
          yields: { resource: type, amount: yieldAmt },
          depleted: false,
        };

        mesh.userData = { id, type, isResource: true };
        this.resourceNodes.set(id, { node, mesh });
      }
    };

    placeNodes(22, 'wood', createMutatedTree, 100, 4);
    placeNodes(18, 'quartzCrystal', createQuartzCrystalNode, 120, 3);
    placeNodes(16, 'scrapMetal', createScrapWreckageNode, 150, 4);
    placeNodes(18, 'biomass', createBiomassFloraNode, 70, 3);
  }

  public setGhostPreview(type: StructureType | null) {
    this.buildModeType = type;
    this.isGhostPlacementValid = true;
    this.ghostInvalidReason = '';
    if (this.ghostMesh) {
      this.scene.remove(this.ghostMesh);
      this.ghostMesh = null;
    }

    if (type) {
      const mesh = createStructureMesh(type);
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x06b6d4,
            transparent: true,
            opacity: 0.58,
            wireframe: false,
          });
        }
      });
      this.ghostMesh = mesh;
      this.scene.add(this.ghostMesh);
    }

    this.callbacks.onBuildModeChange?.(type);
  }

  public cancelBuildMode(notify: boolean = true) {
    if (!this.buildModeType && !this.ghostMesh) return;
    this.setGhostPreview(null);
    if (notify) {
      this.callbacks.onNotification('Building plan cancelled.', 'info');
    }
  }

  private setGhostValidityColor(isValid: boolean) {
    if (!this.ghostMesh) return;
    const targetHex = isValid ? 0x06b6d4 : 0xf43f5e;
    const targetOpacity = isValid ? 0.58 : 0.45;
    this.ghostMesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.color.setHex(targetHex);
        child.material.opacity = targetOpacity;
      }
    });
  }

  public placeCurrentStructure() {
    if (!this.buildModeType || !this.ghostMesh) return;

    // Validate placement rules (e.g. Wall must snap to a Foundation Deck edge)
    if (!this.isGhostPlacementValid) {
      this.callbacks.onNotification(
        this.ghostInvalidReason || 'Invalid placement location!',
        'warn'
      );
      sound.playDnaAlert();
      return;
    }


    // Check resource requirements
    const costs: Partial<Record<ResourceType, number>> = {
      foundation: { wood: 4, scrapMetal: 2 },
      wall: { scrapMetal: 3, wood: 2 },
      roof: { scrapMetal: 3, quartzCrystal: 1 },
      solar_panel: { quartzCrystal: 3, scrapMetal: 4 },
      water_condenser: { scrapMetal: 3, quartzCrystal: 2 },
      campfire: { wood: 3 },
      cryo_stasis_pod: { scrapMetal: 6, quartzCrystal: 4, naniteCircuit: 1 },
      nutrient_bioreactor: { biomass: 6, purifiedWater: 3, naniteCircuit: 2 },
      gene_shifter_matrix: { quartzCrystal: 6, naniteCircuit: 3, scrapMetal: 5 },
      rgshsc_core: { quartzCrystal: 8, naniteCircuit: 4, scrapMetal: 8, biomass: 8 },
    }[this.buildModeType] || {};

    for (const [rKey, amt] of Object.entries(costs)) {
      const r = rKey as ResourceType;
      if ((this.inventory[r] || 0) < (amt || 0)) {
        this.callbacks.onNotification(`Insufficient ${r}: need ${amt}`, 'warn');
        sound.playDnaAlert();
        return;
      }
    }

    // Deduct resources
    for (const [rKey, amt] of Object.entries(costs)) {
      const r = rKey as ResourceType;
      this.inventory[r] -= (amt || 0);
    }
    this.callbacks.onInventoryChange({ ...this.inventory });

    // Spawn structure
    const pos: [number, number, number] = [
      this.ghostMesh.position.x,
      this.ghostMesh.position.y,
      this.ghostMesh.position.z,
    ];
    const structureItem: StructureItem = {
      id: 'str_' + Math.random().toString(36).substring(2, 8),
      type: this.buildModeType,
      position: pos,
      rotation: this.ghostMesh.rotation.y,
      health: 100,
      builtBy: 'local',
    };

    this.addStructureMesh(structureItem);
    this.callbacks.onStructureBuilt(structureItem);
    sound.playBuildPlace();
    this.callbacks.onNotification(`Constructed ${this.buildModeType.replace('_', ' ').toUpperCase()}`, 'success');

    // If upgraded cloner components (strict sequential tier progression):
    if (this.buildModeType === 'cryo_stasis_pod' && this.clonerStage === 0) {
      this.advanceClonerStage(1, false);
      this.setGhostPreview(null);
      return;
    } else if (this.buildModeType === 'nutrient_bioreactor' && this.clonerStage === 1) {
      this.advanceClonerStage(2, false);
      this.setGhostPreview(null);
      return;
    } else if (this.buildModeType === 'gene_shifter_matrix' && this.clonerStage === 2) {
      this.advanceClonerStage(3, false);
      this.setGhostPreview(null);
      return;
    } else if (this.buildModeType === 'rgshsc_core' && this.clonerStage === 3) {
      this.advanceClonerStage(4, false);
      this.setGhostPreview(null);
      return;
    }

    // For base/shelter structures: if the player can no longer afford another copy of this blueprint,
    // automatically exit build mode so they aren't stuck with a ghost mesh they can't afford.
    const canAffordAnother = Object.entries(costs).every(
      ([rKey, amt]) => (this.inventory[rKey as ResourceType] || 0) >= (amt || 0)
    );
    if (!canAffordAnother) {
      this.setGhostPreview(null);
    }
  }

  public advanceClonerStage(stage: number, fromNetwork: boolean = false) {
    if (stage <= this.clonerStage) return;
    this.clonerStage = stage;
    if (!fromNetwork) {
      this.callbacks.onClonerProgress(stage);
    }
    sound.playClonerUpgrade();
    if (stage === 1) {
      this.callbacks.onNotification('Cryo-Stasis Chamber Active: DNA degradation locked!', 'success');
      this.vitals.dnaTemperature = -18;
    } else if (stage === 2) {
      this.callbacks.onNotification('Nutrient Bioreactor Online: Maternal synthesis matrix active!', 'success');
    } else if (stage === 3) {
      this.callbacks.onNotification('Gene Shifter Matrix Online: Radiation mutations purged!', 'success');
    } else if (stage === 4) {
      this.callbacks.onNotification('RGSHSC ONLINE: Reproductive gene shifter is ready for human cloning!', 'success');
    }
  }

  public startExpedition() {
    this.isPlaying = true;
    this.isPaused = false;
    this.isExtinct = false;
    this.playerYaw = 0;
    this.playerPitch = 0;
    this.playerVelocity.set(0, 0, 0);
    this.isGrounded = true;
    this.camera.up.set(0, 1, 0);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(0, 0, 0, 'YXZ');
    const startY = this.groundHeightAt(0, 8) + 1.65;
    this.playerPos.set(0, startY, 8);
    this.camera.position.copy(this.playerPos);
    this.setEquippedItem(this.equippedItem);
  }

  public reviveFromExtinction() {
    this.isExtinct = false;
    this.isPaused = false;
    this.vitals.health = 100;
    this.vitals.hunger = Math.max(85, this.vitals.hunger);
    this.vitals.hydration = Math.max(85, this.vitals.hydration);
    if (this.vitals.dnaIntegrity <= 0) {
      this.vitals.dnaIntegrity = 75;
    }
    if (this.clonerStage < 1) {
      this.vitals.dnaTemperature = -18;
    }
    this.callbacks.onVitalsChange({ ...this.vitals });
    sound.playCraftComplete();
  }

  public setEquippedItem(item: EquippedItem) {
    this.equippedItem = item;
    if (!this.isPlaying) {
      if (this.fpToolGroup) this.fpToolGroup.visible = false;
      if (this.fpTabletGroup) this.fpTabletGroup.visible = false;
      return;
    }
    if (this.fpToolGroup) this.fpToolGroup.visible = item === 'tool';
    if (this.fpTabletGroup) this.fpTabletGroup.visible = item === 'tablet';
  }

  public plantTreeSeed(): boolean {
    if ((this.inventory.treeSeeds || 0) <= 0) {
      this.callbacks.onNotification('No Tree Seeds in inventory! Cut a tree or extract seeds from Biomass.', 'warn');
      sound.playDnaAlert();
      return false;
    }

    this.inventory.treeSeeds -= 1;
    this.callbacks.onInventoryChange({ ...this.inventory });

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerYaw);
    const jitterAngle = (Math.random() - 0.5) * 0.5;
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), jitterAngle);
    const target = this.playerPos.clone().add(forward.multiplyScalar(3.4));
    const x = target.x;
    const z = target.z;
    const y = this.groundHeightAt(x, z);

    const mesh = createSaplingTreeMesh();
    mesh.position.set(x, y, z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.scale.set(0.35, 0.35, 0.35);
    this.scene.add(mesh);

    const id = `sapling_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const node: ResourceNode = {
      id,
      type: 'wood',
      position: [x, y, z],
      scale: [1, 1, 1],
      health: 0,
      maxHealth: 100,
      yields: { resource: 'wood', amount: 4 },
      depleted: true,
      respawnDuration: 30, // Planted seeds take 30 seconds to grow
      respawnTimer: 30,
    };
    mesh.userData = { id, type: 'wood', isResource: true, isGrowingSapling: true };
    this.resourceNodes.set(id, { node, mesh });

    sound.playBuildPlace();
    return true;
  }

  public triggerCloningRestoration() {
    if (this.clonerStage < 4) {
      this.callbacks.onNotification('RGSHSC requires all 4 technological tiers to clone!', 'warn');
      return;
    }
    sound.playHumanityRestoredFanfare();
    this.callbacks.onNotification('Restoration sequence initiated! Synthesizing synthetic human genome...', 'success');
    setTimeout(() => {
      this.callbacks.onHumanityRestored();
    }, 2800);
  }

  public addStructureMesh(item: StructureItem) {
    if (this.structures.has(item.id)) return;
    const mesh = createStructureMesh(item.type);
    mesh.position.set(item.position[0], item.position[1], item.position[2]);
    mesh.rotation.y = item.rotation;
    mesh.userData = { id: item.id, isStructure: true, type: item.type };
    this.scene.add(mesh);
    this.structures.set(item.id, { item, mesh });

    if (item.type === 'rgshsc_core') {
      const helix = mesh.getObjectByName('dnaHelix');
      if (helix) this.dnaHelixMesh = helix;
    }
  }

  public syncStructures(items: StructureItem[]) {
    items.forEach((item) => this.addStructureMesh(item));
  }

  public getLocalPlayerTransform(): { position: [number, number, number]; rotation: [number, number] } {
    return {
      position: [this.playerPos.x, this.playerPos.y, this.playerPos.z],
      rotation: [this.playerPitch, this.playerYaw],
    };
  }

  public teleportToPosition(pos: [number, number, number]) {
    const offsetX = pos[0] + 1.8;
    const offsetZ = pos[2] + 1.8;
    const groundY = this.groundHeightAt(offsetX, offsetZ) + 1.65;
    this.playerPos.set(offsetX, groundY, offsetZ);
    this.playerVelocity.set(0, 0, 0);
    this.camera.position.copy(this.playerPos);
    // Face toward the ally
    this.playerYaw = Math.atan2(offsetX - pos[0], offsetZ - pos[2]);
    sound.playCraftComplete();
  }

  public updateRemoteSurvivor(
    id: string,
    name: string,
    color: string,
    pos: [number, number, number],
    rot: [number, number],
    action: string = 'idle'
  ) {
    const safeName = name || 'Survivor';
    const safeColor = color || '#06B6D4';

    // Convert camera eye height (y = ground + 1.65) to avatar foot ground height (y = ground)
    const groundY = this.groundHeightAt(pos[0], pos[2]);
    const footY = Math.max(groundY, (pos[1] ?? groundY + 1.65) - 1.65);

    let entry = this.remoteAvatars.get(id);
    if (!entry || entry.name !== safeName || entry.color !== safeColor) {
      if (entry) {
        this.scene.remove(entry.mesh);
      }
      const mesh = createSurvivorAvatarMesh(safeColor, false, safeName);
      mesh.position.set(pos[0], footY, pos[2]);
      mesh.rotation.y = rot[1] || 0;
      this.scene.add(mesh);
      entry = {
        mesh,
        name: safeName,
        color: safeColor,
        targetPos: new THREE.Vector3(pos[0], footY, pos[2]),
        targetYaw: rot[1] || 0,
        action,
        walkPhase: 0,
      };
      this.remoteAvatars.set(id, entry);
    } else {
      entry.targetPos.set(pos[0], footY, pos[2]);
      entry.targetYaw = rot[1] || 0;
      entry.action = action || 'idle';
    }
  }

  public syncAllRemoteSurvivors(survivors: RemoteSurvivor[]) {
    const activeIds = new Set<string>();
    for (const s of survivors) {
      activeIds.add(s.id);
      this.updateRemoteSurvivor(
        s.id,
        s.name,
        s.color,
        s.position || [0, 1.65, 8],
        s.rotation || [0, 0],
        s.action || 'idle'
      );
    }
    // Remove any avatars that left the room
    for (const existingId of Array.from(this.remoteAvatars.keys())) {
      if (!activeIds.has(existingId)) {
        this.removeRemoteSurvivor(existingId);
      }
    }
  }

  public clearRemoteSurvivors() {
    for (const id of Array.from(this.remoteAvatars.keys())) {
      this.removeRemoteSurvivor(id);
    }
  }

  public removeRemoteSurvivor(id: string) {
    const entry = this.remoteAvatars.get(id);
    if (entry) {
      this.scene.remove(entry.mesh);
      this.remoteAvatars.delete(id);
    }
  }

  private updateRemoteAvatarsAnimation(dt: number) {
    const lerpFactor = Math.min(1, dt * 12);
    this.remoteAvatars.forEach((entry) => {
      const distSq = entry.mesh.position.distanceToSquared(entry.targetPos);
      // If very far (>25m), snap immediately; otherwise smoothly interpolate
      if (distSq > 625) {
        entry.mesh.position.copy(entry.targetPos);
      } else {
        entry.mesh.position.lerp(entry.targetPos, lerpFactor);
      }

      // Smoothly interpolate Y rotation (handling angle wrap-around)
      let diff = entry.targetYaw - entry.mesh.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      entry.mesh.rotation.y += diff * lerpFactor;

      // Animate legs and arms when moving or harvesting
      const isMoving = distSq > 0.0025 || entry.action === 'walk';
      const leftLeg = entry.mesh.getObjectByName('leftLeg');
      const rightLeg = entry.mesh.getObjectByName('rightLeg');
      const leftArm = entry.mesh.getObjectByName('leftArm');
      const rightArm = entry.mesh.getObjectByName('rightArm');

      if (isMoving) {
        entry.walkPhase += dt * 10;
        const swing = Math.sin(entry.walkPhase) * 0.55;
        if (leftLeg) leftLeg.rotation.x = swing;
        if (rightLeg) rightLeg.rotation.x = -swing;
        if (leftArm) leftArm.rotation.x = -swing * 0.7;
        if (rightArm && entry.action !== 'harvest') rightArm.rotation.x = swing * 0.7;
      } else {
        if (leftLeg) leftLeg.rotation.x *= 0.8;
        if (rightLeg) rightLeg.rotation.x *= 0.8;
        if (leftArm) leftArm.rotation.x *= 0.8;
        if (rightArm && entry.action !== 'harvest') rightArm.rotation.x *= 0.8;
      }

      if (rightArm && entry.action === 'harvest') {
        entry.walkPhase += dt * 18;
        rightArm.rotation.x = -0.6 + Math.sin(entry.walkPhase) * 0.65;
      }
    });
  }

  public depleteRemoteResourceNode(nodeId: string) {
    const entry = this.resourceNodes.get(nodeId);
    if (!entry || entry.node.depleted) return;
    if (entry.node.type === 'biomass') {
      this.scene.remove(entry.mesh);
      this.resourceNodes.delete(nodeId);
      this.spawnRandomBiomassNode(false);
      return;
    }
    const regenSecs = this.getRegenDurationForType(entry.node.type);
    entry.node.depleted = true;
    entry.node.health = 0;
    entry.node.respawnDuration = regenSecs;
    entry.node.respawnTimer = regenSecs;
    entry.mesh.scale.set(0.18, 0.18, 0.18);
  }

  /**
   * Hot-swaps all live scene instances of a given slotId when the player applies or resets
   * a custom 3D model in the 3D Model Studio.
   */
  public refreshCustomModelSlot(slotId: ModelSlotId) {
    // 0. Check if slotId is the Full 3D World Map ('world_map')
    if (slotId === 'world_map') {
      if (this.customMapGroup) {
        this.scene.remove(this.customMapGroup);
        this.customMapGroup = null;
      }
      const customMap = customModelRegistry.createCustomInstance('world_map');
      if (customMap) {
        customMap.position.set(0, 0, 0);
        customMap.updateMatrixWorld(true);
        this.customMapGroup = customMap;
        this.scene.add(customMap);
      }
      this.rebuildTerrainGeometry();
      return;
    }

    // 1. Check if slotId is a harvestable world resource
    if (
      slotId === 'wood' ||
      slotId === 'quartzCrystal' ||
      slotId === 'scrapMetal' ||
      slotId === 'biomass'
    ) {
      const builder =
        slotId === 'wood'
          ? createMutatedTree
          : slotId === 'quartzCrystal'
          ? createQuartzCrystalNode
          : slotId === 'scrapMetal'
          ? createScrapWreckageNode
          : createBiomassFloraNode;

      this.resourceNodes.forEach((entry, id) => {
        if (entry.node.type === slotId) {
          const oldMesh = entry.mesh;
          const pos = oldMesh.position.clone();
          const rotY = oldMesh.rotation.y;
          const scl = oldMesh.scale.clone();
          this.scene.remove(oldMesh);

          const newMesh = builder();
          newMesh.position.copy(pos);
          newMesh.rotation.y = rotY;
          newMesh.scale.copy(scl);
          newMesh.userData = { id, type: slotId, isResource: true };
          this.scene.add(newMesh);
          entry.mesh = newMesh;
        }
      });
      return;
    }

    // 2. Check if slotId is the first-person handheld multi-tool
    if (slotId === 'fp_tool') {
      const wasVisible = this.fpToolGroup ? this.fpToolGroup.visible : this.isPlaying;
      if (this.fpToolGroup) {
        this.camera.remove(this.fpToolGroup);
      }
      this.fpToolGroup = createFirstPersonToolMesh();
      this.fpToolGroup.visible = wasVisible;
      this.camera.add(this.fpToolGroup);
      return;
    }

    // 3. Check if slotId is the survivor character avatar
    if (slotId === 'survivor_avatar') {
      this.remoteAvatars.forEach((entry, id) => {
        const pos = entry.mesh.position.clone();
        const rotY = entry.mesh.rotation.y;
        this.scene.remove(entry.mesh);

        const newMesh = createSurvivorAvatarMesh(entry.color, false, entry.name);
        newMesh.position.copy(pos);
        newMesh.rotation.y = rotY;
        this.scene.add(newMesh);
        entry.mesh = newMesh;
        this.remoteAvatars.set(id, entry);
      });
      return;
    }

    // 4. Otherwise slotId is a buildable StructureType (including RGSHSC Cloner tiers)
    const structType = slotId as StructureType;
    this.structures.forEach((entry, id) => {
      if (entry.item.type === structType) {
        this.scene.remove(entry.mesh);
        const newMesh = createStructureMesh(structType);
        newMesh.position.set(entry.item.position[0], entry.item.position[1], entry.item.position[2]);
        newMesh.rotation.y = entry.item.rotation;
        newMesh.userData = { id, isStructure: true, type: structType };
        this.scene.add(newMesh);
        entry.mesh = newMesh;

        if (structType === 'rgshsc_core') {
          const helix = newMesh.getObjectByName('dnaHelix') || newMesh.getObjectByName('customClonerRoot');
          if (helix) this.dnaHelixMesh = helix;
        }
      }
    });

    // Refresh active build ghost preview if matching
    if (this.buildModeType === structType) {
      this.setGhostPreview(structType);
    }
  }

  /**
   * Spawns a test instance of any slotId directly in front of the player on the terrain
   * so they can immediately inspect their custom 3D model in the live world.
   */
  public spawnPreviewPropInFrontOfPlayer(slotId: ModelSlotId) {
    if (slotId === 'world_map') {
      this.refreshCustomModelSlot('world_map');
      sound.playBuildPlace();
      return;
    }

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerYaw);
    const target = this.playerPos.clone().add(forward.multiplyScalar(4.2));
    const x = target.x;
    const z = target.z;
    const y = this.groundHeightAt(x, z);

    if (
      slotId === 'wood' ||
      slotId === 'quartzCrystal' ||
      slotId === 'scrapMetal' ||
      slotId === 'biomass'
    ) {
      const builder =
        slotId === 'wood'
          ? createMutatedTree
          : slotId === 'quartzCrystal'
          ? createQuartzCrystalNode
          : slotId === 'scrapMetal'
          ? createScrapWreckageNode
          : createBiomassFloraNode;
      const mesh = builder();
      mesh.position.set(x, y, z);
      mesh.rotation.y = this.playerYaw + Math.PI;
      const id = `${slotId}_custom_${Date.now()}`;
      const node: ResourceNode = {
        id,
        type: slotId,
        position: [x, y, z],
        scale: [1, 1, 1],
        health: 120,
        maxHealth: 120,
        yields: { resource: slotId, amount: 4 },
        depleted: false,
      };
      mesh.userData = { id, type: slotId, isResource: true };
      this.scene.add(mesh);
      this.resourceNodes.set(id, { node, mesh });
      sound.playBuildPlace();
      return;
    }

    if (slotId === 'survivor_avatar') {
      const id = `ally_preview_${Date.now()}`;
      this.updateRemoteSurvivor(id, 'Custom Survivor', '#06B6D4', [x, y, z], [0, this.playerYaw + Math.PI]);
      sound.playBuildPlace();
      return;
    }

    if (slotId === 'fp_tool') {
      this.refreshCustomModelSlot('fp_tool');
      sound.playBuildPlace();
      return;
    }

    // Structure or Cloner Tier
    const structType = slotId as StructureType;
    const structureItem: StructureItem = {
      id: 'str_' + Math.random().toString(36).substring(2, 8),
      type: structType,
      position: [x, y, z],
      rotation: this.playerYaw + Math.PI,
      health: 100,
      builtBy: 'local',
    };
    this.addStructureMesh(structureItem);
    this.callbacks.onStructureBuilt(structureItem);
    sound.playBuildPlace();
  }


  public isPointerLocked(): boolean {
    return document.pointerLockElement === this.renderer?.domElement;
  }

  public lockPointer() {
    if (this.renderer?.domElement && !this.isPointerLocked()) {
      this.renderer.domElement.requestPointerLock();
    }
  }

  public unlockPointer() {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  private onPointerLockChange = () => {
    const isLocked = this.isPointerLocked();
    this.callbacks.onPointerLockChange?.(isLocked);
  };

  // Input Handlers
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    this.keysHeld.add(e.code);
    if (e.code === 'KeyE') {
      this.handleInteractKey();
    } else if ((e.code === 'KeyX' || e.code === 'KeyC' || e.code === 'Escape') && this.buildModeType) {
      this.cancelBuildMode(true);
    } else if (e.code === 'Tab') {
      e.preventDefault();
      if (this.isPointerLocked()) {
        this.unlockPointer();
      } else {
        this.lockPointer();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keysHeld.delete(e.code);
  };

  private onWindowBlur = () => {
    this.keysHeld.clear();
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isPlaying || this.isPaused) return;
    if (!this.isPointerLocked()) return;

    const sensitivity = 0.0022;
    this.playerYaw -= e.movementX * sensitivity;
    this.playerPitch -= e.movementY * sensitivity;
    this.playerPitch = Math.max(-1.45, Math.min(1.45, this.playerPitch));
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private onCanvasMouseDown = (e: MouseEvent) => {
    if (!this.isPlaying || this.isPaused) return;

    // Right-click (button === 2) always cancels active building plan immediately
    if (e.button === 2 && this.buildModeType) {
      e.preventDefault();
      this.cancelBuildMode(true);
      return;
    }

    if (!this.isPointerLocked()) {
      this.lockPointer();
      return;
    }

    if (e.button === 0) {
      if (this.buildModeType) {
        this.placeCurrentStructure();
      } else {
        this.performHarvestAction();
      }
    }
  };

  private isMachineType(type: StructureType): boolean {
    return (
      type === 'cryo_stasis_pod' ||
      type === 'nutrient_bioreactor' ||
      type === 'gene_shifter_matrix' ||
      type === 'rgshsc_core' ||
      type === 'water_condenser' ||
      type === 'solar_panel'
    );
  }

  public isPositionUnderThermalRoof(x: number, z: number): boolean {
    let covered = false;
    this.structures.forEach(({ item }) => {
      if (item.type === 'roof') {
        const dx = Math.abs(item.position[0] - x);
        const dz = Math.abs(item.position[2] - z);
        if (dx <= 2.25 && dz <= 2.25) {
          covered = true;
        }
      }
    });
    return covered;
  }

  public checkMachinesUnderThermalRoof(): boolean {
    let machineCount = 0;
    let shieldedCount = 0;
    this.structures.forEach(({ item }) => {
      if (this.isMachineType(item.type)) {
        machineCount++;
        if (this.isPositionUnderThermalRoof(item.position[0], item.position[2])) {
          shieldedCount++;
        }
      }
    });
    // True if no machines built yet or all built machines are under a Thermal Roof
    return machineCount === 0 || shieldedCount === machineCount;
  }

  private handleInteractKey() {
    if (this.hoveredNodeId) {
      this.performHarvestAction();
    } else if (this.hoveredStructureId) {
      const struct = this.structures.get(this.hoveredStructureId);
      if (!struct) return;

      const isMachine = this.isMachineType(struct.item.type);
      const isUnderRoof = this.isPositionUnderThermalRoof(
        struct.item.position[0],
        struct.item.position[2]
      );

      // If a Radiation Storm is active and this machine is NOT under a Thermal Roof, warn and block operation
      if (isMachine && this.currentWeather === 'radiation_storm' && !isUnderRoof) {
        sound.playDnaAlert();
        this.callbacks.onNotification(
          `${struct.item.type.replace('_', ' ').toUpperCase()} is exposed to the Radiation Storm! Build a Thermal Roof overhead so machines aren't affected!`,
          'warn'
        );
        return;
      }

      if (struct.item.type === 'rgshsc_core') {
        this.triggerCloningRestoration();
      } else if (struct.item.type === 'campfire') {
        this.vitals.dnaTemperature = Math.min(-15, this.vitals.dnaTemperature + 1);
        this.vitals.health = Math.min(100, this.vitals.health + 10);
        sound.playCraftComplete();
        this.callbacks.onNotification('Warmed near campfire. Health restored.', 'info');
      } else if (struct.item.type === 'water_condenser') {
        this.inventory.purifiedWater += 1;
        this.callbacks.onInventoryChange({ ...this.inventory });
        sound.playHarvest('water');
        this.callbacks.onNotification('Collected 1x Purified Water', 'info');
        this.callbacks.onWaterCollected?.();
      } else if (struct.item.type === 'nutrient_bioreactor') {
        this.inventory.biomass = (this.inventory.biomass || 0) + 2;
        this.callbacks.onInventoryChange({ ...this.inventory });
        sound.playHarvest('biomass');
        this.callbacks.onNotification('Cultivated +2x Biomass from Nutrient Bioreactor', 'success');
      } else if (struct.item.type === 'solar_panel') {
        this.inventory.scrapMetal = (this.inventory.scrapMetal || 0) + 1;
        this.inventory.quartzCrystal = (this.inventory.quartzCrystal || 0) + 1;
        this.callbacks.onInventoryChange({ ...this.inventory });
        sound.playHarvest('quartzCrystal');
        this.callbacks.onNotification('Synthesized +1x Scrap Metal & +1x Quartz Crystal via Solar Resonance', 'success');
      }
    }
  }

  private biomassSpawnTickTimer: number = 0;

  private spawnRandomBiomassNode(notifyIfNearby: boolean = false): [number, number, number] {
    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 54; // Random radius between 10m and 64m across the map
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const y = this.groundHeightAt(x, z);

    const mesh = createBiomassFloraNode();
    mesh.position.set(x, y, z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(mesh);

    const id = `biomass_wild_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const node: ResourceNode = {
      id,
      type: 'biomass',
      position: [x, y, z],
      scale: [1, 1, 1],
      health: 70,
      maxHealth: 70,
      yields: { resource: 'biomass', amount: 3 },
      depleted: false,
    };
    mesh.userData = { id, type: 'biomass', isResource: true };
    this.resourceNodes.set(id, { node, mesh });

    if (notifyIfNearby) {
      this.callbacks.onNotification(
        `Wild Biomass Flora randomly generated on the map at (${Math.round(x)}m, ${Math.round(z)}m)!`,
        'success'
      );
    }
    return [x, y, z];
  }

  private getRegenDurationForType(type: ResourceType): number {
    switch (type) {
      case 'quartzCrystal':
        return 28; // 28s crystal lattice reformation
      case 'scrapMetal':
        return 32; // 32s subsurface salvage surfacing
      case 'wood':
        return 1800; // 30 minutes (1800s) natural wood regeneration
      default:
        return 30;
    }
  }

  private formatRegenTime(seconds: number): string {
    const s = Math.max(0, Math.ceil(seconds));
    if (s >= 60) {
      const mins = Math.floor(s / 60);
      const remSecs = s % 60;
      return remSecs > 0 ? `${mins}m ${remSecs}s` : `${mins}m`;
    }
    return `${s}s`;
  }

  private initWeatherParticles() {
    // 1. Rain Streak LineSegments (600 droplets in a local 44x24x44m box following the player)
    const rainCount = 600;
    const rainPositions = new Float32Array(rainCount * 6);
    for (let i = 0; i < rainCount; i++) {
      const rx = (Math.random() - 0.5) * 44;
      const ry = Math.random() * 24;
      const rz = (Math.random() - 0.5) * 44;
      const idx = i * 6;
      rainPositions[idx] = rx;
      rainPositions[idx + 1] = ry;
      rainPositions[idx + 2] = rz;
      rainPositions[idx + 3] = rx - 0.12;
      rainPositions[idx + 4] = ry - 0.85;
      rainPositions[idx + 5] = rz - 0.08;
    }
    const rainGeom = new THREE.BufferGeometry();
    rainGeom.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.LineBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.58,
    });
    this.rainLines = new THREE.LineSegments(rainGeom, rainMat);
    this.rainLines.visible = false;
    this.rainLines.frustumCulled = false;
    this.scene.add(this.rainLines);

    // 2. Radiation Storm Fallout Spores / Ash (550 glowing toxic particles swirling around the player)
    const radCount = 550;
    const radPositions = new Float32Array(radCount * 3);
    for (let i = 0; i < radCount; i++) {
      radPositions[i * 3] = (Math.random() - 0.5) * 48;
      radPositions[i * 3 + 1] = Math.random() * 20;
      radPositions[i * 3 + 2] = (Math.random() - 0.5) * 48;
    }
    const radGeom = new THREE.BufferGeometry();
    radGeom.setAttribute('position', new THREE.BufferAttribute(radPositions, 3));
    const radMat = new THREE.PointsMaterial({
      color: 0xa3e635,
      size: 0.18,
      transparent: true,
      opacity: 0.78,
    });
    this.radStormPoints = new THREE.Points(radGeom, radMat);
    this.radStormPoints.visible = false;
    this.radStormPoints.frustumCulled = false;
    this.scene.add(this.radStormPoints);
  }

  public checkPlayerSheltered(): boolean {
    // Player is completely sheltered when standing under a Thermal Roof
    return this.isPositionUnderThermalRoof(this.playerPos.x, this.playerPos.z);
  }

  public getHarvestSpeedMultiplier(): number {
    // If the player is under a Thermal Roof, they are completely unaffected by weather!
    if (this.isSheltered) {
      return 1.0;
    }
    if (this.currentWeather === 'rain') {
      // Rain cools the multi-tool plasma emitter and softens flora/salvage (+25% harvesting speed)
      return 1.25;
    }
    if (this.currentWeather === 'radiation_storm') {
      // Ionizing radiation storm interferes with multi-tool beam (-40% harvesting speed when exposed)
      return 0.6;
    }
    return 1.0;
  }

  public setWeather(weather: WeatherType, durationSecs: number = 50, notify: boolean = true) {
    this.currentWeather = weather;
    this.weatherTimer = durationSecs;
    this.isSheltered = this.checkPlayerSheltered();
    this.areMachinesSheltered = this.checkMachinesUnderThermalRoof();

    if (this.rainLines) {
      this.rainLines.visible = weather === 'rain';
    }
    if (this.radStormPoints) {
      this.radStormPoints.visible = weather === 'radiation_storm';
    }

    // Update terrain wet/dry surface roughness
    if (this.terrainMesh && this.terrainMesh.material instanceof THREE.MeshStandardMaterial) {
      if (weather === 'rain') {
        this.terrainMesh.material.roughness = 0.42;
        this.terrainMesh.material.metalness = 0.28;
      } else {
        this.terrainMesh.material.roughness = 0.82;
        this.terrainMesh.material.metalness = 0.12;
      }
    }

    this.applyDayNightAtmosphere();
    this.emitWeatherTelemetry();

    if (notify) {
      if (weather === 'clear') {
        this.callbacks.onNotification(
          'Weather Cleared: Skies stable (100% Harvest Speed, 0 Weather Hazard)',
          'info'
        );
      } else if (weather === 'rain') {
        this.callbacks.onNotification(
          'Biosphere Rainshower: +25% Harvest Speed (125%), Hydration replenishing, 1.5x Sapling growth!',
          'success'
        );
      } else if (weather === 'radiation_storm') {
        sound.playDnaAlert();
        this.callbacks.onNotification(
          'WARNING — Radiation Storm! Stand under a Thermal Roof & cover machines with Thermal Roofs to stay unaffected!',
          'warn'
        );
      }
    }
  }

  public cycleWeather(): WeatherType {
    const order: WeatherType[] = ['clear', 'rain', 'radiation_storm'];
    const nextIdx = (order.indexOf(this.currentWeather) + 1) % order.length;
    const next = order[nextIdx];
    this.setWeather(next, 55, true);
    this.callbacks.onWeatherBroadcast?.(next);
    return next;
  }

  private emitWeatherTelemetry() {
    this.callbacks.onWeatherChange?.({
      weather: this.currentWeather,
      harvestSpeedMultiplier: this.getHarvestSpeedMultiplier(),
      isSheltered: this.isSheltered,
      areMachinesSheltered: this.areMachinesSheltered,
      timeRemaining: Math.ceil(this.weatherTimer),
    });
  }

  private performHarvestAction() {
    if (this.equippedItem === 'tablet') {
      this.callbacks.onNotification('Switch to Pickaxe [1 / Q] to harvest resources!', 'info');
      return;
    }
    if (!this.hoveredNodeId) return;
    const targetId = this.hoveredNodeId;
    const entry = this.resourceNodes.get(targetId);
    if (!entry) return;

    if (entry.node.depleted) {
      const remaining = entry.node.respawnTimer || 0;
      const isSapling = Boolean(entry.mesh.userData?.isGrowingSapling);
      this.callbacks.onNotification(
        isSapling
          ? `Planted Sapling is still growing (${this.formatRegenTime(remaining)} remaining)...`
          : `${entry.node.type.toUpperCase()} node is regenerating (${this.formatRegenTime(remaining)} remaining)...`,
        'info'
      );
      return;
    }

    const harvestMult = this.getHarvestSpeedMultiplier();
    const harvestDamage = Math.max(10, Math.round(35 * harvestMult));
    const swingDurationMs = Math.round(95 / harvestMult);

    // Pickaxe downward chopping swing animation (scales with weather harvest speed)
    if (this.fpToolGroup) {
      this.fpToolGroup.rotation.x = -0.75; // chop downward
      this.fpToolGroup.position.set(0.28, -0.38, -0.45);
      setTimeout(() => {
        if (this.fpToolGroup) {
          this.fpToolGroup.rotation.set(-0.2, 0.15, -0.08);
          this.fpToolGroup.position.set(0.34, -0.32, -0.52);
        }
      }, swingDurationMs);
    }

    // Damage node scaled by current weather's harvestSpeedMultiplier
    entry.node.health -= harvestDamage;
    this.localHarvestActionTimer = 0.25;
    this.cameraShake = 0.04;
    this.hitstopTimer = 0.04;
    sound.playHarvest(entry.node.type);

    if (entry.node.health <= 0) {
      const yieldRes = entry.node.yields.resource;
      const yieldAmt = entry.node.yields.amount;
      this.inventory[yieldRes] = (this.inventory[yieldRes] || 0) + yieldAmt;
      this.callbacks.onResourceHarvested?.(targetId);

      if (entry.node.type === 'biomass') {
        // Biomass has NO in-place regeneration: permanently remove this node
        this.scene.remove(entry.mesh);
        this.resourceNodes.delete(targetId);
        this.hoveredNodeId = null;

        // Spawn a new Biomass node at a random position on the map
        const [rx, , rz] = this.spawnRandomBiomassNode(false);

        // 10% chance to generate an extra bonus Biomass cluster on the map
        if (Math.random() < 0.1) {
          this.spawnRandomBiomassNode(true);
        }

        this.callbacks.onInventoryChange({ ...this.inventory });
        this.callbacks.onNotification(
          `Gathered ${yieldAmt}x biomass (No regen — new Biomass spawned randomly at ${Math.round(rx)}m, ${Math.round(rz)}m)`,
          'info'
        );
        return;
      }

      const regenSecs = this.getRegenDurationForType(entry.node.type);
      entry.node.depleted = true;
      entry.node.health = 0;
      entry.node.respawnDuration = regenSecs;
      entry.node.respawnTimer = regenSecs;
      entry.mesh.userData.isGrowingSapling = false;

      // Shrink mesh to a regrowing sprout/crystal/salvage stub in the 3D scene instead of deleting forever
      entry.mesh.scale.set(0.18, 0.18, 0.18);

      // If the player felled a tree ('wood'), recover 2 seeds and trigger the Reforestation Mandate (2 seeds per tree cut)
      if (entry.node.type === 'wood') {
        this.inventory.treeSeeds = (this.inventory.treeSeeds || 0) + 2;
        this.callbacks.onTreeCut?.();

        // 10% chance for felled tree to also generate Biomass spores
        if (Math.random() < 0.1) {
          this.inventory.biomass = (this.inventory.biomass || 0) + 1;
          this.spawnRandomBiomassNode(true);
        }
      }

      // Rare chance for naniteCircuit from scrap or quartz
      if (Math.random() < 0.4 && (yieldRes === 'scrapMetal' || yieldRes === 'quartzCrystal')) {
        this.inventory.naniteCircuit = (this.inventory.naniteCircuit || 0) + 1;
        this.callbacks.onNotification(`Salvaged rare Nanite Circuit!`, 'success');
      }

      this.callbacks.onInventoryChange({ ...this.inventory });
      this.callbacks.onNotification(
        entry.node.type === 'wood'
          ? `Gathered ${yieldAmt}x wood (Natural stump regrows in 30m — plant seeds [R] to grow in 30s!)`
          : `Gathered ${yieldAmt}x ${yieldRes} (Node regenerates in ${this.formatRegenTime(regenSecs)})`,
        'info'
      );
    }
  }

  private updatePlayerMovement(dt: number) {
    if (!this.isPlaying || this.isPaused) return;

    const moveSpeed = this.keysHeld.has('ShiftLeft') || this.keysHeld.has('ShiftRight') ? 8.5 : 5.0;
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerYaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerYaw);

    const moveDir = new THREE.Vector3();
    if (this.keysHeld.has('KeyW')) moveDir.add(forward);
    if (this.keysHeld.has('KeyS')) moveDir.sub(forward);
    if (this.keysHeld.has('KeyD')) moveDir.add(right);
    if (this.keysHeld.has('KeyA')) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      this.playerPos.addScaledVector(moveDir, moveSpeed * dt);

      // Footsteps
      this.headBobTimer += dt * (moveSpeed > 6 ? 12 : 8);
      if (Math.sin(this.headBobTimer) > 0.95) {
        sound.playFootstep();
      }
    }

    // Jump / Gravity
    const groundY = this.groundHeightAt(this.playerPos.x, this.playerPos.z) + 1.65;
    if (this.isGrounded && this.keysHeld.has('Space')) {
      this.playerVelocity.y = 5.8;
      this.isGrounded = false;
    }

    if (!this.isGrounded) {
      this.playerVelocity.y -= 19.62 * dt;
      this.playerPos.y += this.playerVelocity.y * dt;
      if (this.playerPos.y <= groundY) {
        this.playerPos.y = groundY;
        this.playerVelocity.y = 0;
        this.isGrounded = true;
      }
    } else {
      this.playerPos.y = groundY;
    }

    // Clamp to world radius
    const maxRadius = 72;
    const distSq = this.playerPos.x * this.playerPos.x + this.playerPos.z * this.playerPos.z;
    if (distSq > maxRadius * maxRadius) {
      const angle = Math.atan2(this.playerPos.z, this.playerPos.x);
      this.playerPos.x = Math.cos(angle) * maxRadius;
      this.playerPos.z = Math.sin(angle) * maxRadius;
    }

    // Apply Headbob
    const bobOffset = Math.sin(this.headBobTimer) * 0.04;
    this.camera.position.set(
      this.playerPos.x,
      this.playerPos.y + (this.isGrounded ? bobOffset : 0),
      this.playerPos.z
    );

    // Apply Camera Rotation in strict YXZ order (Yaw around world Y first, local Pitch around X, zero roll)
    this.camera.up.set(0, 1, 0);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.playerPitch, this.playerYaw, 0, 'YXZ');

    // Camera Shake
    if (this.cameraShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = Math.max(0, this.cameraShake - dt * 0.25);
    }

    // Ghost mesh snapping (Always uses FOUNDATION_GRID_SIZE = 3.0m, and snaps Walls strictly to Foundation Deck edges)
    if (this.buildModeType && this.ghostMesh) {
      const lookDir = new THREE.Vector3(0, 0, -1).applyEuler(this.camera.rotation);
      const aimDist = 4.2;
      const aimPoint = this.camera.position.clone().add(lookDir.multiplyScalar(aimDist));
      const flatTarget = this.playerPos.clone().add(forward.clone().multiplyScalar(4.0));

      const grid = FOUNDATION_GRID_SIZE; // 3.0m — exact size of Foundation Deck
      const halfDeck = grid * 0.5;       // 1.5m
      const deckTopOffset = 0.25;

      // Collect all placed foundation decks & walls
      const foundations: StructureItem[] = [];
      const walls: StructureItem[] = [];
      this.structures.forEach(({ item }) => {
        if (item.type === 'foundation') foundations.push(item);
        else if (item.type === 'wall') walls.push(item);
      });

      if (this.buildModeType === 'wall') {
        // Walls can ONLY attach to the 4 perimeter edges of placed Foundation Decks
        let bestEdge: { x: number; y: number; z: number; rot: number; distSq: number } | null = null;

        for (const f of foundations) {
          const [fx, fy, fz] = f.position;
          const edgeY = fy + deckTopOffset;
          const candidateEdges = [
            { x: fx, y: edgeY, z: fz - halfDeck, rot: 0 },               // North edge
            { x: fx, y: edgeY, z: fz + halfDeck, rot: 0 },               // South edge
            { x: fx + halfDeck, y: edgeY, z: fz, rot: Math.PI / 2 },     // East edge
            { x: fx - halfDeck, y: edgeY, z: fz, rot: Math.PI / 2 },     // West edge
          ];

          for (const edge of candidateEdges) {
            // Skip if a wall is already built on this exact edge
            const alreadyHasWall = walls.some(
              (w) => Math.hypot(w.position[0] - edge.x, w.position[2] - edge.z) < 0.35
            );
            if (alreadyHasWall) continue;

            const dx = edge.x - aimPoint.x;
            const dz = edge.z - aimPoint.z;
            const distSq = dx * dx + dz * dz;

            // Must be within reasonable build reach (9m from aim point)
            if (distSq <= 81 && (!bestEdge || distSq < bestEdge.distSq)) {
              bestEdge = { ...edge, distSq };
            }
          }
        }

        if (bestEdge) {
          this.ghostMesh.position.set(bestEdge.x, bestEdge.y, bestEdge.z);
          this.ghostMesh.rotation.y = bestEdge.rot;
          this.isGhostPlacementValid = true;
          this.ghostInvalidReason = '';
          this.setGhostValidityColor(true);
        } else {
          // No valid foundation edge nearby: show red invalid preview
          const fallbackX = Math.round(flatTarget.x / grid) * grid;
          const fallbackZ = Math.round(flatTarget.z / grid) * grid;
          const fallbackY = this.groundHeightAt(fallbackX, fallbackZ);
          this.ghostMesh.position.set(fallbackX, fallbackY, fallbackZ);
          this.ghostMesh.rotation.y = Math.round(this.playerYaw / (Math.PI / 2)) * (Math.PI / 2);
          this.isGhostPlacementValid = false;
          this.ghostInvalidReason =
            foundations.length === 0
              ? 'Place a Foundation Deck first! Reinforced Walls attach to Foundation Deck edges.'
              : 'Aim at an open Foundation Deck edge to attach a Reinforced Wall.';
          this.setGhostValidityColor(false);
        }
      } else if (this.buildModeType === 'foundation') {
        // Snap strictly to the 3.0m x 3.0m Foundation Deck grid
        const snappedX = Math.round(flatTarget.x / grid) * grid;
        const snappedZ = Math.round(flatTarget.z / grid) * grid;

        // Check if a foundation already occupies this exact 3x3m cell
        const cellOccupied = foundations.some(
          (f) => Math.hypot(f.position[0] - snappedX, f.position[2] - snappedZ) < 0.5
        );

        // If snapping next to an existing adjacent foundation (distance === 3.0m), match its Y level so multi-deck floors are flat!
        let snappedY = this.groundHeightAt(snappedX, snappedZ);
        const adjacentFoundation = foundations.find((f) => {
          const dist = Math.hypot(f.position[0] - snappedX, f.position[2] - snappedZ);
          return Math.abs(dist - grid) < 0.4;
        });
        if (adjacentFoundation) {
          snappedY = Math.max(snappedY, adjacentFoundation.position[1]);
        }

        this.ghostMesh.position.set(snappedX, snappedY, snappedZ);
        this.ghostMesh.rotation.y = 0;
        this.isGhostPlacementValid = !cellOccupied;
        this.ghostInvalidReason = cellOccupied ? 'A Foundation Deck is already placed on this grid tile!' : '';
        this.setGhostValidityColor(!cellOccupied);
      } else {
        // Roofs, Solar Generators, Water Condensers, Campfires, and Cloner Tiers snap to the 3.0m Foundation Deck grid
        const snappedX = Math.round(flatTarget.x / grid) * grid;
        const snappedZ = Math.round(flatTarget.z / grid) * grid;

        // If there is a Foundation Deck at this grid cell, place cleanly atop the deck surface (fy + 0.25)
        const matchingFoundation = foundations.find(
          (f) => Math.hypot(f.position[0] - snappedX, f.position[2] - snappedZ) < 0.6
        );
        const snappedY = matchingFoundation
          ? matchingFoundation.position[1] + deckTopOffset
          : this.groundHeightAt(snappedX, snappedZ);

        this.ghostMesh.position.set(snappedX, snappedY, snappedZ);
        this.ghostMesh.rotation.y = Math.round(this.playerYaw / (Math.PI / 2)) * (Math.PI / 2);
        this.isGhostPlacementValid = true;
        this.ghostInvalidReason = '';
        this.setGhostValidityColor(true);
      }
    }
  }


  private updateRaycastTarget() {
    if (!this.isPlaying) return;

    this.raycaster.setFromCamera(this.centerCoord, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    let foundTarget: string | null = null;
    this.hoveredNodeId = null;
    this.hoveredStructureId = null;

    for (const hit of intersects) {
      if (hit.distance > 5.5) break;

      // Check for resource nodes
      let obj: THREE.Object3D | null = hit.object;
      while (obj && obj !== this.scene) {
        if (obj.userData?.isResource) {
          this.hoveredNodeId = obj.userData.id;
          const entry = this.resourceNodes.get(obj.userData.id);
          if (entry) {
            if (entry.node.depleted) {
              const dur = entry.node.respawnDuration || 30;
              const rem = Math.max(0, entry.node.respawnTimer || 0);
              const pct = Math.min(99, Math.round(((dur - rem) / dur) * 100));
              const isSapling = Boolean(entry.mesh.userData?.isGrowingSapling);
              foundTarget = isSapling
                ? `Growing PLANTED SAPLING — ${pct}% (${this.formatRegenTime(rem)} left)`
                : `Regenerating ${entry.node.type.toUpperCase()} — ${pct}% (${this.formatRegenTime(rem)} left)`;
            } else {
              const speedPct = Math.round(this.getHarvestSpeedMultiplier() * 100);
              const speedTag =
                speedPct !== 100 ? ` · ${speedPct}% Weather Speed` : '';
              foundTarget = `[Left-Click / E] Harvest ${entry.node.type.toUpperCase()} (${Math.max(0, entry.node.health)}/${entry.node.maxHealth} HP${speedTag})`;
            }
          }
          break;
        } else if (obj.userData?.isStructure) {
          this.hoveredStructureId = obj.userData.id;
          const sType = obj.userData.type as StructureType;
          const structEntry = this.structures.get(obj.userData.id);
          const isShielded = structEntry
            ? this.isPositionUnderThermalRoof(structEntry.item.position[0], structEntry.item.position[2])
            : false;
          const shieldBadge = this.isMachineType(sType)
            ? isShielded
              ? ' [SHIELDED BY THERMAL ROOF ✓]'
              : this.currentWeather === 'radiation_storm'
              ? ' [EXPOSED TO RAD STORM — ADD THERMAL ROOF!]'
              : ' [UNROOFED]'
            : '';

          if (sType === 'rgshsc_core') {
            foundTarget = `[E] Examine RGSHSC Cloner (Stage ${this.clonerStage}/4)${shieldBadge}`;
          } else if (sType === 'campfire') {
            foundTarget = `[E] Warm Self & Protect DNA at Campfire`;
          } else if (sType === 'water_condenser') {
            foundTarget = `[E] Gather Purified Water${shieldBadge}`;
          } else if (sType === 'nutrient_bioreactor') {
            foundTarget = `[E] Cultivate +2x Biomass at Nutrient Bioreactor${shieldBadge}`;
          } else if (sType === 'solar_panel') {
            foundTarget = `[E] Synthesize +1x Scrap Metal & +1x Quartz Crystal${shieldBadge}`;
          } else {
            foundTarget = `[E] Examine ${sType.replace('_', ' ').toUpperCase()}${shieldBadge}`;
          }
          break;
        }
        obj = obj.parent;
      }
      if (foundTarget) break;
    }

    this.callbacks.onHoverTargetChange(foundTarget);
  }

  private updateWeatherParticles(dt: number) {
    if (this.currentWeather === 'rain' && this.rainLines) {
      this.rainLines.position.set(this.playerPos.x, this.playerPos.y - 4, this.playerPos.z);
      const posAttr = this.rainLines.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const fallStep = 22.0 * dt;
      for (let i = 0; i < arr.length; i += 6) {
        arr[i + 1] -= fallStep;
        arr[i + 4] -= fallStep;
        const wx = this.playerPos.x + arr[i];
        const wz = this.playerPos.z + arr[i + 2];
        const wy = this.playerPos.y - 4 + arr[i + 4];
        // Block raindrops from falling underneath any placed Thermal Roof (roof canopy at y ~ ground + 2.6m)
        const hitRoof =
          wy < this.playerPos.y + 1.2 && this.isPositionUnderThermalRoof(wx, wz);
        if (arr[i + 1] < 0 || hitRoof) {
          const resetY = 22 + Math.random() * 2;
          arr[i + 1] = resetY;
          arr[i + 4] = resetY - 0.85;
        }
      }
      posAttr.needsUpdate = true;
    } else if (this.currentWeather === 'radiation_storm' && this.radStormPoints) {
      this.radStormPoints.position.set(this.playerPos.x, this.playerPos.y - 3, this.playerPos.z);
      const posAttr = this.radStormPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const windX = 5.5 * dt;
      const sinkY = 2.6 * dt;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] += windX;
        arr[i + 1] -= sinkY;
        const wx = this.playerPos.x + arr[i];
        const wz = this.playerPos.z + arr[i + 2];
        const wy = this.playerPos.y - 3 + arr[i + 1];
        // Block radiation fallout spores from entering underneath a Thermal Roof
        const hitRoof =
          wy < this.playerPos.y + 1.2 && this.isPositionUnderThermalRoof(wx, wz);
        if (arr[i] > 24) arr[i] = -24;
        if (arr[i + 1] < 0 || hitRoof) arr[i + 1] = 20;
      }
      posAttr.needsUpdate = true;
    }
  }

  private updateResourceRegeneration(dt: number) {
    // Periodic 10% chance wild Biomass generation check every 5 seconds
    this.biomassSpawnTickTimer += dt;
    if (this.biomassSpawnTickTimer >= 5.0) {
      this.biomassSpawnTickTimer = 0;
      let activeBiomassCount = 0;
      this.resourceNodes.forEach((e) => {
        if (e.node.type === 'biomass' && !e.node.depleted) activeBiomassCount++;
      });
      // 10% chance to spawn a new wild Biomass node at a random map position (up to cap of 24)
      if (activeBiomassCount < 24 && Math.random() < 0.1) {
        this.spawnRandomBiomassNode(true);
      }
    }

    // Rain accelerates sapling and resource regrowth by 1.5x
    const regenDt = this.currentWeather === 'rain' ? dt * 1.5 : dt;

    this.resourceNodes.forEach((entry, id) => {
      if (!entry.node.depleted) return;

      const dur = entry.node.respawnDuration || 30;
      const nextTimer = (entry.node.respawnTimer ?? dur) - regenDt;
      const isSapling = Boolean(entry.mesh.userData?.isGrowingSapling);

      if (nextTimer <= 0) {
        // Node has fully regenerated / sapling has matured!
        entry.node.depleted = false;
        entry.node.health = entry.node.maxHealth;
        entry.node.respawnTimer = 0;

        if (isSapling) {
          // Swap sapling mesh into a full-grown harvestable tree!
          const pos = entry.mesh.position.clone();
          const rotY = entry.mesh.rotation.y;
          this.scene.remove(entry.mesh);
          const matureTree = createMutatedTree();
          matureTree.position.copy(pos);
          matureTree.rotation.y = rotY;
          matureTree.userData = { id, type: 'wood', isResource: true, isGrowingSapling: false };
          this.scene.add(matureTree);
          entry.mesh = matureTree;
          this.callbacks.onNotification('Planted Tree Sapling matured into a harvestable tree!', 'success');
          return;
        }

        entry.mesh.scale.set(1, 1, 1);
        if (!entry.mesh.parent) {
          this.scene.add(entry.mesh);
        }

        // Notify player if they are reasonably close to the regenerated node
        const dx = entry.node.position[0] - this.playerPos.x;
        const dz = entry.node.position[2] - this.playerPos.z;
        if (dx * dx + dz * dz <= 35 * 35) {
          const label =
            entry.node.type === 'quartzCrystal'
              ? 'Quartz Crystal'
              : entry.node.type === 'scrapMetal'
              ? 'Scrap Metal'
              : 'Mutated Tree';
          this.callbacks.onNotification(`${label} node regenerated nearby!`, 'success');
        }
      } else {
        entry.node.respawnTimer = nextTimer;
        const progress = Math.max(0, Math.min(1, (dur - nextTimer) / dur));
        if (isSapling) {
          // Smoothly grow planted sapling from 0.35 to 1.0 over 30 seconds
          const saplingScale = 0.35 + progress * 0.65;
          entry.mesh.scale.set(saplingScale, saplingScale, saplingScale);
        } else {
          // Smoothly grow resource stub from 0.18 to 0.55 while regenerating
          const regrowScale = 0.18 + progress * 0.37;
          entry.mesh.scale.set(regrowScale, regrowScale, regrowScale);
        }
      }
    });
  }

  private updateSurvivalSimulation(dt: number) {
    if (!this.isPlaying || this.isPaused) return;

    this.gameTime += dt;
    this.updateResourceRegeneration(dt);

    // 1. Dynamic Weather Progression & Thermal Roof Shelter Check (Player + Machines)
    const prevSheltered = this.isSheltered;
    const prevMachinesSheltered = this.areMachinesSheltered;
    this.isSheltered = this.checkPlayerSheltered();
    this.areMachinesSheltered = this.checkMachinesUnderThermalRoof();
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      // Automatically cycle weather: Clear -> Rain -> Radiation Storm -> Clear
      const order: WeatherType[] = ['clear', 'rain', 'radiation_storm'];
      const nextWeather = order[(order.indexOf(this.currentWeather) + 1) % order.length];
      const nextDur = nextWeather === 'radiation_storm' ? 40 : 55;
      this.setWeather(nextWeather, nextDur, true);
    } else {
      const wholeSec = Math.floor(this.gameTime);
      if (
        wholeSec !== this.lastWeatherNotifySec ||
        prevSheltered !== this.isSheltered ||
        prevMachinesSheltered !== this.areMachinesSheltered
      ) {
        this.lastWeatherNotifySec = wholeSec;
        this.emitWeatherTelemetry();
      }
    }

    // 2. Weather Impact on Player & Machines (Completely unaffected when under a Thermal Roof!)
    if (this.currentWeather === 'rain') {
      if (!this.isSheltered) {
        // Exposed to Rain: replenishes Hydration and gently cleanses surface radiation
        this.vitals.hydration = Math.min(100, this.vitals.hydration + dt * 0.45);
        this.vitals.radiationExposure = Math.max(2, this.vitals.radiationExposure - dt * 0.3);
      }
    } else if (this.currentWeather === 'radiation_storm') {
      // A) Player check: only affected if NOT under a Thermal Roof
      if (!this.isSheltered) {
        this.vitals.health = Math.max(0, this.vitals.health - dt * 1.35);
        this.vitals.radiationExposure = Math.min(100, this.vitals.radiationExposure + dt * 1.8);

        const nowSec = Math.floor(this.gameTime);
        if (nowSec % 12 === 0 && nowSec !== this.lastRadStormWarnSec) {
          this.lastRadStormWarnSec = nowSec;
          sound.playDnaAlert();
          this.callbacks.onNotification(
            'RADIATION STORM: Stand under a Thermal Roof so you are not affected!',
            'warn'
          );
        }
      } else {
        // Player is under a Thermal Roof: completely unaffected by the storm!
        this.vitals.radiationExposure = Math.max(5, this.vitals.radiationExposure - dt * 0.5);
      }

      // B) Machines check: if Cloner machines are built but NOT under a Thermal Roof, storm affects DNA stability;
      // if under a Thermal Roof, machines are 100% unaffected!
      if (!this.areMachinesSheltered) {
        this.vitals.dnaTemperature = Math.min(24, this.vitals.dnaTemperature + dt * 0.25);
        this.vitals.dnaIntegrity = Math.max(0, this.vitals.dnaIntegrity - dt * 0.2);
      }
    } else {
      // Clear weather: radiation slowly normalizes toward baseline 5%
      this.vitals.radiationExposure = Math.max(5, this.vitals.radiationExposure - dt * 0.2);
    }

    // 3. Hunger & Hydration gradual burn
    this.vitals.hunger = Math.max(0, this.vitals.hunger - dt * 0.1);
    this.vitals.hydration = Math.max(0, this.vitals.hydration - dt * 0.15);

    // If starving or dehydrated, health drops
    if (this.vitals.hunger === 0 || this.vitals.hydration === 0) {
      this.vitals.health = Math.max(0, this.vitals.health - dt * 0.5);
    }

    // 4. DNA Sample Stability Mechanics:
    // If no cryo-stasis chamber (Tier 1), temperature warms and DNA decays!
    if (this.clonerStage < 1) {
      this.vitals.dnaTemperature = Math.min(22, this.vitals.dnaTemperature + dt * 0.08);
      if (this.vitals.dnaTemperature > 0) {
        this.vitals.dnaIntegrity = Math.max(0, this.vitals.dnaIntegrity - dt * 0.25);
      }
    } else if (this.currentWeather !== 'radiation_storm' || this.areMachinesSheltered) {
      // Locked in stasis at optimal -18°C when Cryo-Stasis Chamber is shielded by a Thermal Roof (or not in a Rad Storm)!
      this.vitals.dnaTemperature = -18;
    }

    // Alert if DNA is critically damaged
    if (this.vitals.dnaIntegrity < 30 && Math.floor(this.gameTime) % 15 === 0) {
      sound.playDnaAlert();
      this.callbacks.onNotification('CRITICAL: DNA Sample degradation accelerating! Build Cryo Pod!', 'warn');
    }

    // Check for Extinction of Humanity (Health reaches 0 or DNA Sample reaches 0)
    if (!this.isExtinct && (this.vitals.health <= 0 || this.vitals.dnaIntegrity <= 0)) {
      this.vitals.health = Math.max(0, this.vitals.health);
      this.vitals.dnaIntegrity = Math.max(0, this.vitals.dnaIntegrity);
      this.isExtinct = true;
      this.isPaused = true;
      this.cancelBuildMode(false);
      this.unlockPointer();
      sound.playExtinctionDirge();
      this.callbacks.onVitalsChange({ ...this.vitals });
      this.callbacks.onHumanityExtinct?.(this.vitals.health <= 0 ? 'health' : 'dna');
      return;
    }

    this.callbacks.onVitalsChange({ ...this.vitals });
  }

  private onResize = () => {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public getPhaseLabel(hour: number = this.timeOfDay): string {
    if (hour >= 5.5 && hour < 7.5) return 'Dawn';
    if (hour >= 7.5 && hour < 17.5) return 'Daylight';
    if (hour >= 17.5 && hour < 19.8) return 'Sunset';
    return 'Night';
  }

  public setTimeOfDay(hour: number) {
    this.timeOfDay = ((hour % 24) + 24) % 24;
    this.lastReportedMinute = -1;
    this.applyDayNightAtmosphere();
  }

  public cycleTimePreset() {
    // Cycles: Morning (10:00) -> High Noon (13:30) -> Sunset (18:15) -> Starlight Night (23:00)
    if (this.timeOfDay >= 6 && this.timeOfDay < 12) {
      this.setTimeOfDay(13.5);
      this.callbacks.onNotification('Solar Zenith: High Noon (13:30)', 'info');
    } else if (this.timeOfDay >= 12 && this.timeOfDay < 17.2) {
      this.setTimeOfDay(18.25);
      this.callbacks.onNotification('Dusk Approaching: Sunset (18:15)', 'info');
    } else if (this.timeOfDay >= 17.2 && this.timeOfDay < 20.5) {
      this.setTimeOfDay(23.0);
      this.callbacks.onNotification('Nightfall: Bioluminescent Sector (23:00)', 'info');
    } else {
      this.setTimeOfDay(10.0);
      this.callbacks.onNotification('Daybreak: Clear Morning Daylight (10:00)', 'info');
    }
  }

  public toggleAutoDayNight(): boolean {
    this.isAutoDayNight = !this.isAutoDayNight;
    this.lastReportedMinute = -1;
    this.applyDayNightAtmosphere();
    return this.isAutoDayNight;
  }

  private applyDayNightAtmosphere() {
    // Sun angle: 0 at 6:00 AM, PI/2 at 12:00 PM (Noon), PI at 18:00 (6:00 PM), 3PI/2 at Midnight
    const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const sunElev = Math.sin(sunAngle); // -1 to +1
    const sunHoriz = Math.cos(sunAngle);

    const orbitRadius = 115;
    const sunX = sunHoriz * orbitRadius;
    const sunY = sunElev * orbitRadius;
    const sunZ = 32;

    if (this.sunOrbMesh) {
      this.sunOrbMesh.position.set(sunX, sunY, sunZ);
      this.sunOrbMesh.visible = sunY > -12;
    }
    if (this.moonOrbMesh) {
      this.moonOrbMesh.position.set(-sunX, -sunY, -sunZ);
      this.moonOrbMesh.visible = -sunY > -12;
    }

    // Determine sky color, fog density, and directional light
    let fogDensity = 0.0085;
    if (sunElev > 0.25) {
      // Full Daylight
      const t = Math.min(1, (sunElev - 0.25) / 0.75);
      this.colWorkSky.copy(this.colDawnDuskSky).lerp(this.colDaySky, Math.min(1, t * 1.4));
      this.colWorkLight.copy(this.colSunsetSun).lerp(this.colDaySun, Math.min(1, t * 1.4));
      if (this.sunLight) {
        this.sunLight.position.set(sunX * 0.6, Math.max(25, sunY * 0.7), 30);
        this.sunLight.color.copy(this.colWorkLight);
        this.sunLight.intensity = 1.7 + t * 0.85;
      }
      if (this.ambientLight) {
        this.ambientLight.color.setHex(0xe0f2fe);
        this.ambientLight.groundColor.setHex(0x334155);
        this.ambientLight.intensity = 0.95 + t * 0.3;
      }
      fogDensity = 0.0075;
    } else if (sunElev >= -0.15) {
      // Dawn or Sunset Golden Hour (-0.15 to +0.25)
      const band = (sunElev + 0.15) / 0.4; // 0 at night edge, 1 at day edge
      if (band < 0.5) {
        const sub = band * 2;
        this.colWorkSky.copy(this.colNightSky).lerp(this.colDawnDuskSky, sub);
        this.colWorkLight.copy(this.colNightMoon).lerp(this.colSunsetSun, sub);
      } else {
        const sub = (band - 0.5) * 2;
        this.colWorkSky.copy(this.colDawnDuskSky).lerp(this.colDaySky, sub * 0.5);
        this.colWorkLight.copy(this.colSunsetSun);
      }
      if (this.sunLight) {
        this.sunLight.position.set(sunX * 0.6, Math.max(14, Math.abs(sunY) * 0.5 + 12), 30);
        this.sunLight.color.copy(this.colWorkLight);
        this.sunLight.intensity = 0.9 + band * 1.0;
      }
      if (this.ambientLight) {
        this.ambientLight.color.setHex(0xfde68a);
        this.ambientLight.groundColor.setHex(0x1e293b);
        this.ambientLight.intensity = 0.7 + band * 0.3;
      }
      fogDensity = 0.01;
    } else {
      // Starlight / Bioluminescent Night (still well-lit by moon so player can see clearly)
      this.colWorkSky.copy(this.colNightSky);
      if (this.sunLight) {
        // Moon acts as directional shadow-caster at night
        this.sunLight.position.set(-sunX * 0.5, Math.max(25, -sunY * 0.6), -25);
        this.sunLight.color.copy(this.colNightMoon);
        this.sunLight.intensity = 0.85;
      }
      if (this.ambientLight) {
        this.ambientLight.color.setHex(0x38bdf8);
        this.ambientLight.groundColor.setHex(0x0f172a);
        this.ambientLight.intensity = 0.68;
      }
      fogDensity = 0.0125;
    }

    // Apply Weather Atmospheric Tint & Fog Density Overrides
    if (this.currentWeather === 'rain') {
      this.colWorkSky.lerp(this.colRainSky, 0.65);
      fogDensity += 0.0065;
      if (this.sunLight) {
        this.sunLight.intensity *= 0.6;
      }
    } else if (this.currentWeather === 'radiation_storm') {
      this.colWorkSky.lerp(this.colRadStormSky, 0.75);
      fogDensity += 0.0115;
      if (this.sunLight) {
        this.sunLight.color.lerp(this.colRadStormLight, 0.7);
        this.sunLight.intensity *= 0.72;
      }
      if (this.ambientLight) {
        this.ambientLight.color.setHex(0x84cc16);
      }
    }

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this.colWorkSky);
    } else {
      this.scene.background = this.colWorkSky.clone();
    }

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.colWorkSky);
      this.scene.fog.density = fogDensity;
    }

    // Notify HUD every 5 in-game minutes so React state doesn't thrash every frame
    const totalMinutes = Math.floor(this.timeOfDay * 60);
    if (Math.abs(totalMinutes - this.lastReportedMinute) >= 5) {
      this.lastReportedMinute = totalMinutes;
      this.callbacks.onTimeOfDayChange?.(
        this.timeOfDay,
        this.getPhaseLabel(this.timeOfDay),
        this.dayCount,
        this.isAutoDayNight
      );
    }
  }

  private updateDayNightCycle(dt: number) {
    if (this.isAutoDayNight && !this.isPaused) {
      // 1 full 24-hour cycle every 180 seconds (3 minutes) of real time
      this.timeOfDay += dt * (24 / 180);
      if (this.timeOfDay >= 24) {
        this.timeOfDay -= 24;
        this.dayCount += 1;
      }
    }
    this.applyDayNightAtmosphere();
  }

  private tick = () => {
    if (this.isDestroyed || !this.renderer) return;

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.frameId = requestAnimationFrame(this.tick);
      return;
    }

    this.updateDayNightCycle(dt);
    this.updateWeatherParticles(dt);

    // Title screen panoramic orbit when not playing
    if (!this.isPlaying) {
      if (this.fpToolGroup) this.fpToolGroup.visible = false;
      if (this.fpTabletGroup) this.fpTabletGroup.visible = false;
      const t = this.clock.getElapsedTime() * 0.12;
      this.camera.position.set(Math.cos(t) * 35, 14, Math.sin(t) * 35);
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(0, 3, 0);
    } else {
      this.updatePlayerMovement(dt);
      this.updateRaycastTarget();
      this.updateSurvivalSimulation(dt);
      this.updateRemoteAvatarsAnimation(dt);

      if (this.localHarvestActionTimer > 0) {
        this.localHarvestActionTimer = Math.max(0, this.localHarvestActionTimer - dt);
      }

      // Broadcast player movement at a steady 20 Hz (every 50ms)
      const now = performance.now();
      if (now - this.lastNetBroadcastTime >= 50) {
        this.lastNetBroadcastTime = now;
        const isMovingKeys =
          this.keysHeld.has('KeyW') ||
          this.keysHeld.has('KeyS') ||
          this.keysHeld.has('KeyA') ||
          this.keysHeld.has('KeyD');
        const currentAction =
          this.localHarvestActionTimer > 0 ? 'harvest' : isMovingKeys ? 'walk' : 'idle';
        this.callbacks.onLocalPlayerMove(
          [this.playerPos.x, this.playerPos.y, this.playerPos.z],
          [this.playerPitch, this.playerYaw],
          currentAction,
          this.vitals.health
        );
      }
    }

    // Animate rotating DNA double helix in cloner
    if (this.dnaHelixMesh) {
      this.dnaHelixMesh.rotation.y += dt * 0.8;
    }

    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.tick);
  };


  public unmount() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);

    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('blur', this.onWindowBlur);
    if (this.renderer?.domElement) {
      this.renderer.domElement.removeEventListener('mousedown', this.onCanvasMouseDown);
      this.renderer.domElement.removeEventListener('contextmenu', this.onContextMenu);
    }

    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
  }
}
