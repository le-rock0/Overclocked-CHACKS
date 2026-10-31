import * as THREE from 'three';
import { ModelSlotId, StructureType } from '../types/game';
import { customModelRegistry } from './customModelRegistry';

// Shared materials and procedural textures
function createGridTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 256, 256);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 32; i < 256; i += 32) {
    ctx.moveTo(i, 0); ctx.lineTo(i, 256);
    ctx.moveTo(0, i); ctx.lineTo(256, i);
  }
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createGroundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 512, 512);

  // Organic terrain stippling & rocky mineral earth
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const s = Math.random() * 3.5 + 1;
    const shade = Math.floor(Math.random() * 45 + 42);
    ctx.fillStyle = `rgb(${shade}, ${shade + 12}, ${shade + 24})`;
    ctx.fillRect(x, y, s, s);
  }

  // Ancient cryo-mineral streaks
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 512, Math.random() * 512);
    ctx.bezierCurveTo(
      Math.random() * 512, Math.random() * 512,
      Math.random() * 512, Math.random() * 512,
      Math.random() * 512, Math.random() * 512
    );
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const groundTexture = createGroundTexture();
export const techGridTexture = createGridTexture();

// 1. Mutated Ancient Tree (5 parts)
export function createMutatedTree(ignoreCustom: boolean = false): THREE.Group {
  if (!ignoreCustom) {
    const custom = customModelRegistry.createCustomInstance('wood');
    if (custom) {
      custom.userData = { type: 'tree' };
      return custom;
    }
  }
  const group = new THREE.Group();

  // Root base
  const rootsGeom = new THREE.CylinderGeometry(0.8, 1.2, 0.4, 7);
  const rootsMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.9, metalness: 0.1 });
  const roots = new THREE.Mesh(rootsGeom, rootsMat);
  roots.position.y = 0.2;
  roots.castShadow = true;
  group.add(roots);

  // Twisted Trunk
  const trunkGeom = new THREE.CylinderGeometry(0.4, 0.7, 3.5, 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.85, metalness: 0.1 });
  const trunk = new THREE.Mesh(trunkGeom, trunkMat);
  trunk.position.y = 1.95;
  trunk.rotation.z = 0.05;
  trunk.castShadow = true;
  group.add(trunk);

  // Lower Crystalline Canopy
  const foliage1Geom = new THREE.DodecahedronGeometry(1.4, 0);
  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x14532d,
    roughness: 0.6,
    metalness: 0.2,
    flatShading: true,
  });
  const foliage1 = new THREE.Mesh(foliage1Geom, foliageMat);
  foliage1.position.set(0, 3.8, 0);
  foliage1.castShadow = true;
  group.add(foliage1);

  // Upper Canopy
  const foliage2Geom = new THREE.DodecahedronGeometry(1.0, 0);
  const foliage2 = new THREE.Mesh(foliage2Geom, foliageMat);
  foliage2.position.set(0.1, 4.8, -0.1);
  foliage2.castShadow = true;
  group.add(foliage2);

  // Bioluminescent Spore Nodes (3 accents)
  const sporeGeom = new THREE.SphereGeometry(0.15, 6, 6);
  const sporeMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });
  const spore1 = new THREE.Mesh(sporeGeom, sporeMat);
  spore1.position.set(0.7, 3.7, 0.6);
  const spore2 = new THREE.Mesh(sporeGeom, sporeMat);
  spore2.position.set(-0.8, 4.1, -0.4);
  group.add(spore1, spore2);

  group.userData = { type: 'tree' };
  return group;
}

// 2. Quartz Crystal Mineral Outcrop (5 parts)
export function createQuartzCrystalNode(ignoreCustom: boolean = false): THREE.Group {
  if (!ignoreCustom) {
    const custom = customModelRegistry.createCustomInstance('quartzCrystal');
    if (custom) {
      custom.userData = { type: 'quartz' };
      return custom;
    }
  }
  const group = new THREE.Group();

  // Stone base pedestal
  const rockGeom = new THREE.DodecahedronGeometry(0.9, 1);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.2, flatShading: true });
  const rock = new THREE.Mesh(rockGeom, rockMat);
  rock.scale.set(1.4, 0.5, 1.4);
  rock.position.y = 0.25;
  rock.castShadow = true;
  group.add(rock);

  // Main Quartz Monolith
  const crystalGeom = new THREE.CylinderGeometry(0.05, 0.45, 2.2, 6);
  const crystalMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.5,
    roughness: 0.15,
    metalness: 0.1,
    transmission: 0.6,
    transparent: true,
    opacity: 0.9,
  });
  const mainCrystal = new THREE.Mesh(crystalGeom, crystalMat);
  mainCrystal.position.set(0, 1.1, 0);
  mainCrystal.rotation.z = -0.12;
  mainCrystal.rotation.x = 0.08;
  mainCrystal.castShadow = true;
  group.add(mainCrystal);

  // Satellite Crystals
  const smallCrystGeom = new THREE.CylinderGeometry(0.02, 0.25, 1.3, 5);
  const sat1 = new THREE.Mesh(smallCrystGeom, crystalMat);
  sat1.position.set(0.45, 0.6, 0.3);
  sat1.rotation.set(0.3, 0.4, 0.4);
  sat1.castShadow = true;

  const sat2 = new THREE.Mesh(smallCrystGeom, crystalMat);
  sat2.position.set(-0.4, 0.55, -0.25);
  sat2.rotation.set(-0.4, 0.2, -0.5);
  sat2.castShadow = true;

  const sat3 = new THREE.Mesh(smallCrystGeom, crystalMat);
  sat3.position.set(0.1, 0.45, -0.45);
  sat3.rotation.set(-0.35, -0.3, 0.2);
  sat3.castShadow = true;

  group.add(sat1, sat2, sat3);
  group.userData = { type: 'quartz' };
  return group;
}

