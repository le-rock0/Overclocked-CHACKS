# RGSHSC: The Last Strand — 3D Multiplayer Survival & Unity Exporter

An immersive first-person 3D survival and base-building game where players safeguard humanity's final synthetic DNA vial, scavenge post-apocalyptic biomes, establish life-support shelters, and cooperatively build the multi-stage Reproductive Gene Shifting Homo Sapien Cloner (RGSHSC) with real-time multiplayer co-op and a one-click Unity 3D export package.

### User Review & Critical Decisions

> [!IMPORTANT]
> Key choices confirmed through clarification:
> - **Perspective**: First-person immersive 3D survival view with realistic head-bob, pointer-lock camera, physical hand-held DNA vial container, and contextual harvesting/building crosshairs.
> - **Multiplayer**: Real-time room lobbies with live survivor presence, cooperative shelter construction, shared resource stockpiling, and coordinated anomaly defense of the DNA stasis pod.
> - **Unity Integration**: Built-in Unity Export Suite that generates standards-compliant glTF/OBJ models of all crafted structures (shelter components, solar converters, gene splicing reactors, and the full RGSHSC unit), scene layout metadata, and ready-to-use C# Unity controller scripts.

- **Confirmed Decision 1**: First-person immersive controls with pointer-lock look, sprint, jump, and tool interactions.
- **Confirmed Decision 2**: Room-based multiplayer lobbies allowing survivors to join via unique 6-character room codes or quick matchmaking.
- **Confirmed Decision 3 (Defaulted from skipped Q1)**: Dual-mode Unity exporter providing both raw 3D model downloads (glTF/OBJ) and a complete C# script package (`RGSHSC_Cloner.cs`, `SurvivorController.cs`, `DNAStasisPod.cs`) for direct Unity engine import.

---

### 1. Overview & Core Concept

