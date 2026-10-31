# Custom 3D Model Studio & Drag-and-Drop Importer (`RGSHSC: The Last Strand`)

Adds an interactive, in-game **3D Model Studio & Asset Importer** to *RGSHSC: The Last Strand*, allowing players to drag and drop `.glb`, `.gltf`, and `.obj` files directly from their computer into the game, preview them in a real-time 3D turntable viewport, fine-tune scale, rotation, vertical offset, and PBR material properties, and bind them to any buildable structure, RGSHSC Cloner stage, survivor avatar, or harvestable world resource node.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and UX choices incorporate your preferences from our initial planning questions. Please review and click **Proceed** to build the 3D Model Importer.

- **Confirmed Decision 1 — Ingestion Workflow**: In-game drag-and-drop file uploader supporting `.glb`, `.gltf` (including Draco-compressed meshes), and `.obj` files directly in the browser, alongside optional direct URL loading for externally hosted models.
- **Confirmed Decision 2 — Target Game Slots**: Custom 3D models can be assigned to any of the four core entity categories:
  1. **Buildable Structures & Base Props** (Foundation Deck, Reinforced Wall, Thermal Roof, Solar Generator, Water Condenser, Campfire)
  2. **RGSHSC Cloner Machine Stages** (Tier 1 Cryo-Stasis Chamber, Tier 2 Nutrient Bioreactor, Tier 3 Gene Shifter Matrix, Tier 4 RGSHSC Master Cloner)
  3. **Player & Survivor Character Avatars** (First-person tool/hand rig & multiplayer co-op survivor avatars)
  4. **Harvestable World Resources** (Mutated Trees / Wood, Quartz Crystal Nodes, Scrap Metal Wreckage, Biomass Flora)
- **Confirmed Decision 3 — Transform & Material Pipeline**: Interactive studio controls for uniform scale multiplier (`0.1x` – `10x` with automatic bounding-box normalization), 3-axis rotation (`X / Y / Z` degrees), ground pivot offset (`Y` elevation alignment), and PBR material overrides (tint color, metalness, roughness, emissive glow, and wireframe inspection).

---

## 1. Overview & Core Concept

- **What It Does**: Provides a seamless bridge between external 3D creation tools (Blender, Maya, Blockbench, Sketchfab, Unity) and the live Three.js survival world. Players can open the **3D Model Studio** from the bottom dock or via keyboard shortcut `[M]`, drop a `.glb`, `.gltf`, or `.obj` file, inspect and calibrate it on a live lighted turntable, and hot-swap any procedural asset in the live world or spawn it directly as a custom prop.
- **Target Audience / Persona**: Game creators, 3D artists, and players who want to customize *RGSHSC: The Last Strand* with their own 3D meshes, test how custom assets look under the game's PBR lighting and fog, and include those custom bindings in their Unity export workflow.
- **Key Value**: Zero-friction 3D asset testing and hot-swapping in a running first-person 3D game—automatically normalizing wildly different model scales and pivot points from external 3D editors so models sit flush on the terrain without breaking gameplay collisions or raycasting.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Opening the Studio**: Clicking the **3D Models [M]** button in the bottom dock (or pressing `M`) unlocks the mouse cursor and opens the **3D Model Studio Modal** over the paused/ambient game canvas.
  2. **Target Slot Selection**: The left sidebar organizes all replaceable game entities into 4 clear tabs (*Cloner Tiers*, *Base Structures*, *World Resources*, *Survivor & Tool*). Each slot displays whether it is currently using the default procedural mesh or a custom imported 3D model.
  3. **Drag-and-Drop Upload**: Dragging a `.glb`, `.gltf`, or `.obj` file onto the dropzone (or clicking to browse files / paste a model URL) parses the binary/text buffer directly in memory via `GLTFLoader` / `OBJLoader`.
  4. **Turntable Calibration & Material Tuning**: The central interactive 3D preview canvas renders the uploaded model on a calibrated reference grid with a human-scale silhouette marker (`1.8m` reference) so the user can immediately judge scale. Real-time sliders adjust:
     - **Auto-Normalize & Scale**: Normalizes the model's bounding box to match the target slot's canonical footprint, with a fine-tune scale slider (`0.1x` to `5.0x`).
     - **Orientation & Grounding**: `X`, `Y`, `Z` rotation sliders (`-180°` to `+180°`), a "Snap Bottom to Ground" button, and a vertical `Y Offset` slider.
     - **PBR Material Enhancer**: Optional toggle to preserve original embedded textures/materials or apply custom PBR overrides (Albedo Tint, Roughness `0.0–1.0`, Metalness `0.0–1.0`, Emissive Color & Intensity) and automatic shadow casting/receiving.
  5. **Live World Hot-Swap**: Clicking **Apply to Game World** immediately replaces existing instances of that resource, structure, cloner tier, or avatar in the live 3D scene—and updates the build ghost preview so newly built structures use the custom 3D model. Users can also click **Reset to Procedural Default** at any time.