// 3. Ancient Scrap Tech Wreckage (6 parts)
export function createScrapWreckageNode(ignoreCustom: boolean = false): THREE.Group {
  if (!ignoreCustom) {
    const custom = customModelRegistry.createCustomInstance('scrapMetal');
    if (custom) {
      custom.userData = { type: 'scrap' };
      return custom;
    }
  }
  const group = new THREE.Group();

  // Rust chassis hull
  const chassisGeom = new THREE.BoxGeometry(1.8, 0.4, 1.2);
  const rustMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9, metalness: 0.4 });
  const chassis = new THREE.Mesh(chassisGeom, rustMat);
  chassis.position.y = 0.2;
  chassis.rotation.y = 0.3;
  chassis.castShadow = true;
  group.add(chassis);

  // Twisted I-beam
  const beamGeom = new THREE.BoxGeometry(0.2, 1.8, 0.2);
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.8 });
  const beam = new THREE.Mesh(beamGeom, steelMat);
  beam.position.set(0.3, 0.9, 0.1);
  beam.rotation.set(0.2, 0.1, -0.4);
  beam.castShadow = true;
  group.add(beam);

  // Gear / Drive Spindle
  const gearGeom = new THREE.CylinderGeometry(0.45, 0.45, 0.2, 12);
  const gear = new THREE.Mesh(gearGeom, steelMat);
  gear.position.set(-0.4, 0.3, 0.2);
  gear.rotation.x = Math.PI / 2;
  gear.castShadow = true;
  group.add(gear);

  // Copper Wire Coil
  const coilGeom = new THREE.TorusGeometry(0.25, 0.08, 8, 16);
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.3, metalness: 0.85 });
  const coil = new THREE.Mesh(coilGeom, copperMat);
  coil.position.set(0.6, 0.35, -0.2);
  coil.rotation.y = 0.8;
  group.add(coil);

  // Solar Cell Fragment
  const solarGeom = new THREE.BoxGeometry(0.8, 0.04, 0.6);
  const solarMat = new THREE.MeshPhysicalMaterial({ color: 0x1e3a8a, roughness: 0.1, metalness: 0.9 });
  const solar = new THREE.Mesh(solarGeom, solarMat);
  solar.position.set(-0.2, 0.5, -0.3);
  solar.rotation.set(-0.4, 0.5, 0.2);
  group.add(solar);

  // Blinking Emergency Beacon (Accent)
  const beaconGeom = new THREE.SphereGeometry(0.08, 8, 8);
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.8 });
  const beacon = new THREE.Mesh(beaconGeom, beaconMat);
  beacon.position.set(0.3, 1.7, 0.1);
  group.add(beacon);

  group.userData = { type: 'scrap' };
  return group;
}

// 4. Biomass Flora Bush (4 parts)
export function createBiomassFloraNode(ignoreCustom: boolean = false): THREE.Group {
  if (!ignoreCustom) {
    const custom = customModelRegistry.createCustomInstance('biomass');
    if (custom) {
      custom.userData = { type: 'biomass' };
      return custom;
    }
  }
  const group = new THREE.Group();

  const stemMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x15803d,
    emissiveIntensity: 0.5,
    roughness: 0.3,
  });

  // Base moss mound
  const moundGeom = new THREE.SphereGeometry(0.7, 7, 5);
  const mound = new THREE.Mesh(moundGeom, stemMat);
  mound.scale.set(1.2, 0.4, 1.2);
  mound.position.y = 0.15;
  mound.castShadow = true;
  group.add(mound);

  // 3 spore bulbs
  const bulbGeom = new THREE.DodecahedronGeometry(0.35, 1);
  const b1 = new THREE.Mesh(bulbGeom, glowMat);
  b1.position.set(0.2, 0.6, 0.1);
  const b2 = new THREE.Mesh(bulbGeom, glowMat);
  b2.position.set(-0.3, 0.5, -0.2);
  const b3 = new THREE.Mesh(bulbGeom, glowMat);
  b3.position.set(0.05, 0.7, -0.25);

  group.add(b1, b2, b3);
  group.userData = { type: 'biomass' };
  return group;
}

// 5. Shelter Structure: Foundation (3.0m x 3.0m modular grid deck)
export const FOUNDATION_GRID_SIZE = 3.0;