- **What It Does**: Puts the player (and co-op survivors) into an atmospheric post-cataclysm wilderness with nothing but an emergency suit and a cryogenic DNA sample that degrades if temperature, radiation, or shelter fail. Players harvest wood, quartz, copper scrap, and biopolymer; craft survival essentials (campfire, purification unit, solar collector, bio-dome shelter); construct the four sequential technological modules of the RGSHSC; and initiate the humanity restoration sequence.
- **Target Audience / Persona**: Fans of deep survival games (*Subnautica*, *The Forest*, *Rust*, *No Man's Sky*) and Unity game developers looking to prototype 3D survival systems and export full 3D assets and C# code into Unity.
- **Key Value**: Delivers immediate, high-framerate first-person 3D gameplay in the browser with authentic physical survival systems, seamless real-time co-op, and a seamless bridge to professional Unity development.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Title & Lobby Stage**: Atmospheric cinematic title screen with a sweeping camera across a desolate planetary biome, live wind synth, room code creation/joining, survivor avatar color selection, and direct "Start Expedition" CTA.
2. **First-Person Survival Loop**:
   - **Vital Monitoring**: Core survival meters for Health, Hunger, Hydration, and the crucial **DNA Integrity & Temperature Meter**.
   - **Harvesting & Gathering**: Target trees, scrap debris, mineral nodes, and nutrient flora with physical raycasting, visual impact sparks/splinters, and hitstop feedback.
   - **Shelter & Base Construction**: Toggle the Holographic Build Grid (`B` or bottom dock) to snap modular foundations, solar panels, bio-containment walls, and storage crates.
   - **RGSHSC Tech Tree Progression**:
     - *Tier 1: Cryo-Stasis Chamber* (stabilizes DNA decay rate).
     - *Tier 2: Nutrient Bioreactor* (synthesizes amniotic growth medium).
     - *Tier 3: Gene Shifter Matrix* (repairs radiation damage and diversifies human genome alleles).
     - *Tier 4: Gestation Cloner Core* (the complete RGSHSC machine with incubation animation and human clone birth sequence).
3. **Multiplayer Co-Op Operations**:
   - Live survivor avatars with directional head rotation, name tags, and synchronized building placement.
   - Co-op defense against atmospheric ion storms and wildlife scavengers targeting the DNA pod.
4. **Unity Export & Bridge Suite**:
   - Dedicated in-game export panel generating downloadable 3D asset bundles (glTF/OBJ formats), scene hierarchy JSON, and tailored C# Unity components ready to drag into Unity 2022/2023/6.

#### Visual Identity & Theme
- **Aesthetic Direction**: Deep sci-fi industrial survivalism. Weathered titanium, matte composite carbon, cryogenic azure fluids, and rich natural wilderness contrasting against ancient scrap technology.
- **Color Palette & Mood**:
  - Dominant Canvas: Deep obsidian slate (`#0B0F19`) and atmospheric horizon mist (`#151C2C`).
  - Structural Surfaces: Weathered matte gunmetal (`#1F2937`) and reinforced composite paneling (`#374151`).
  - High-Intent Accents: Cryo-DNA cyan (`#06B6D4`), bio-synthesis emerald (`#10B981`), critical warning amber (`#F59E0B`), and ion hazard crimson (`#EF4444`).
- **Typography & Hierarchy**:
  - Display / Title: `Plus Jakarta Sans` with high visual weight (`font-bold tracking-tight`).
  - Telemetry & Vitals: `JetBrains Mono` / `font-mono tabular-nums` for precise DNA stability percentages, coordinates, and temperature readouts.
- **Component Styling & Layout**:
  - Full-screen 3D WebGL viewport with 90%+ unobstructed visual clarity.
  - Ergonomic, low-occlusion perimeter HUD (minimal vitals in top-left, DNA integrity core at top-center, inventory hotbar in lower center).
  - Collapsible bottom utility dock for Crafting, Building, Multiplayer Room, and Unity Exporter.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Full Three.js Procedural 3D World vs. Pre-rendered 2D Sprites**
  - *Chosen Approach*: Fully procedural 3D world with multi-part composite models (trees, boulders, scrap nodes, modular shelter walls, solar converters, and the 4-part RGSHSC cloner), procedural canvas textures, and physically-based materials.
  - *Why*: Provides genuine first-person spatial navigation, real 3D lighting/shadows, dynamic collision, and direct 3D model export to Unity.
  - *Alternatives Considered*: 2.5D isometric view was rejected per user's explicit preference for first-person 3D immersion.

- **Decision 2: Authoritative Real-Time WebSocket Server Architecture**
  - *Chosen Approach*: Node/Express HTTP server with integrated WebSocket server on port 3000, managing room codes, player positional broadcast, synchronized building state, and shared DNA integrity.
  - *Why*: Guarantees real multiplayer capability without fake bots, adhering strictly to the real-time guidelines.
  - *Alternatives Considered*: Client-only mock multiplayer was rejected as forbidden by real-time rules.

- **Decision 3: Complete Unity Bridge & C# Package Generator**
  - *Chosen Approach*: Dynamic glTF/OBJ exporter coupled with a downloadable Unity C# script package (`RGSHSC_GameManager.cs`, `SurvivorPlayerController.cs`, `ClonerMachine.cs`, `BuildingSystem.cs`) and step-by-step Unity import guide.
  - *Why*: Directly satisfies the user's explicit requirement ("make it so I can import it in unity").

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RGSHSC APPLICATION SHELL                        │
│                                                                        │
│  ┌───────────────────────┐   ┌──────────────────────────────────────┐  │
│  │  First-Person HUD     │   │     Three.js WebGL Engine (Canvas)   │  │
│  │  - DNA Stasis Monitor │   │  - Terrain & Biome Chunk Manager     │  │
│  │  - Survivor Vitals    │   │  - Multi-Part Procedural Assets      │  │
│  │  - Quick-Craft Hotbar │   │  - First-Person Physics / Raycaster  │  │
│  │  - Building Grid Mode │   │  - Weather, Day/Night & Lighting     │  │
│  │  - Room & Chat Overlay│   │  - Procedural Web Audio Synth FX     │  │
│  └───────────┬───────────┘   └──────────────────┬───────────────────┘  │
│              │                                  │                      │
│              ▼                                  ▼                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │             Survivor State & Survival Simulation Core            │  │
│  │   Health · Hunger · DNA Integrity · Inventory · Tech Tier        │  │
│  └──────────────────┬───────────────────────────┬───────────────────┘  │
│                     │                           │                      │
│                     ▼                           ▼                      │
│  ┌─────────────────────────────────┐   ┌────────────────────────────┐  │
│  │   WebSocket Multiplayer Client   │   │    Unity Export Engine     │  │
│  │   Room Sync · Survivor Cursors  │   │  glTF / OBJ Mesh Exporter  │  │
│  │   Building Events · DNA Defense │   │  C# Unity Script Generator │  │
│  └──────────────────┬──────────────┘   └────────────────────────────┘  │
└─────────────────────┼──────────────────────────────────────────────────┘
                      │ WebSockets / HTTP
                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Full-Stack Server (server.ts / port 3000)              │
│  - Express Static & API Endpoints (/api/room, /api/export/unity)       │
│  - WebSocket Server (Rooms, Player Positions, World Construction DB)   │
└────────────────────────────────────────────────────────────────────────┘
```

#### Data Model & Entities
- `SurvivorPlayer`: `{ id, name, position: [x,y,z], rotation: [pitch, yaw], color, health, stamina, inventory }`
- `DNAVialState`: `{ integrity: 0-100%, temperature: Celsius, radiationExposure: 0-100%, stasisLevel: 0-4 }`
- `WorldStructure`: `{ id, type: 'wall'|'foundation'|'solar'|'cryo_pod'|'rgshsc_core', position, rotation, health, builtBy }`
- `MultiplayerRoom`: `{ code, hostId, survivors: Map, structures: WorldStructure[], dnaStatus, gameTime }`
- `CraftingRecipe`: `{ id, name, category, tier, inputs: Record<Resource, number>, outputs, buildTime }`

#### Unity Export Architecture
- **3D Geometry**: Generates valid glTF 2.0 / Wavefront OBJ models of all modular assets, shelter foundations, and the 4-stage RGSHSC machine directly in memory using Three.js `GLTFExporter` / `OBJExporter`.
- **C# Script Templates**: Produces ready-to-run Unity scripts with standard Unity CharacterController, Input System, and base-building mechanics compatible with Unity 2021 LTS, 2022 LTS, and Unity 6.