- **Visual Identity & Theme**:
  - **Aesthetic Direction**: High-precision sci-fi engineering workbench matching the existing *RGSHSC* cryo-biotech HUD.
  - **Color Palette & Mood**: Deep obsidian slate (`#060910` / `bg-slate-950/95`), structural slate hairline borders (`border-slate-800`), electric cryo-cyan primary accents (`#06B6D4`), emerald confirmation states (`#10B981`), and amber placement indicators (`#F59E0B`).
  - **Typography & Hierarchy**: `Plus Jakarta Sans` for crisp UI controls and category headers paired with `JetBrains Mono` (`tabular-nums`) for bounding-box dimensions, vertex/triangle counts, scale multipliers, and degree readouts.
  - **Component Styling & Layout**: Split-pane studio modal with a 360-degree interactive Three.js preview viewport in the center, slot selector on the left, and transform/material inspector on the right. Clean unboxed metadata readouts (`Vertices · Triangles · Dimensions (m)`) following strict anti-slop and zero-pill discipline.
- **Interactive Feedback & Motion**: Smooth drag-over highlight states, instant bounding-box wireframe toggle in the previewer, real-time slider updates with zero lag, and toast notifications in the HUD when a model is hot-swapped into the sector.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side Memory Parsing (`ArrayBuffer` / `ObjectURL`) + Automatic Bounding-Box Normalization**
  - *Chosen Approach*: Parse dropped `.glb`/`.gltf` and `.obj` files directly in client memory using Three.js `GLTFLoader` (with `DRACOLoader` support) and `OBJLoader`, then wrap the loaded `THREE.Group` in a normalized container whose bottom-center pivot is aligned to `(0, 0, 0)` and scaled to the target slot's canonical size before applying user slider offsets.
  - *Why*: 3D models exported from Blender, Maya, or Sketchfab often have arbitrary scales (e.g., `100x` too large in centimeters) or off-center origins. Normalizing to a canonical bounding box first ensures the model never swallows the entire map or floats underground, while still giving the user full manual slider control.
  - *Alternatives Considered*: Raw unscaled insertion into the scene, which frequently causes models to be invisible (microscopic or gigantic) or misaligned with raycast hitboxes.

- **Decision 2: Prototype Cloning & Embedded Animation Preservation**
  - *Chosen Approach*: Store a master normalized `THREE.Group` prototype per customized slot in a central registry inside the engine. Whenever the world spawns or updates a structure, resource node, cloner stage, or survivor avatar, clone the prototype and preserve raycast `userData` (`nodeId`, `structureId`) on all child meshes.
  - *Why*: In *RGSHSC: The Last Strand*, harvesting resources and upgrading the cloner rely on raycasting against scene meshes. Automatically tagging all imported child meshes with the parent entity's interaction metadata guarantees that custom trees, crystals, and cloner stages remain 100% harvestable and interactive.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        RGSHSC: THE LAST STRAND (App)                       │
├───────────────────────────────┬────────────────────────────────────────────┤
│   BottomDock & HUD Shortcut   │        ModelImporterModal (Studio UI)      │
│  • "3D Models [M]" Button     │  • Slot Picker (Cloner / Base / Resource / │
│  • Active Custom Model Count  │    Survivor Avatar)                        │
│                               │  • Drag & Drop Zone (.glb / .gltf / .obj)  │
│                               │  • Live Turntable Preview Canvas           │
│                               │  • Scale / Rotation / Y-Offset / PBR Panel │
└───────────────┬───────────────┴─────────────────────┬──────────────────────┘
                │                                     │
                ▼                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                   CustomModelRegistry & ThreeEngine                        │