export function createFoundationMesh(): THREE.Group {
  const group = new THREE.Group();

  // Deck plate (exact 3.0m x 3.0m, top surface at y = 0.25)
  const deckGeom = new THREE.BoxGeometry(FOUNDATION_GRID_SIZE, 0.25, FOUNDATION_GRID_SIZE);
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.7,
    metalness: 0.3,
    map: techGridTexture,
  });
  const deck = new THREE.Mesh(deckGeom, deckMat);
  deck.position.y = 0.125;
  deck.receiveShadow = true;
  deck.castShadow = true;
  group.add(deck);

  // 4 Corner Footing Pillars extending down into terrain so slopes never leave floating corners
  const footGeom = new THREE.CylinderGeometry(0.14, 0.18, 1.4, 8);
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.7 });
  const corners = [
    [-1.38, -1.38], [1.38, -1.38], [-1.38, 1.38], [1.38, 1.38]
  ];
  corners.forEach(([x, z]) => {
    const foot = new THREE.Mesh(footGeom, steelMat);
    foot.position.set(x, -0.45, z);
    foot.castShadow = true;
    group.add(foot);
  });

  // 4-Sided Perimeter Edge Socket Trim (shows where Walls snap!)
  const trimNSGeom = new THREE.BoxGeometry(FOUNDATION_GRID_SIZE, 0.06, 0.08);
  const trimEWGeom = new THREE.BoxGeometry(0.08, 0.06, FOUNDATION_GRID_SIZE);
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.5 });

  const tNorth = new THREE.Mesh(trimNSGeom, trimMat);
  tNorth.position.set(0, 0.25, -1.46);
  const tSouth = new THREE.Mesh(trimNSGeom, trimMat);
  tSouth.position.set(0, 0.25, 1.46);
  const tEast = new THREE.Mesh(trimEWGeom, trimMat);
  tEast.position.set(1.46, 0.25, 0);
  const tWest = new THREE.Mesh(trimEWGeom, trimMat);
  tWest.position.set(-1.46, 0.25, 0);
  group.add(tNorth, tSouth, tEast, tWest);

  return group;
}

// 6. Shelter Structure: Wall with Window (5 parts)
export function createWallMesh(): THREE.Group {
  const group = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.5 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.8 });

  // Main Wall Panel Left and Right around window
  const leftGeom = new THREE.BoxGeometry(1.0, 2.6, 0.16);
  const left = new THREE.Mesh(leftGeom, wallMat);
  left.position.set(-1.0, 1.3, 0);
  left.castShadow = true;

  const rightGeom = new THREE.BoxGeometry(1.0, 2.6, 0.16);
  const right = new THREE.Mesh(rightGeom, wallMat);
  right.position.set(1.0, 1.3, 0);
  right.castShadow = true;

  // Window frame & Reinforced Acrylic Glass
  const windowGeom = new THREE.BoxGeometry(1.0, 1.2, 0.08);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transmission: 0.7,
    roughness: 0.1,
    transparent: true,
    opacity: 0.8,
  });
  const windowPane = new THREE.Mesh(windowGeom, glassMat);
  windowPane.position.set(0, 1.5, 0);

  // Sill / header
  const sillGeom = new THREE.BoxGeometry(1.0, 0.7, 0.16);
  const sill = new THREE.Mesh(sillGeom, wallMat);
  sill.position.set(0, 0.35, 0);

  const headerGeom = new THREE.BoxGeometry(1.0, 0.7, 0.16);
  const header = new THREE.Mesh(headerGeom, wallMat);
  header.position.set(0, 2.25, 0);

  // Upright steel support posts
  const postGeom = new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8);
  const postL = new THREE.Mesh(postGeom, frameMat);
  postL.position.set(-1.48, 1.3, 0);
  const postR = new THREE.Mesh(postGeom, frameMat);
  postR.position.set(1.48, 1.3, 0);

  group.add(left, right, sill, header, windowPane, postL, postR);
  return group;
}

// 7. Shelter Structure: Roof Panel (4 parts)
export function createRoofMesh(): THREE.Group {
  const group = new THREE.Group();

  const roofGeom = new THREE.BoxGeometry(3.0, 0.15, 3.0);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.4 });
  const roof = new THREE.Mesh(roofGeom, roofMat);
  roof.position.y = 2.6;
  roof.castShadow = true;
  group.add(roof);

  // Thermal Radiator Ribs
  const ribGeom = new THREE.BoxGeometry(2.8, 0.08, 0.1);
  const ribMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.3, metalness: 0.8 });
  for (let z = -1.2; z <= 1.2; z += 0.6) {
    const rib = new THREE.Mesh(ribGeom, ribMat);
    rib.position.set(0, 2.7, z);
    group.add(rib);
  }

  return group;
}

