import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ThreeEngine } from './game/threeEngine';
import { TitleScreen } from './components/TitleScreen';
import { HUDOverlay } from './components/HUDOverlay';
import { BottomDock } from './components/BottomDock';
import { TabletOverlay } from './components/TabletOverlay';
import { UnityExportModal } from './components/UnityExportModal';
import { ModelStudioModal } from './components/ModelStudioModal';
import { VictoryModal } from './components/VictoryModal';
import { ExtinctionModal } from './components/ExtinctionModal';
import { 
  CustomMapConfig,
  EcoStats,
  EquippedItem,
  Inventory, 
  ModelSlotId,
  StructureItem, 
  StructureType, 
  SurvivorVitals, 
  RemoteSurvivor, 
  ChatMessage,
  TabletSDGMessage,
} from './types/game';
import { customModelRegistry } from './game/customModelRegistry';
import { sound } from './audio/soundEffects';

const INITIAL_SDG_MESSAGES: TabletSDGMessage[] = [
  {
    id: 'sdg_init_innovation',
    category: 'innovation',
    sdgNumber: 9,
    sdgTitle: 'Industry, Innovation and Infrastructure',
    headline: 'RGSHSC Mission Briefing: Scientific Innovation & Resilient Infrastructure',
    realWorldFact:
      'UN SDG #9 emphasizes building resilient infrastructure, promoting sustainable industrialization, and fostering scientific and technological innovation to solve humanity’s greatest challenges.',
    ecoActionRule:
      'INNOVATION PROTOCOL: Construct the 4 RGSHSC Cloner tiers (starting with the Tier 1 Cryo-Stasis Chamber) and resilient base infrastructure to advance scientific preservation.',
    sdgUrl: 'https://sdgs.un.org/goals/goal9',
    timestamp: Date.now() - 1000,
    read: true,
  },
  {
    id: 'sdg_init_trees',
    category: 'trees',
    sdgNumber: 15,
    sdgTitle: 'Life on Land',
    headline: 'Biosphere Directive: Plant 2 Seeds for Every 1 Tree Cut',
    realWorldFact:
      'In the real world, Earth loses 10 million hectares of forest every year, threatening 80% of terrestrial biodiversity and accelerating climate change (UN SDG #15 & SDG #13).',
    ecoActionRule:
      'MANDATORY PROTOCOL: Whenever you cut down 1 tree for wood, you must plant 2 Tree Seeds [R] to net-regenerate the forest canopy.',
    sdgUrl: 'https://sdgs.un.org/goals/goal15',
    timestamp: Date.now(),
    read: true,
  },
];

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ThreeEngine | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Game UI State
  const [gameStage, setGameStage] = useState<'title' | 'playing'>('title');
  const [roomCode, setRoomCode] = useState('STRAND-1');
  const [survivorName, setSurvivorName] = useState('Survivor-01');
  const [suitColor, setSuitColor] = useState('#06B6D4');
  const [hoverPrompt, setHoverPrompt] = useState<string | null>(null);
  const [activeBuildType, setActiveBuildType] = useState<StructureType | null>(null);
  const [isBuildDockCollapsed, setIsBuildDockCollapsed] = useState(true);
  const [isUnityModalOpen, setIsUnityModalOpen] = useState(false);
  const [isModelStudioOpen, setIsModelStudioOpen] = useState(false);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);
  const [extinctionState, setExtinctionState] = useState<{ isOpen: boolean; reason: 'health' | 'dna' }>({
    isOpen: false,
    reason: 'health',
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [customModelsCount, setCustomModelsCount] = useState(0);
  const [mapConfig, setMapConfig] = useState<CustomMapConfig>({
    terrainPreset: 'default',
    elevationScale: 1.0,
    biomeColor: '#94a3b8',
    hideProceduralTerrain: false,
  });

  // 2-Item Equipment State ('tool' = Utility Weapon, 'tablet' = SDG Biosphere Tablet)
  const [equippedItem, setEquippedItem] = useState<EquippedItem>('tool');
  const [ecoStats, setEcoStats] = useState<EcoStats>({ treesCut: 0, seedsPlanted: 0 });
  const [tabletMessages, setTabletMessages] = useState<TabletSDGMessage[]>(INITIAL_SDG_MESSAGES);

  // Day & Night Cycle Telemetry
  const [timeOfDay, setTimeOfDay] = useState(10.5);
  const [timePhase, setTimePhase] = useState('Daylight');
  const [dayCount, setDayCount] = useState(1);
  const [isAutoDayNight, setIsAutoDayNight] = useState(true);

  // Synchronized simulation states
  const [vitals, setVitals] = useState<SurvivorVitals>({
    health: 100,
    hunger: 95,
    hydration: 90,
    stamina: 100,
    dnaIntegrity: 100,
    dnaTemperature: -18,
    radiationExposure: 5,
  });

  const [inventory, setInventory] = useState<Inventory>({
    wood: 12,
    scrapMetal: 10,
    quartzCrystal: 6,
    biomass: 8,
    purifiedWater: 4,
    naniteCircuit: 2,
    treeSeeds: 4,
    foodRations: 2,
  });

  const [clonerStage, setClonerStage] = useState(0);
  const [structures, setStructures] = useState<StructureItem[]>([]);
  const [remoteSurvivors, setRemoteSurvivors] = useState<RemoteSurvivor[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; type: 'info' | 'warn' | 'success' }>>([]);

  const addNotification = useCallback((text: string, type: 'info' | 'warn' | 'success' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4500);
  }, []);

  // Dispatches a real-world UN Sustainable Development Goal (SDG) message to the player's Tablet
  const pushSDGTabletMessage = useCallback(
    (
      category: 'water' | 'food' | 'trees' | 'innovation',
      customHeadline?: string,
      customFact?: string,
      customRule?: string
    ) => {
      const id = 'sdg_' + Math.random().toString(36).substring(2, 9);
      let newMsg: TabletSDGMessage;

      if (category === 'water') {
        newMsg = {
          id,
          category: 'water',
          sdgNumber: 6,
          sdgTitle: 'Clean Water and Sanitation',
          headline: customHeadline || 'Purified Water Synthesized — Real-World Water Impact',
          realWorldFact:
            customFact ||
            'In real life, 2.2 billion people lack access to safely managed drinking water, and water scarcity affects more than 40% of the global population. Protecting watersheds and harvesting clean water is essential to human survival.',
          ecoActionRule:
            customRule ||
            'UN SDG #6 Target: Ensure availability and sustainable management of clean water and sanitation for all.',
          sdgUrl: 'https://sdgs.un.org/goals/goal6',
          timestamp: Date.now(),
          read: false,
        };
      } else if (category === 'food') {
        newMsg = {
          id,
          category: 'food',
          sdgNumber: 2,
          sdgTitle: 'Zero Hunger',
          headline: customHeadline || 'Nutrient Ration Synthesized — Global Food Security',
          realWorldFact:
            customFact ||
            'In the real world, nearly 733 million people face hunger daily while 1.05 billion tonnes of food are wasted each year. Resilient agriculture and sustainable nutrition are critical to ending malnutrition.',
          ecoActionRule:
            customRule ||
            'UN SDG #2 & #12 Target: End hunger, achieve food security and improved nutrition, and halve global food waste.',
          sdgUrl: 'https://sdgs.un.org/goals/goal2',
          timestamp: Date.now(),
          read: false,
        };
      } else if (category === 'innovation') {
        newMsg = {
          id,
          category: 'innovation',
          sdgNumber: 9,
          sdgTitle: 'Industry, Innovation and Infrastructure',
          headline:
            customHeadline ||
            'Scientific Innovation Achieved — Resilient Infrastructure & R&D (UN SDG #9)',
          realWorldFact:
            customFact ||
            'In the real world, scientific research, cryogenic biobanking, clean energy grids, and resilient infrastructure (UN SDG #9) are the backbone of medical breakthroughs, disaster resilience, and sustainable development.',
          ecoActionRule:
            customRule ||
            'UN SDG #9 Target: Build resilient infrastructure, promote inclusive and sustainable industrialization, and foster scientific innovation.',
          sdgUrl: 'https://sdgs.un.org/goals/goal9',
          timestamp: Date.now(),
          read: false,
        };
      } else {
        newMsg = {
          id,
          category: 'trees',
          sdgNumber: 15,
          sdgTitle: 'Life on Land',
          headline: customHeadline || 'Reforestation Alert — Plant 2 Seeds for Every Tree Cut',
          realWorldFact:
            customFact ||
            'Forests absorb roughly 2.6 billion tonnes of CO2 each year and shelter 80% of terrestrial species, yet 10 million hectares are destroyed annually. Replanting 2 trees for every 1 felled restores ecosystems.',
          ecoActionRule:
            customRule ||
            'MANDATE: You must plant 2 Tree Seeds [R] for every 1 tree you cut. Linked to UN SDG #15 (Life on Land) & SDG #13 (Climate Action).',
          sdgUrl: 'https://sdgs.un.org/goals/goal15',
          timestamp: Date.now(),
          read: false,
        };
      }

      setTabletMessages((prev) => [newMsg, ...prev]);
    },
    []
  );

  const handleSwitchEquipment = useCallback((item: EquippedItem) => {
    setEquippedItem(item);
    if (engineRef.current) {
      engineRef.current.setEquippedItem(item);
      if (item === 'tablet') {
        engineRef.current.unlockPointer();
      }
    }
    if (item === 'tablet') {
      setTabletMessages((prev) => prev.map((m) => ({ ...m, read: true })));
    }
  }, []);

  const handlePlantSeed = useCallback(() => {
    if (!engineRef.current) return;
    const planted = engineRef.current.plantTreeSeed();
    if (planted) {
      setEcoStats((prev) => {
        const nextPlanted = prev.seedsPlanted + 1;
        const required = prev.treesCut * 2;
        const remaining = Math.max(0, required - nextPlanted);
        addNotification(
          remaining > 0
            ? `Planted Tree Sapling (grows in 30s)! (${remaining} more seed${remaining === 1 ? '' : 's'} needed for 2x Mandate)`
            : `Planted Tree Sapling (grows in 30s)! Reforestation Mandate (2 seeds/tree) fulfilled!`,
          'success'
        );
        return { ...prev, seedsPlanted: nextPlanted };
      });
      pushSDGTabletMessage(
        'trees',
        'Sapling Planted — Active Reforestation & Carbon Capture (SDG #15)'
      );
    }
  }, [addNotification, pushSDGTabletMessage]);

  const handleEatFood = useCallback(() => {
    if (inventory.foodRations <= 0) {
      addNotification('No Nutrient Food Rations in inventory! Craft rations in the Crafting tab [B].', 'warn');
      sound.playDnaAlert();
      return;
    }

    setInventory((prev) => ({
      ...prev,
      foodRations: Math.max(0, prev.foodRations - 1),
    }));
    setVitals((prev) => ({
      ...prev,
      hunger: Math.min(100, prev.hunger + 35),
      health: Math.min(100, prev.health + 10),
    }));

    if (engineRef.current) {
      engineRef.current.inventory.foodRations = Math.max(0, engineRef.current.inventory.foodRations - 1);
      engineRef.current.vitals.hunger = Math.min(100, engineRef.current.vitals.hunger + 35);
      engineRef.current.vitals.health = Math.min(100, engineRef.current.vitals.health + 10);
    }

    sound.playCraftComplete();
    addNotification('Consumed Nutrient Food Ration (+35% Energy, +10% Health)', 'success');
    pushSDGTabletMessage('food', 'Nutrient Ration Consumed — Why Food Security Matters (SDG #2)');
  }, [inventory.foodRations, addNotification, pushSDGTabletMessage]);

  // Initialize ThreeEngine on mount
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new ThreeEngine({
      onVitalsChange: (newVitals) => setVitals(newVitals),
      onInventoryChange: (newInv) => setInventory(newInv),
      onHoverTargetChange: (prompt) => setHoverPrompt(prompt),
      onLocalPlayerMove: (pos, rot, action) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'player_move',
            position: pos,
            rotation: rot,
            action,
          }));
        }
      },
      onStructureBuilt: (structure) => {
        setStructures((prev) => [...prev, structure]);
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'build_structure',
            structure,
          }));
        }

        // Dispatch tailored UN SDG #9 (Industry, Innovation and Infrastructure) notifications when building Cloner Tiers or Base Infrastructure
        if (structure.type === 'cryo_stasis_pod') {
          pushSDGTabletMessage(
            'innovation',
            'Tier 1 Cryo-Stasis Chamber Built — Cryogenic Biobanking Innovation (UN SDG #9)',
            'In real life, cryogenic cold-chain infrastructure and biobanks (such as the Svalbard Global Seed Vault and medical cryo-repositories) rely on frontier engineering to preserve vaccines, stem cells, and biodiversity.',
            'UN SDG #9 Milestone: Cryo-Stasis Chamber online (-18°C locked). Scientific R&D & resilient infrastructure protect humanity’s genetic future.'
          );
        } else if (structure.type === 'nutrient_bioreactor') {
          pushSDGTabletMessage(
            'innovation',
            'Tier 2 Nutrient Bioreactor Built — Sustainable Bio-Industrial Engineering (UN SDG #9)',
            'Modern bioreactors enable sustainable cellular agriculture, life-saving biologics, and closed-loop resource processing with minimal environmental footprint.',
            'UN SDG #9 Milestone: Bioreactor online. Advancing sustainable bio-manufacturing and scientific innovation.'
          );
        } else if (structure.type === 'gene_shifter_matrix') {
          pushSDGTabletMessage(
            'innovation',
            'Tier 3 Gene Shifter Matrix Built — Genomic R&D & Scientific Instrumentation (UN SDG #9)',
            'Investing in scientific research and high-tech laboratory infrastructure (SDG Target 9.5) accelerates breakthroughs in genetic medicine and climate-resilient biology.',
            'UN SDG #9 Milestone: Gene Shifter Matrix operational. Radiation mutations purged via precision bioinformatics.'
          );
        } else if (structure.type === 'rgshsc_core') {
          pushSDGTabletMessage(
            'innovation',
            'Tier 4 RGSHSC Master Cloner Built — Pinnacle of Human Scientific Innovation (UN SDG #9)',
            'When resilient physical infrastructure, clean energy, and frontier biotechnology converge, humanity can overcome existential crises while living in balance with Earth’s biosphere.',
            'UN SDG #9 Milestone: All 4 RGSHSC innovation tiers complete! Press [E] on the Master Cloner to restore humanity.'
          );
        } else if (structure.type === 'solar_panel') {
          pushSDGTabletMessage(
            'innovation',
            'Solar Generator Deployed — Clean Energy Infrastructure (UN SDG #9 & SDG #7)',
            'Transitioning industrial and shelter infrastructure to renewable solar microgrids reduces carbon emissions and powers critical scientific equipment sustainably.',
            'UN SDG #9 & #7 Target: Upgrade infrastructure with clean, resilient renewable energy technology.'
          );
        } else if (structure.type === 'water_condenser') {
          pushSDGTabletMessage(
            'innovation',
            'Atmospheric Water Condenser Built — Resilient Water Infrastructure (UN SDG #9 & SDG #6)',
            'Atmospheric water generators and decentralized filtration infrastructure bring clean water to arid and disaster-struck communities worldwide.',
            'UN SDG #9 & #6 Target: Build resilient water-harvesting infrastructure; press [E] at the condenser to collect Purified Water.'
          );
        } else if (
          structure.type === 'foundation' ||
          structure.type === 'wall' ||
          structure.type === 'roof'
        ) {
          pushSDGTabletMessage(
            'innovation',
            `Modular ${structure.type.toUpperCase()} Constructed — Resilient Shelter Infrastructure (UN SDG #9)`,
            'Developing quality, reliable, sustainable, and disaster-resilient modular infrastructure (SDG Target 9.1) protects communities and scientific labs from extreme environments.',
            'UN SDG #9 Target: Build resilient, modular shelter infrastructure to shield life-support and cryo-systems.'
          );
        }
      },
      onClonerProgress: (stage) => {
        setClonerStage(stage);
        setActiveBuildType(null);
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'upgrade_cloner',
            clonerStage: stage,
          }));
        }
      },
      onHumanityRestored: () => {
        setIsVictoryModalOpen(true);
      },
      onHumanityExtinct: (reason) => {
        setExtinctionState({ isOpen: true, reason });
      },
      onNotification: (text, type) => addNotification(text, type),
      onPointerLockChange: (locked) => setIsPointerLocked(locked),
      onTimeOfDayChange: (hr, phase, day, auto) => {
        setTimeOfDay(hr);
        setTimePhase(phase);
        setDayCount(day);
        setIsAutoDayNight(auto);
      },
      onTreeCut: () => {
        setEcoStats((prev) => {
          const nextCut = prev.treesCut + 1;
          const owed = Math.max(0, nextCut * 2 - prev.seedsPlanted);
          addNotification(
            `Tree felled (+2 Seeds)! Mandate: You must plant 2 seeds per tree cut (${owed} owed — press [R] to plant).`,
            'warn'
          );
          return { ...prev, treesCut: nextCut };
        });
        pushSDGTabletMessage(
          'trees',
          'Tree Cut — Mandate: Plant 2 Seeds for Every 1 Tree Cut (UN SDG #15)'
        );
      },
      onWaterCollected: () => {
        if (engineRef.current) {
          engineRef.current.vitals.hydration = Math.min(100, engineRef.current.vitals.hydration + 25);
          setVitals({ ...engineRef.current.vitals });
        }
        pushSDGTabletMessage(
          'water',
          'Atmospheric Water Condensed — Clean Water & Sanitation (UN SDG #6)'
        );
      },
      onBuildModeChange: (type) => {
        setActiveBuildType(type);
      },
    });

    engine.mount(mountRef.current);
    engineRef.current = engine;

    const unsubRegistry = customModelRegistry.subscribe(() => {
      setCustomModelsCount(customModelRegistry.getAllEntries().length);
    });

    return () => {
      unsubRegistry();
      engine.unmount();
      engineRef.current = null;
    };
  }, [addNotification, pushSDGTabletMessage]);

  // Connect WebSocket for multiplayer sessions
  const connectMultiplayer = useCallback((code: string, name: string, color: string) => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'join_room',
          roomCode: code,
          survivorName: name,
          color,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'init_state': {
              if (msg.structures && engineRef.current) {
                engineRef.current.syncStructures(msg.structures);
                setStructures(msg.structures);
              }
              if (typeof msg.clonerStage === 'number') {
                setClonerStage(msg.clonerStage);
                if (engineRef.current) engineRef.current.clonerStage = msg.clonerStage;
              }
              if (msg.survivors) {
                const others = msg.survivors.filter((s: RemoteSurvivor) => s.id !== msg.yourId);
                setRemoteSurvivors(others);
              }
              addNotification(`Connected to Sector ${msg.roomCode}. Co-op link established.`, 'success');
              break;
            }

            case 'survivor_joined': {
              const survivor: RemoteSurvivor = msg.survivor;
              setRemoteSurvivors((prev) => [...prev.filter((s) => s.id !== survivor.id), survivor]);
              addNotification(`${survivor.name} joined the expedition!`, 'info');
              break;
            }

            case 'survivor_moved': {
              if (engineRef.current) {
                engineRef.current.updateRemoteSurvivor(msg.id, 'Survivor', '#06B6D4', msg.position, msg.rotation);
              }
              break;
            }

            case 'survivor_left': {
              if (engineRef.current) {
                engineRef.current.removeRemoteSurvivor(msg.id);
              }
              setRemoteSurvivors((prev) => prev.filter((s) => s.id !== msg.id));
              break;
            }

            case 'structure_added': {
              if (engineRef.current) {
                engineRef.current.addStructureMesh(msg.structure);
              }
              setStructures((prev) => [...prev.filter((s) => s.id !== msg.structure.id), msg.structure]);
              break;
            }

            case 'cloner_upgraded': {
              setClonerStage(msg.clonerStage);
              if (engineRef.current) {
                engineRef.current.advanceClonerStage(msg.clonerStage, true);
              }
              addNotification(`Remote ally advanced RGSHSC to Tier ${msg.clonerStage}!`, 'success');
              break;
            }

            case 'chat_broadcast': {
              setChatMessages((prev) => [...prev, {
                sender: msg.sender,
                color: msg.color,
                text: msg.text,
                time: msg.time,
              }]);
              break;
            }
          }
        } catch (e) {
          console.error('Socket message parse error:', e);
        }
      };

      ws.onerror = () => {
        addNotification('Solo Mode Active (Local simulation running)', 'info');
      };
    } catch {
      addNotification('Running in local solo expedition mode', 'info');
    }
  }, [addNotification]);

  // Handle Start Expedition from Title Screen
  const handleStartGame = (code: string, name: string, color: string) => {
    setRoomCode(code);
    setSurvivorName(name);
    setSuitColor(color);
    setGameStage('playing');

    if (engineRef.current) {
      engineRef.current.startExpedition();
    }

    if (code !== 'SOLO') {
      connectMultiplayer(code, name, color);
    }
  };

  const openModelStudio = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.unlockPointer();
    }
    setIsModelStudioOpen(true);
  }, []);

  // Keyboard hotkeys (including [1] Utility Weapon, [2] Tablet, [Q] Cycle Equipment, [R] Plant Seed, [F] Eat Food)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Digit1') {
        handleSwitchEquipment('tool');
      } else if (e.code === 'Digit2') {
        handleSwitchEquipment('tablet');
      } else if (e.code === 'KeyQ') {
        handleSwitchEquipment(equippedItem === 'tool' ? 'tablet' : 'tool');
      } else if (e.code === 'KeyR') {
        handlePlantSeed();
      } else if (e.code === 'KeyF') {
        handleEatFood();
      } else if (e.code === 'KeyB') {
        setIsBuildDockCollapsed((prev) => !prev);
      } else if (e.code === 'KeyU') {
        if (engineRef.current) engineRef.current.unlockPointer();
        setIsUnityModalOpen((prev) => !prev);
      } else if (e.code === 'KeyM') {
        if (engineRef.current) engineRef.current.unlockPointer();
        setIsModelStudioOpen((prev) => !prev);
      } else if (e.code === 'KeyT') {
        if (engineRef.current) {
          engineRef.current.cycleTimePreset();
          setTimeOfDay(engineRef.current.timeOfDay);
          setTimePhase(engineRef.current.getPhaseLabel());
        }
      } else if (e.code === 'KeyX' || e.code === 'KeyC') {
        if (activeBuildType || engineRef.current?.buildModeType) {
          setActiveBuildType(null);
          if (engineRef.current) engineRef.current.cancelBuildMode(true);
        }
      } else if (e.code === 'Escape') {
        if (activeBuildType || engineRef.current?.buildModeType) {
          setActiveBuildType(null);
          if (engineRef.current) engineRef.current.cancelBuildMode(true);
        } else if (equippedItem === 'tablet') {
          handleSwitchEquipment('tool');
        } else {
          setIsUnityModalOpen(false);
          setIsModelStudioOpen(false);
          setIsVictoryModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeBuildType, equippedItem, handleSwitchEquipment, handlePlantSeed, handleEatFood]);

  const handleSelectBuildType = (type: StructureType | null) => {
    setActiveBuildType(type);
    if (type) {
      // Auto-collapse the build drawer when choosing a blueprint so the 3D view is wide open
      setIsBuildDockCollapsed(true);
      if (equippedItem === 'tablet') {
        handleSwitchEquipment('tool');
      }
    }
    if (engineRef.current) {
      engineRef.current.setGhostPreview(type);
    }
  };

  const handleCraftItem = (recipeId: string) => {
    if (recipeId === 'water') {
      if (inventory.biomass >= 2 && inventory.wood >= 1) {
        setInventory((prev) => ({
          ...prev,
          biomass: prev.biomass - 2,
          wood: prev.wood - 1,
          purifiedWater: prev.purifiedWater + 1,
        }));
        setVitals((prev) => ({
          ...prev,
          hydration: Math.min(100, prev.hydration + 30),
        }));
        if (engineRef.current) {
          engineRef.current.inventory.biomass -= 2;
          engineRef.current.inventory.wood -= 1;
          engineRef.current.inventory.purifiedWater += 1;
          engineRef.current.vitals.hydration = Math.min(100, engineRef.current.vitals.hydration + 30);
        }
        sound.playCraftComplete();
        addNotification('Crafted 1x Purified Water (+30% Hydration) · SDG #6 Dispatch sent to Tablet!', 'success');
        pushSDGTabletMessage('water', 'Purified Water Created — Clean Water & Sanitation (UN SDG #6)');
      }
    } else if (recipeId === 'food') {
      if (inventory.biomass >= 2 && inventory.purifiedWater >= 1) {
        setInventory((prev) => ({
          ...prev,
          biomass: prev.biomass - 2,
          purifiedWater: prev.purifiedWater - 1,
          foodRations: prev.foodRations + 2,
        }));
        setVitals((prev) => ({
          ...prev,
          hunger: Math.min(100, prev.hunger + 35),
        }));
        if (engineRef.current) {
          engineRef.current.inventory.biomass -= 2;
          engineRef.current.inventory.purifiedWater -= 1;
          engineRef.current.inventory.foodRations += 2;
          engineRef.current.vitals.hunger = Math.min(100, engineRef.current.vitals.hunger + 35);
        }
        sound.playCraftComplete();
        addNotification('Synthesized 2x Nutrient Food Rations (+35% Energy) · SDG #2 Dispatch sent to Tablet!', 'success');
        pushSDGTabletMessage('food', 'Nutrient Food Synthesized — Zero Hunger & Sustainable Food (UN SDG #2)');
      }
    } else if (recipeId === 'seeds') {
      if (inventory.biomass >= 1) {
        setInventory((prev) => ({
          ...prev,
          biomass: prev.biomass - 1,
          treeSeeds: prev.treeSeeds + 2,
        }));
        if (engineRef.current) {
          engineRef.current.inventory.biomass -= 1;
          engineRef.current.inventory.treeSeeds += 2;
        }
        sound.playCraftComplete();
        addNotification('Extracted 2x Tree Seeds! Press [R] to plant saplings (UN SDG #15).', 'success');
        pushSDGTabletMessage('trees', 'Bio-Seeds Extracted — Reforestation & Biodiversity (UN SDG #15)');
      }
    } else if (recipeId === 'biomass_cultivate') {
      if (inventory.purifiedWater >= 1) {
        setInventory((prev) => ({
          ...prev,
          purifiedWater: prev.purifiedWater - 1,
          biomass: prev.biomass + 3,
        }));
        if (engineRef.current) {
          engineRef.current.inventory.purifiedWater -= 1;
          engineRef.current.inventory.biomass += 3;
        }
        sound.playCraftComplete();
        addNotification('Cultivated +3x Biomass via Hydroponic Culture!', 'success');
      }
    } else if (recipeId === 'mineral_salvage') {
      if (inventory.wood >= 2 && inventory.biomass >= 1) {
        setInventory((prev) => ({
          ...prev,
          wood: prev.wood - 2,
          biomass: prev.biomass - 1,
          scrapMetal: prev.scrapMetal + 2,
          quartzCrystal: prev.quartzCrystal + 2,
        }));
        if (engineRef.current) {
          engineRef.current.inventory.wood -= 2;
          engineRef.current.inventory.biomass -= 1;
          engineRef.current.inventory.scrapMetal += 2;
          engineRef.current.inventory.quartzCrystal += 2;
        }
        sound.playCraftComplete();
        addNotification('Synthesized +2x Scrap Metal & +2x Quartz Crystal!', 'success');
      }
    } else if (recipeId === 'nanite') {
      if (inventory.scrapMetal >= 4 && inventory.quartzCrystal >= 3) {
        setInventory((prev) => ({
          ...prev,
          scrapMetal: prev.scrapMetal - 4,
          quartzCrystal: prev.quartzCrystal - 3,
          naniteCircuit: prev.naniteCircuit + 1,
        }));
        if (engineRef.current) {
          engineRef.current.inventory.scrapMetal -= 4;
          engineRef.current.inventory.quartzCrystal -= 3;
          engineRef.current.inventory.naniteCircuit += 1;
        }
        sound.playCraftComplete();
        addNotification('Forged 1x Nanite Circuit · SDG #9 Innovation Dispatch sent to Tablet!', 'success');
        pushSDGTabletMessage(
          'innovation',
          'Nanite Circuit Forged — Sustainable Micro-Electronics & R&D (UN SDG #9)',
          'Upgrading technological capabilities and recycling scrap metals and quartz into precision micro-electronics exemplifies circular industrial innovation (UN SDG #9).',
          'UN SDG #9 Target: Foster technological innovation and resource-efficient industrial fabrication.'
        );
      }
    } else if (recipeId === 'medkit') {
      if (inventory.biomass >= 4 && inventory.purifiedWater >= 1) {
        setInventory((prev) => ({
          ...prev,
          biomass: prev.biomass - 4,
          purifiedWater: prev.purifiedWater - 1,
        }));
        setVitals((prev) => ({
          ...prev,
          health: Math.min(100, prev.health + 40),
          radiationExposure: Math.max(0, prev.radiationExposure - 10),
        }));
        if (engineRef.current) {
          engineRef.current.inventory.biomass -= 4;
          engineRef.current.inventory.purifiedWater -= 1;
          engineRef.current.vitals.health = Math.min(100, engineRef.current.vitals.health + 40);
        }
        sound.playCraftComplete();
        addNotification('Applied Bio-Regen Stim: +40 Health restored!', 'success');
      }
    }
  };

  const handleSendChat = (text: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'chat',
        text,
      }));
    } else {
      setChatMessages((prev) => [...prev, {
        sender: survivorName,
        color: suitColor,
        text,
        time: Date.now(),
      }]);
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  const handleTogglePointerLock = () => {
    if (engineRef.current) {
      if (engineRef.current.isPointerLocked()) {
        engineRef.current.unlockPointer();
      } else {
        engineRef.current.lockPointer();
      }
    }
  };

  const handleCycleTimePreset = () => {
    if (engineRef.current) {
      engineRef.current.cycleTimePreset();
      setTimeOfDay(engineRef.current.timeOfDay);
      setTimePhase(engineRef.current.getPhaseLabel());
    }
  };

  const handleToggleAutoDayNight = () => {
    if (engineRef.current) {
      const next = engineRef.current.toggleAutoDayNight();
      setIsAutoDayNight(next);
      addNotification(
        next ? 'Automatic 24h Day/Night Cycle resumed' : 'Day/Night Cycle paused at current hour',
        'info'
      );
    }
  };

  const handleApplyModelToWorld = (slotId: ModelSlotId, fileName: string) => {
    if (engineRef.current) {
      engineRef.current.refreshCustomModelSlot(slotId);
    }
    const meta = customModelRegistry.getSlotMetadata(slotId);
    addNotification(`Applied custom 3D model "${fileName}" to ${meta.name}`, 'success');
  };

  const handleResetSlotToDefault = (slotId: ModelSlotId) => {
    if (engineRef.current) {
      engineRef.current.refreshCustomModelSlot(slotId);
    }
    const meta = customModelRegistry.getSlotMetadata(slotId);
    addNotification(`Restored procedural mesh for ${meta.name}`, 'info');
  };

  const handleSpawnPreviewInWorld = (slotId: ModelSlotId) => {
    if (engineRef.current) {
      engineRef.current.spawnPreviewPropInFrontOfPlayer(slotId);
    }
    const meta = customModelRegistry.getSlotMetadata(slotId);
    addNotification(
      slotId === 'world_map'
        ? `Applied custom 3D World Map to the active sector!`
        : `Spawned ${meta.name} directly in front of you!`,
      'success'
    );
  };

  const handleUpdateMapConfig = (partial: Partial<CustomMapConfig>) => {
    if (engineRef.current) {
      engineRef.current.updateMapConfig(partial);
      setMapConfig({ ...engineRef.current.mapConfig });
    }
  };

  const handleUploadHeightmap = async (file: File) => {
    if (!engineRef.current) return;
    const dims = await engineRef.current.applyHeightmapImage(file);
    setMapConfig({ ...engineRef.current.mapConfig });
    addNotification(
      `Imported Heightmap "${file.name}" (${dims.width}×${dims.height}px) — 3D terrain sculpted!`,
      'success'
    );
  };

  const handleExportWorldMapJson = () => {
    if (!engineRef.current) return;
    const jsonStr = engineRef.current.exportWorldMapJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RGSHSC_Map_${roomCode}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addNotification(`Exported World Map to RGSHSC_Map_${roomCode}.json`, 'success');
  };

  const handleImportWorldMapJson = async (file: File) => {
    if (!engineRef.current) return;
    const text = await file.text();
    const res = engineRef.current.importWorldMapJson(text);
    setMapConfig({ ...engineRef.current.mapConfig });
    addNotification(
      `Imported World Map "${file.name}" (${res.preset} terrain, ${res.structuresCount} structures)!`,
      'success'
    );
  };

  const handleReviveFromExtinction = () => {
    if (engineRef.current) {
      engineRef.current.reviveFromExtinction();
    }
    setExtinctionState({ isOpen: false, reason: 'health' });
    addNotification('Emergency Bioreactor Revival complete! Health & Hydration restored.', 'success');
  };

  const handleRestartAfterExtinction = () => {
    if (engineRef.current) {
      engineRef.current.reviveFromExtinction();
      engineRef.current.isPlaying = false;
    }
    setExtinctionState({ isOpen: false, reason: 'health' });
    setGameStage('title');
  };

  const unreadTabletCount = tabletMessages.filter((m) => !m.read).length;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* 1. Isolated WebGL 3D Container */}
      <div ref={mountRef} className="absolute inset-0 z-0 cursor-crosshair" />

      {/* 2. Title Screen Shell */}
      {gameStage === 'title' && (
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenModelStudio={openModelStudio}
          customModelsCount={customModelsCount}
        />
      )}

      {/* 3. In-Game HUD Overlay, SDG Field Tablet & Bottom Dock */}
      {gameStage === 'playing' && (
        <>
          <HUDOverlay
            vitals={vitals}
            inventory={inventory}
            hoverPrompt={hoverPrompt}
            roomCode={roomCode}
            survivorsCount={remoteSurvivors.length + 1}
            clonerStage={clonerStage}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onOpenUnityModal={() => {
              if (engineRef.current) engineRef.current.unlockPointer();
              setIsUnityModalOpen(true);
            }}
            onOpenModelStudio={openModelStudio}
            customModelsCount={customModelsCount}
            timeOfDay={timeOfDay}
            timePhase={timePhase}
            dayCount={dayCount}
            isAutoDayNight={isAutoDayNight}
            onCycleTimePreset={handleCycleTimePreset}
            onToggleAutoDayNight={handleToggleAutoDayNight}
            isBuildDockCollapsed={isBuildDockCollapsed}
            onToggleBuildDock={() => setIsBuildDockCollapsed((prev) => !prev)}
            notifications={notifications}
            isPointerLocked={isPointerLocked}
            onTogglePointerLock={handleTogglePointerLock}
            equippedItem={equippedItem}
            onSwitchEquipment={handleSwitchEquipment}
            unreadTabletCount={unreadTabletCount}
            ecoStats={ecoStats}
            onPlantSeed={handlePlantSeed}
            onEatFood={handleEatFood}
            activeBuildType={activeBuildType}
            onCancelBuild={() => handleSelectBuildType(null)}
          />

          <TabletOverlay
            equippedItem={equippedItem}
            onSwitchEquipment={handleSwitchEquipment}
            messages={tabletMessages}
            onMarkAllRead={() =>
              setTabletMessages((prev) => prev.map((m) => ({ ...m, read: true })))
            }
            ecoStats={ecoStats}
            inventory={inventory}
            clonerStage={clonerStage}
            onPlantSeed={handlePlantSeed}
            onEatFood={handleEatFood}
            onTriggerSDGTopic={(cat) => pushSDGTabletMessage(cat)}
          />

          <BottomDock
            inventory={inventory}
            clonerStage={clonerStage}
            activeBuildType={activeBuildType}
            onSelectBuildType={handleSelectBuildType}
            onCraftItem={handleCraftItem}
            onOpenUnityModal={() => {
              if (engineRef.current) engineRef.current.unlockPointer();
              setIsUnityModalOpen(true);
            }}
            onOpenModelStudio={openModelStudio}
            customModelsCount={customModelsCount}
            survivors={remoteSurvivors}
            chatMessages={chatMessages}
            onSendChat={handleSendChat}
            isCollapsed={isBuildDockCollapsed}
            onToggleCollapse={() => setIsBuildDockCollapsed((prev) => !prev)}
            isPointerLocked={isPointerLocked}
            onTogglePointerLock={handleTogglePointerLock}
          />
        </>
      )}

      {/* 4. 3D Model Studio & World Map Importer Modal */}
      <ModelStudioModal
        isOpen={isModelStudioOpen}
        onClose={() => setIsModelStudioOpen(false)}
        onApplyModelToWorld={handleApplyModelToWorld}
        onResetSlotToDefault={handleResetSlotToDefault}
        onSpawnPreviewInWorld={handleSpawnPreviewInWorld}
        mapConfig={mapConfig}
        onUpdateMapConfig={handleUpdateMapConfig}
        onUploadHeightmap={handleUploadHeightmap}
        onExportWorldMapJson={handleExportWorldMapJson}
        onImportWorldMapJson={handleImportWorldMapJson}
      />

      {/* 5. Unity 3D Exporter Modal */}
      <UnityExportModal
        isOpen={isUnityModalOpen}
        onClose={() => setIsUnityModalOpen(false)}
        structures={structures}
        clonerStage={clonerStage}
      />

      {/* 6. Humanity Restored Victory Modal */}
      <VictoryModal
        isOpen={isVictoryModalOpen}
        onClose={() => setIsVictoryModalOpen(false)}
        onOpenUnityModal={() => setIsUnityModalOpen(true)}
        structuresCount={structures.length}
        survivorsCount={remoteSurvivors.length + 1}
        dnaIntegrity={vitals.dnaIntegrity}
      />

      {/* 7. Extinction of Humanity Screen (Triggered when Health or DNA reaches 0%) */}
      <ExtinctionModal
        isOpen={extinctionState.isOpen}
        reason={extinctionState.reason}
        dayCount={dayCount}
        clonerStage={clonerStage}
        structuresCount={structures.length}
        dnaIntegrity={vitals.dnaIntegrity}
        ecoStats={ecoStats}
        onReviveAndContinue={handleReviveFromExtinction}
        onRestartExpedition={handleRestartAfterExtinction}
      />
    </div>
  );
}