│  • GLTFLoader + DRACOLoader + OBJLoader pipeline                           │
│  • Bounding-Box Normalizer (bottom-center pivot + canonical slot scale)    │
│  • Transform & PBR Override Applicator (roughness, metalness, tint, glow)  │
│  • Live Scene Hot-Swapper:                                                 │
│     ├─ Replaces existing ResourceNodes (wood, quartz, scrap, biomass)      │
│     ├─ Replaces built StructureItems & active placement Ghost Mesh         │
│     ├─ Replaces RGSHSC Cloner Stage (Tiers 1–4)                            │
│     └─ Replaces Survivor Avatar & First-Person Tool meshes                 │
└────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **`ModelTargetCategory`**: `'cloner' | 'structure' | 'resource' | 'avatar'`
- **`ModelSlotId`**: Union of all `StructureType` values (`'foundation'`, `'wall'`, `'roof'`, `'solar_panel'`, `'water_condenser'`, `'campfire'`, `'cryo_stasis_pod'`, `'nutrient_bioreactor'`, `'gene_shifter_matrix'`, `'rgshsc_core'`), all world `ResourceType` values (`'wood'`, `'quartzCrystal'`, `'scrapMetal'`, `'biomass'`), and avatar slots (`'survivor_avatar'`, `'fp_tool'`).
- **`CustomModelTransform`**:
  - `scale`: `number` (multiplier relative to normalized slot size, default `1.0`)
  - `rotation`: `[number, number, number]` (Euler degrees `[rx, ry, rz]`)
  - `yOffset`: `number` (vertical grounding adjustment in meters)
  - `autoNormalize`: `boolean` (whether to normalize raw bounding box to slot size)
  - `overrideMaterial`: `boolean` (whether to apply custom PBR overrides)
  - `tintColor`: `string` (hex color)
  - `roughness`: `number` (`0.0` – `1.0`)
  - `metalness`: `number` (`0.0` – `1.0`)
  - `emissiveIntensity`: `number` (`0.0` – `2.0`)
  - `wireframe`: `boolean`
- **`CustomModelEntry`**:
  - `slotId`: `ModelSlotId`
  - `fileName`: `string`
  - `format`: `'glb' | 'gltf' | 'obj'`
  - `vertexCount`: `number`
  - `triangleCount`: `number`
  - `originalDimensions`: `[number, number, number]`
  - `transform`: `CustomModelTransform`

### Interactive Component & State Mapping

1. **File Drop / File Picker / URL Input**:
   - Validates extension (`.glb`, `.gltf`, `.obj`), reads `ArrayBuffer` or text, parses via `GLTFLoader` or `OBJLoader`, computes initial `THREE.Box3` bounds, counts vertices/triangles, and mounts the mesh into the studio turntable previewer.
   - Displays clear error feedback if a file is corrupted or unsupported.
2. **Real-Time Transform & Material Sliders**:
   - Adjusting `scale`, `rotation`, `yOffset`, or PBR sliders immediately mutates the preview mesh in the turntable viewport and updates the numeric readout (`tabular-nums`).
   - Clicking **Snap to Ground** recalculates the lowest vertex `min.y` after rotation and sets `yOffset` so the model sits flush on `y = 0`.
3. **Hot-Swapping into Live World (`Apply to Game World`)**:
   - Saves the configured `CustomModelEntry` and prototype `THREE.Group` into `ThreeEngine`.
   - Traverses matching entities currently in the live `scene` (e.g., all `wood` trees, all `wall` structures, the active `clonerStage`, or remote survivor avatars), swaps their visual mesh with a freshly cloned instance of the custom model, and preserves their collision/raycast `userData` (`nodeId` or `structureId`).
4. **Resetting (`Reset to Default`)**:
   - Removes the custom override for the selected `ModelSlotId` and restores the original multi-part procedural mesh across the live scene.
5. **Unity Export Integration**:
   - Includes a manifest of any custom imported 3D model slots and their calibrated scale/rotation/PBR settings inside the Unity Exporter modal so the user's custom asset mappings carry over cleanly to their Unity project.