// 8. Solar Panel (6 parts)
export function createSolarPanelMesh(): THREE.Group {
  const group = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.8 });
  const panelMat = new THREE.MeshPhysicalMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9 });

  // Tripod base
  const baseGeom = new THREE.CylinderGeometry(0.3, 0.5, 0.15, 6);
  const base = new THREE.Mesh(baseGeom, steelMat);
  base.position.y = 0.075;
  group.add(base);

  // Mast
  const mastGeom = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8);
  const mast = new THREE.Mesh(mastGeom, steelMat);
  mast.position.y = 0.75;
  mast.castShadow = true;
  group.add(mast);

  // Angled Panel Backplate
  const backGeom = new THREE.BoxGeometry(1.6, 0.06, 1.2);
  const back = new THREE.Mesh(backGeom, steelMat);
  back.position.set(0, 1.45, 0);
  back.rotation.x = 0.5;
  back.castShadow = true;
  group.add(back);

  // Photovoltaic Cell
  const cellGeom = new THREE.BoxGeometry(1.5, 0.02, 1.1);
  const cell = new THREE.Mesh(cellGeom, panelMat);
  cell.position.set(0, 1.48, 0);
  cell.rotation.x = 0.5;
  group.add(cell);

  // Power Conduit Cable
  const cableGeom = new THREE.TorusGeometry(0.2, 0.02, 6, 12, Math.PI);
  const cableMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
  const cable = new THREE.Mesh(cableGeom, cableMat);
  cable.position.set(0.1, 0.8, 0);
  cable.rotation.z = Math.PI / 2;
  group.add(cable);

  return group;
}

// 9. Campfire (5 parts)
export function createCampfireMesh(): THREE.Group {
  const group = new THREE.Group();

  // Stone ring
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const stoneGeom = new THREE.DodecahedronGeometry(0.16, 0);
    const stone = new THREE.Mesh(stoneGeom, stoneMat);
    stone.position.set(Math.cos(angle) * 0.6, 0.08, Math.sin(angle) * 0.6);
    group.add(stone);
  }

  // Cross logs
  const logGeom = new THREE.CylinderGeometry(0.08, 0.1, 0.9, 6);
  const logMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.9 });
  const l1 = new THREE.Mesh(logGeom, logMat);
  l1.position.y = 0.12;
  l1.rotation.set(0.1, 0.4, Math.PI / 2);
  const l2 = new THREE.Mesh(logGeom, logMat);
  l2.position.y = 0.15;
  l2.rotation.set(0.1, -0.8, Math.PI / 2);
  group.add(l1, l2);

  // Glowing hot embers
  const emberGeom = new THREE.SphereGeometry(0.25, 6, 6);
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xf97316,
    emissiveIntensity: 1.2,
    roughness: 0.4,
  });
  const embers = new THREE.Mesh(emberGeom, emberMat);
  embers.position.y = 0.12;
  embers.scale.set(1, 0.5, 1);
  group.add(embers);

  return group;
}

// 10. Atmospheric Water Condenser (6 parts)
export function createWaterCondenserMesh(): THREE.Group {
  const group = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.8 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transmission: 0.8, transparent: true, opacity: 0.8 });

  // Pedestal
  const baseGeom = new THREE.CylinderGeometry(0.5, 0.6, 0.2, 8);
  const base = new THREE.Mesh(baseGeom, steelMat);
  base.position.y = 0.1;
  group.add(base);

  // Water Reservoir Tank (glass)
  const tankGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.7, 12);
  const tank = new THREE.Mesh(tankGeom, glassMat);
  tank.position.y = 0.55;
  group.add(tank);

  // Condenser Chiller Coil
  const coilGeom = new THREE.TorusGeometry(0.2, 0.03, 6, 16);
  const coilMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.2, metalness: 0.9 });
  const coil = new THREE.Mesh(coilGeom, coilMat);
  coil.position.y = 0.55;
  coil.rotation.x = Math.PI / 2;
  group.add(coil);

  // Intake Funnel Mast
  const mastGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
  const mast = new THREE.Mesh(mastGeom, steelMat);
  mast.position.y = 1.3;
  group.add(mast);

  const funnelGeom = new THREE.ConeGeometry(0.45, 0.4, 8);
  const funnel = new THREE.Mesh(funnelGeom, steelMat);
  funnel.position.y = 1.8;
  funnel.rotation.x = Math.PI;
  group.add(funnel);

  return group;
}

// 11. RGSHSC Component: Tier 1 Cryo-Stasis Chamber (8 parts)
export function createCryoPodMesh(): THREE.Group {
  const group = new THREE.Group();

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.7 });
  const cryoGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x06b6d4,
    transmission: 0.85,
    roughness: 0.1,
    transparent: true,
    opacity: 0.85,
  });

  // Base platform
  const baseGeom = new THREE.CylinderGeometry(0.8, 0.9, 0.3, 10);
  const base = new THREE.Mesh(baseGeom, baseMat);
  base.position.y = 0.15;
  base.castShadow = true;
  group.add(base);

  // Cryo coolant pipes (2)
  const pipeGeom = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8);
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
  const p1 = new THREE.Mesh(pipeGeom, pipeMat);
  p1.position.set(0.5, 0.9, 0.3);
  const p2 = new THREE.Mesh(pipeGeom, pipeMat);
  p2.position.set(-0.5, 0.9, 0.3);
  group.add(p1, p2);

  // Cryo glass capsule
  const capGeom = new THREE.CylinderGeometry(0.45, 0.45, 1.4, 16);
  const cap = new THREE.Mesh(capGeom, cryoGlassMat);
  cap.position.y = 1.0;
  group.add(cap);

  // Floating DNA Sample Holder inside
  const dnaHolderGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
  const dnaMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0891b2, emissiveIntensity: 0.8 });
  const holder = new THREE.Mesh(dnaHolderGeom, dnaMat);
  holder.position.y = 1.0;
  group.add(holder);

  // Cryo cap / condenser lid
  const lidGeom = new THREE.CylinderGeometry(0.6, 0.5, 0.2, 10);
  const lid = new THREE.Mesh(lidGeom, baseMat);
  lid.position.y = 1.8;
  group.add(lid);

  // Digital Temperature Readout screen
  const screenGeom = new THREE.BoxGeometry(0.25, 0.15, 0.04);
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.9 });
  const screen = new THREE.Mesh(screenGeom, screenMat);
  screen.position.set(0, 0.6, 0.5);
  group.add(screen);

  return group;
}

// 12. RGSHSC Component: Tier 2 Nutrient Bioreactor (8 parts)
export function createNutrientBioreactorMesh(): THREE.Group {
  const group = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.8 });
  const bioMat = new THREE.MeshPhysicalMaterial({ color: 0x10b981, transmission: 0.7, transparent: true, opacity: 0.8 });

  // Main bioreactor chamber
  const vatGeom = new THREE.CylinderGeometry(0.7, 0.7, 1.5, 12);
  const vat = new THREE.Mesh(vatGeom, bioMat);
  vat.position.y = 0.95;
  vat.castShadow = true;
  group.add(vat);

  // Top motor housing
  const motorGeom = new THREE.BoxGeometry(0.6, 0.4, 0.6);
  const motor = new THREE.Mesh(motorGeom, steelMat);
  motor.position.y = 1.85;
  group.add(motor);

  // Reagent flask satellite tanks (3)
  const flaskGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.8, 8);
  const flaskMat = new THREE.MeshStandardMaterial({ color: 0x059669, emissive: 0x047857, emissiveIntensity: 0.4 });
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const flask = new THREE.Mesh(flaskGeom, flaskMat);
    flask.position.set(Math.cos(angle) * 0.9, 0.6, Math.sin(angle) * 0.9);
    group.add(flask);
  }

  // Heavy Base
  const baseGeom = new THREE.BoxGeometry(2.0, 0.2, 2.0);
  const base = new THREE.Mesh(baseGeom, steelMat);
  base.position.y = 0.1;
  group.add(base);

  return group;
}

// 13. RGSHSC Component: Tier 3 Gene Shifter Matrix (9 parts)
export function createGeneShifterMatrixMesh(): THREE.Group {
  const group = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.85 });
  const laserMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x7c3aed, emissiveIntensity: 0.9 });

  // Base platform
  const baseGeom = new THREE.CylinderGeometry(1.2, 1.3, 0.25, 12);
  const base = new THREE.Mesh(baseGeom, frameMat);
  base.position.y = 0.125;
  group.add(base);

  // Quantum Magnetic Ring
  const ringGeom = new THREE.TorusGeometry(0.9, 0.08, 8, 24);
  const ring = new THREE.Mesh(ringGeom, frameMat);
  ring.position.y = 1.2;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // 3 Gene-Splicing Emitter Arms
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const armGeom = new THREE.BoxGeometry(0.12, 1.4, 0.12);
    const arm = new THREE.Mesh(armGeom, frameMat);
    arm.position.set(Math.cos(angle) * 0.9, 0.8, Math.sin(angle) * 0.9);
    arm.rotation.y = angle;

    // Emitter tip
    const tipGeom = new THREE.SphereGeometry(0.09, 8, 8);
    const tip = new THREE.Mesh(tipGeom, laserMat);
    tip.position.set(Math.cos(angle) * 0.7, 1.2, Math.sin(angle) * 0.7);

    group.add(arm, tip);
  }

  // Central Hologram Core Projector
  const coreGeom = new THREE.CylinderGeometry(0.3, 0.35, 0.4, 8);
  const core = new THREE.Mesh(coreGeom, frameMat);
  core.position.y = 0.45;
  group.add(core);

  return group;
}

// 14. THE MASTER RGSHSC MACHINE (12 Parts, Tier 4 Cloner)
export function createRGSHSCCoreMesh(stage: number = 4): THREE.Group {
  const group = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.9 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.15, metalness: 0.95 });
  const cryoGlowMat = new THREE.MeshStandardMaterial({
    color: stage >= 4 ? 0x10b981 : 0x06b6d4,
    emissive: stage >= 4 ? 0x059669 : 0x0891b2,
    emissiveIntensity: 0.8,
  });

  // 1. Octagonal High-Tech Foundation Platform
  const platformGeom = new THREE.CylinderGeometry(2.4, 2.6, 0.4, 8);
  const platform = new THREE.Mesh(platformGeom, hullMat);
  platform.position.y = 0.2;
  platform.receiveShadow = true;
  group.add(platform);

  // 2. Four Giant Cryogenic Coolant Pylons
  const pylonPositions = [
    [-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]
  ];
  pylonPositions.forEach(([x, z]) => {
    const pylonGeom = new THREE.CylinderGeometry(0.18, 0.25, 3.2, 8);
    const pylon = new THREE.Mesh(pylonGeom, chromeMat);
    pylon.position.set(x, 1.8, z);
    pylon.castShadow = true;

    // Glowing coolant conduits
    const ringGeom = new THREE.TorusGeometry(0.22, 0.04, 6, 12);
    const r1 = new THREE.Mesh(ringGeom, cryoGlowMat);
    r1.position.set(x, 1.2, z);
    r1.rotation.x = Math.PI / 2;
    const r2 = new THREE.Mesh(ringGeom, cryoGlowMat);
    r2.position.set(x, 2.4, z);
    r2.rotation.x = Math.PI / 2;

    group.add(pylon, r1, r2);
  });

  // 3. Central Amniotic Gestation Cylinder (Glass)
  const vatGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transmission: 0.9,
    roughness: 0.08,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const vatGeom = new THREE.CylinderGeometry(0.9, 0.9, 2.4, 24);
  const vat = new THREE.Mesh(vatGeom, vatGlassMat);
  vat.position.y = 1.8;
  group.add(vat);

  // 4. Rotating DNA Double Helix Structure inside the vat!
  const dnaGroup = new THREE.Group();
  dnaGroup.name = 'dnaHelix';
  const strandGeom = new THREE.SphereGeometry(0.04, 6, 6);
  const strandMat1 = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.8 });
  const strandMat2 = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.8 });

  for (let i = -10; i <= 10; i++) {
    const y = (i / 10) * 0.9;
    const angle = i * 0.45;
    const s1 = new THREE.Mesh(strandGeom, strandMat1);
    s1.position.set(Math.cos(angle) * 0.35, y, Math.sin(angle) * 0.35);

    const s2 = new THREE.Mesh(strandGeom, strandMat2);
    s2.position.set(Math.cos(angle + Math.PI) * 0.35, y, Math.sin(angle + Math.PI) * 0.35);

    // Cross-link rung
    const rungGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.7, 4);
    const rungMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });
    const rung = new THREE.Mesh(rungGeom, rungMat);
    rung.position.set(0, y, 0);
    rung.rotation.z = Math.PI / 2;
    rung.rotation.y = angle;

    dnaGroup.add(s1, s2, rung);
  }
  dnaGroup.position.y = 1.8;
  group.add(dnaGroup);

  // 5. Overhead Neural Synthesis Gantry & Emitters
  const gantryGeom = new THREE.CylinderGeometry(1.4, 1.2, 0.4, 12);
  const gantry = new THREE.Mesh(gantryGeom, hullMat);
  gantry.position.y = 3.2;
  group.add(gantry);

  // 6. Laser Synthesis Needles (4 pointing inward)
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const needleGeom = new THREE.ConeGeometry(0.06, 0.4, 6);
    const needle = new THREE.Mesh(needleGeom, chromeMat);
    needle.position.set(Math.cos(angle) * 0.8, 3.0, Math.sin(angle) * 0.8);
    needle.rotation.x = Math.PI;
    group.add(needle);
  }

  // 7. Interactive Holographic Command Console
  const consoleGeom = new THREE.BoxGeometry(0.8, 0.9, 0.4);
  const consoleMesh = new THREE.Mesh(consoleGeom, hullMat);
  consoleMesh.position.set(0, 0.85, 1.8);
  consoleMesh.rotation.y = 0;

  const screenGeom = new THREE.BoxGeometry(0.65, 0.4, 0.04);
  const screenMat = new THREE.MeshStandardMaterial({
    color: stage >= 4 ? 0x10b981 : 0x06b6d4,
    emissive: stage >= 4 ? 0x059669 : 0x0891b2,
    emissiveIntensity: 0.9,
  });
  const screen = new THREE.Mesh(screenGeom, screenMat);
  screen.position.set(0, 1.05, 1.98);
  screen.rotation.x = -0.3;

  group.add(consoleMesh, screen);

  group.userData = { type: 'rgshsc_core', stage };
  return group;
}

// 15. Survivor Remote Avatar (for multiplayer co-op survivors)
export function createSurvivorAvatarMesh(color: string = '#06B6D4', ignoreCustom: boolean = false): THREE.Group {
  if (!ignoreCustom) {
    const custom = customModelRegistry.createCustomInstance('survivor_avatar');
    if (custom) return custom;
  }
  const group = new THREE.Group();

  const suitColor = new THREE.Color(color);
  const suitMat = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.6, metalness: 0.2 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.3 });
  const visorMat = new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, roughness: 0.1, metalness: 0.9 });

  // Torso
  const torsoGeom = new THREE.BoxGeometry(0.5, 0.65, 0.3);
  const torso = new THREE.Mesh(torsoGeom, suitMat);
  torso.position.y = 1.05;
  torso.castShadow = true;
  group.add(torso);

  // Life-Support Backpack
  const packGeom = new THREE.BoxGeometry(0.35, 0.5, 0.2);
  const pack = new THREE.Mesh(packGeom, darkMat);
  pack.position.set(0, 1.1, -0.22);
  group.add(pack);

  // Oxygen cylinders (2)
  const cylGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8);
  const cylMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
  const c1 = new THREE.Mesh(cylGeom, cylMat);
  c1.position.set(0.1, 1.1, -0.32);
  const c2 = new THREE.Mesh(cylGeom, cylMat);
  c2.position.set(-0.1, 1.1, -0.32);
  group.add(c1, c2);

  // Helmet
  const helmetGeom = new THREE.SphereGeometry(0.22, 12, 10);
  const helmet = new THREE.Mesh(helmetGeom, darkMat);
  helmet.position.y = 1.55;
  helmet.castShadow = true;
  group.add(helmet);

  // Gold reflective visor
  const visorGeom = new THREE.BoxGeometry(0.28, 0.14, 0.08);
  const visor = new THREE.Mesh(visorGeom, visorMat);
  visor.position.set(0, 1.55, 0.18);
  group.add(visor);

  // Legs & Boots
  const legGeom = new THREE.BoxGeometry(0.18, 0.65, 0.2);
  const leftLeg = new THREE.Mesh(legGeom, darkMat);
  leftLeg.position.set(-0.14, 0.4, 0);
  const rightLeg = new THREE.Mesh(legGeom, darkMat);
  rightLeg.position.set(0.14, 0.4, 0);
  group.add(leftLeg, rightLeg);

  // Arms
  const armGeom = new THREE.BoxGeometry(0.14, 0.6, 0.16);
  const leftArm = new THREE.Mesh(armGeom, suitMat);
  leftArm.position.set(-0.35, 1.0, 0);
  const rightArm = new THREE.Mesh(armGeom, suitMat);
  rightArm.position.set(0.35, 1.0, 0);
  group.add(leftArm, rightArm);

  return group;
}

// 16. First-Person Held Multi-Tool + Precious DNA Vial in Hand!
export function createFirstPersonToolMesh(ignoreCustom: boolean = false): THREE.Group {
  if (!ignoreCustom) {
    const custom = customModelRegistry.createCustomInstance('fp_tool');
    if (custom) return custom;
  }
  const group = new THREE.Group();

  const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.8 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.2, metalness: 0.9 });
  const dnaGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x22d3ee,
    transmission: 0.9,
    roughness: 0.1,
    transparent: true,
    opacity: 0.9,
  });

  // Tool Chassis
  const chassisGeom = new THREE.BoxGeometry(0.12, 0.14, 0.45);
  const chassis = new THREE.Mesh(chassisGeom, metalMat);
  chassis.position.set(0, 0, 0);
  group.add(chassis);

  // Laser Barrel
  const barrelGeom = new THREE.CylinderGeometry(0.035, 0.045, 0.25, 8);
  const barrel = new THREE.Mesh(barrelGeom, metalMat);
  barrel.position.set(0, 0, -0.32);
  barrel.rotation.x = Math.PI / 2;
  group.add(barrel);

  // Laser Emitter Tip
  const tipGeom = new THREE.CylinderGeometry(0.02, 0.035, 0.08, 8);
  const tip = new THREE.Mesh(tipGeom, accentMat);
  tip.position.set(0, 0, -0.47);
  tip.rotation.x = Math.PI / 2;
  group.add(tip);

  // Top Rail Cryogenic Chamber holding the DNA Vial
  const mountGeom = new THREE.BoxGeometry(0.08, 0.04, 0.22);
  const mount = new THREE.Mesh(mountGeom, metalMat);
  mount.position.set(0, 0.09, -0.05);
  group.add(mount);

  // The precious Glowing DNA Sample Tube!
  const dnaTubeGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.2, 12);
  const dnaTube = new THREE.Mesh(dnaTubeGeom, dnaGlassMat);
  dnaTube.position.set(0, 0.13, -0.05);
  dnaTube.rotation.x = Math.PI / 2;
  group.add(dnaTube);

  // Glowing micro DNA core
  const coreGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.0,
  });
  const core = new THREE.Mesh(coreGeom, coreMat);
  core.position.set(0, 0.13, -0.05);
  core.rotation.x = Math.PI / 2;
  group.add(core);

  // Position in first-person camera space: lower right
  group.position.set(0.3, -0.25, -0.55);
  group.rotation.set(-0.1, 0.1, -0.05);

  return group;
}

// Factory mapping for structure placement
export function createStructureMesh(type: StructureType, ignoreCustom: boolean = false): THREE.Group {
  if (!ignoreCustom) {
    const custom = customModelRegistry.createCustomInstance(type);
    if (custom) {
      custom.userData = { type };
      return custom;
    }
  }
  switch (type) {
    case 'foundation': return createFoundationMesh();
    case 'wall': return createWallMesh();
    case 'roof': return createRoofMesh();
    case 'solar_panel': return createSolarPanelMesh();
    case 'water_condenser': return createWaterCondenserMesh();
    case 'campfire': return createCampfireMesh();
    case 'cryo_stasis_pod': return createCryoPodMesh();
    case 'nutrient_bioreactor': return createNutrientBioreactorMesh();
    case 'gene_shifter_matrix': return createGeneShifterMatrixMesh();
    case 'rgshsc_core': return createRGSHSCCoreMesh(4);
    default: return createFoundationMesh();
  }
}

export function createProceduralDefaultMesh(slotId: ModelSlotId): THREE.Group {
  switch (slotId) {
    case 'world_map': {
      const mapGroup = new THREE.Group();
      const geom = new THREE.PlaneGeometry(5.5, 5.5, 24, 24);
      geom.rotateX(-Math.PI / 2);
      const pos = geom.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        pos.setY(i, Math.sin(x * 1.1) * Math.cos(z * 1.1) * 0.35 + 0.25);
      }
      geom.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({
        map: groundTexture,
        color: 0x94a3b8,
        roughness: 0.8,
        metalness: 0.1,
      });
      const terrain = new THREE.Mesh(geom, mat);
      terrain.receiveShadow = true;
      mapGroup.add(terrain);

      const miniTree = createMutatedTree(true);
      miniTree.scale.setScalar(0.35);
      miniTree.position.set(-0.9, 0.25, -0.6);
      mapGroup.add(miniTree);

      const miniCrystal = createQuartzCrystalNode(true);
      miniCrystal.scale.setScalar(0.4);
      miniCrystal.position.set(1.0, 0.25, 0.7);
      mapGroup.add(miniCrystal);

      return mapGroup;
    }
    case 'wood': return createMutatedTree(true);
    case 'quartzCrystal': return createQuartzCrystalNode(true);
    case 'scrapMetal': return createScrapWreckageNode(true);
    case 'biomass': return createBiomassFloraNode(true);
    case 'survivor_avatar': return createSurvivorAvatarMesh('#06B6D4', true);
    case 'fp_tool': {
      const tool = createFirstPersonToolMesh(true);
      tool.position.set(0, 0.25, 0);
      tool.rotation.set(0, 0, 0);
      return tool;
    }
    default:
      return createStructureMesh(slotId as StructureType, true);
  }
}

// 17. First-Person Handheld SDG Eco-Tablet (7-part composite mesh)
export function createFirstPersonTabletMesh(): THREE.Group {
  const group = new THREE.Group();

  // Procedural OLED Screen Canvas Texture
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 340;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#061325';
  ctx.fillRect(0, 0, 512, 340);

  // Header bar on tablet screen
  ctx.fillStyle = '#0891b2';
  ctx.fillRect(16, 16, 480, 42);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('UN SDG BIOSPHERE TABLET · LINK ACTIVE', 28, 44);

  // 3 SDG Status Cards on Screen (SDG 6 Water, SDG 2 Food, SDG 15 Trees)
  const cards = [
    { title: 'SDG 6: CLEAN WATER', sub: 'Conservation & Pure Synthesis', col: '#06b6d4', x: 16 },
    { title: 'SDG 2: ZERO HUNGER', sub: 'Sustainable Nutrient Rations', col: '#f59e0b', x: 180 },
    { title: 'SDG 15: LIFE ON LAND', sub: 'Plant 2 Seeds Per Tree Cut', col: '#10b981', x: 344 },
  ];
  cards.forEach((c) => {
    ctx.strokeStyle = c.col;
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x, 76, 152, 180);
    ctx.fillStyle = c.col;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(c.title, c.x + 10, 104);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(c.sub.slice(0, 18), c.x + 10, 132);
    ctx.fillText(c.sub.slice(18), c.x + 10, 148);
  });

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('PRESS [1] FOR MULTI-TOOL · [R] PLANT SEED', 24, 305);

  const screenTex = new THREE.CanvasTexture(canvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.85 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, metalness: 0.3 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.8,
  });

  // 1. Main Tablet Chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.26, 0.022), bodyMat);
  group.add(chassis);

  // 2. Illuminated Holographic Screen
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), screenMat);
  screen.position.z = 0.012;
  group.add(screen);

  // 3. Left & Right Rugged Bumper Grips
  const gripGeom = new THREE.BoxGeometry(0.03, 0.27, 0.032);
  const leftGrip = new THREE.Mesh(gripGeom, gripMat);
  leftGrip.position.set(-0.19, 0, 0);
  const rightGrip = new THREE.Mesh(gripGeom, gripMat);
  rightGrip.position.set(0.19, 0, 0);
  group.add(leftGrip, rightGrip);

  // 4. Top Telemetry Antenna & LED Beacon
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.008, 0.09, 8), bodyMat);
  ant.position.set(0.15, 0.16, -0.005);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), accentMat);
  beacon.position.set(0.15, 0.21, -0.005);
  group.add(ant, beacon);

  // Positioned in first-person view for comfortable reading
  group.position.set(0.18, -0.18, -0.45);
  group.rotation.set(-0.12, -0.22, -0.04);

  return group;
}

// 18. Planted Reforestation Sapling Tree (grows into a living tree)
export function createSaplingTreeMesh(): THREE.Group {
  const tree = createMutatedTree();
  // Add a protective bio-ring around the base to mark player-planted reforestation trees
  const ringGeom = new THREE.TorusGeometry(0.75, 0.05, 8, 24);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.7,
    roughness: 0.3,
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  tree.add(ring);
  return tree;
}


