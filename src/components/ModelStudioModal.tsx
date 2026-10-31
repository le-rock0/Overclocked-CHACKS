import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  X,
  Upload,
  Box,
  RotateCcw,
  Check,
  Sparkles,
  Download,
  Sliders,
  Layers,
  Eye,
  ArrowDownToLine,
  Link2,
  PlusCircle,
  AlertCircle,
  User,
  Map,
  Image as ImageIcon,
  FileJson,
  Mountain,
} from 'lucide-react';
import {
  CustomMapConfig,
  CustomModelEntry,
  CustomModelTransform,
  ModelSlotId,
  ModelTargetCategory,
  TerrainPreset,
} from '../types/game';
import {
  customModelRegistry,
  DEFAULT_MODEL_TRANSFORM,
  MODEL_SLOTS,
  ParsedModelResult,
} from '../game/customModelRegistry';
import { createProceduralDefaultMesh } from '../game/proceduralAssets';
import { unityExporter } from '../game/unityExporter';

interface ModelStudioModalProps {
  isOpen: boolean;
  initialCategory?: ModelTargetCategory;
  onClose: () => void;
  onApplyModelToWorld: (slotId: ModelSlotId, fileName: string) => void;
  onResetSlotToDefault: (slotId: ModelSlotId) => void;
  onSpawnPreviewInWorld: (slotId: ModelSlotId) => void;
  mapConfig: CustomMapConfig;
  onUpdateMapConfig: (partial: Partial<CustomMapConfig>) => void;
  onUploadHeightmap: (file: File) => Promise<void>;
  onExportWorldMapJson: () => void;
  onImportWorldMapJson: (file: File) => Promise<void>;
}

export const ModelStudioModal: React.FC<ModelStudioModalProps> = ({
  isOpen,
  initialCategory = 'map',
  onClose,
  onApplyModelToWorld,
  onResetSlotToDefault,
  onSpawnPreviewInWorld,
  mapConfig,
  onUpdateMapConfig,
  onUploadHeightmap,
  onExportWorldMapJson,
  onImportWorldMapJson,
}) => {
  const [activeCategory, setActiveCategory] = useState<ModelTargetCategory>(initialCategory);
  const [selectedSlotId, setSelectedSlotId] = useState<ModelSlotId>('world_map');
  const [transform, setTransform] = useState<CustomModelTransform>({ ...DEFAULT_MODEL_TRANSFORM });
  const [pendingParsed, setPendingParsed] = useState<ParsedModelResult | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [autoRotatePreview, setAutoRotatePreview] = useState(true);
  const [showHumanScaleRef, setShowHumanScaleRef] = useState(true);
  const [registeredEntries, setRegisteredEntries] = useState<CustomModelEntry[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const heightmapInputRef = useRef<HTMLInputElement>(null);
  const jsonMapInputRef = useRef<HTMLInputElement>(null);
  const previewMountRef = useRef<HTMLDivElement>(null);
  const previewSceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    turntableGroup: THREE.Group;
    humanRefGroup: THREE.Group;
    frameId: number;
  } | null>(null);

  const isDraggingTurntable = useRef(false);
  const prevMouseX = useRef(0);
  const turntableYaw = useRef(0.4);
  const cameraDist = useRef(6.0);

  // Sync registry entries
  useEffect(() => {
    const sync = () => setRegisteredEntries(customModelRegistry.getAllEntries());
    sync();
    return customModelRegistry.subscribe(sync);
  }, []);

  // Load slot state when switching selectedSlotId
  useEffect(() => {
    setErrorMsg(null);
    const existingEntry = customModelRegistry.getEntry(selectedSlotId);
    const existingRaw = customModelRegistry.getRawGroup(selectedSlotId);
    if (existingEntry && existingRaw) {
      setTransform({
        ...existingEntry.transform,
        rotation: [...existingEntry.transform.rotation] as [number, number, number],
      });
      setPendingParsed({
        rawGroup: existingRaw,
        format: existingEntry.format,
        vertexCount: existingEntry.vertexCount,
        triangleCount: existingEntry.triangleCount,
        originalDimensions: existingEntry.originalDimensions,
      });
      setPendingFileName(existingEntry.fileName);
    } else {
      setTransform({ ...DEFAULT_MODEL_TRANSFORM });
      setPendingParsed(null);
      setPendingFileName('');
    }
  }, [selectedSlotId, isOpen]);

  // Initialize 3D Turntable Preview Viewport when modal opens
  useEffect(() => {
    if (!isOpen || !previewMountRef.current) return;
    const container = previewMountRef.current;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 400;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1324);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.8, 6.2);
    camera.lookAt(0, 1.2, 0);

    // Studio 3-point lighting
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(6, 10, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.9);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.2);
    rimLight.position.set(-6, 5, -6);
    scene.add(rimLight);

    // Calibrated ground grid & pedestal
    const grid = new THREE.GridHelper(8, 16, 0x06b6d4, 0x1e293b);
    grid.position.y = 0.005;
    scene.add(grid);

    const discGeom = new THREE.CylinderGeometry(3.8, 4.0, 0.08, 32);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const disc = new THREE.Mesh(discGeom, discMat);
    disc.position.y = -0.04;
    disc.receiveShadow = true;
    scene.add(disc);

    // 1.8m Human-Scale Reference Silhouette
    const humanRefGroup = new THREE.Group();
    const refMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.28,
      roughness: 0.4,
    });
    const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 1.45, 12), refMat);
    bodyMesh.position.y = 0.725;
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), refMat);
    headMesh.position.y = 1.64;
    humanRefGroup.add(bodyMesh, headMesh);
    humanRefGroup.position.set(-2.1, 0, 0);
    scene.add(humanRefGroup);

    const turntableGroup = new THREE.Group();
    scene.add(turntableGroup);

    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const dt = clock.getDelta();
      if (!isDraggingTurntable.current && autoRotateRef.current) {
        turntableYaw.current += dt * 0.55;
      }
      turntableGroup.rotation.y = turntableYaw.current;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 500;
      const h = container.clientHeight || 400;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    previewSceneRef.current = {
      renderer,
      scene,
      camera,
      turntableGroup,
      humanRefGroup,
      frameId,
    };

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      previewSceneRef.current = null;
    };
  }, [isOpen]);

  const autoRotateRef = useRef(autoRotatePreview);
  useEffect(() => {
    autoRotateRef.current = autoRotatePreview;
  }, [autoRotatePreview]);

  // Toggle 1.8m human scale reference visibility
  useEffect(() => {
    if (previewSceneRef.current) {
      previewSceneRef.current.humanRefGroup.visible = showHumanScaleRef;
    }
  }, [showHumanScaleRef, isOpen]);

  // Rebuild turntable mesh whenever selectedSlotId, pendingParsed, or transform changes
  useEffect(() => {
    const ctx = previewSceneRef.current;
    if (!ctx) return;

    while (ctx.turntableGroup.children.length > 0) {
      ctx.turntableGroup.remove(ctx.turntableGroup.children[0]);
    }

    const slotMeta = customModelRegistry.getSlotMetadata(selectedSlotId);
    let previewMesh: THREE.Group;

    if (pendingParsed) {
      previewMesh = customModelRegistry.buildConfiguredGroup(
        pendingParsed.rawGroup,
        slotMeta,
        transform
      );
      if (selectedSlotId === 'fp_tool') {
        previewMesh.position.set(-0.3, 1.1, 0.55);
      } else if (selectedSlotId === 'world_map') {
        // Scale down the 120m world map on the studio turntable so it fits inside the 8m preview grid
        previewMesh.scale.multiplyScalar(5.0 / 120.0);
      }
    } else {
      previewMesh = createProceduralDefaultMesh(selectedSlotId);
    }

    ctx.turntableGroup.add(previewMesh);

    // Adjust camera distance smoothly for large vs compact slots
    const previewSize = selectedSlotId === 'world_map' ? 4.5 : slotMeta.canonicalSize;
    const idealDist = Math.max(3.2, Math.min(9.5, previewSize * 1.65));
    cameraDist.current = idealDist;
    ctx.camera.position.set(0, previewSize * 0.55 + 0.8, idealDist);
    ctx.camera.lookAt(0, previewSize * 0.35, 0);
  }, [selectedSlotId, pendingParsed, transform, isOpen]);

  if (!isOpen) return null;

  const slotMeta = customModelRegistry.getSlotMetadata(selectedSlotId);
  const isSlotCustomized = customModelRegistry.hasCustomModel(selectedSlotId);
  const categorySlots = MODEL_SLOTS.filter((s) => s.category === activeCategory);

  const showTempBanner = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 3500);
  };

  const handleFileUpload = async (file: File) => {
    setIsLoadingFile(true);
    setErrorMsg(null);
    try {
      const parsed = await customModelRegistry.parseFile(file);
      const nextTransform: CustomModelTransform = {
        ...DEFAULT_MODEL_TRANSFORM,
      };
      setPendingParsed(parsed);
      setPendingFileName(file.name);
      setTransform(nextTransform);

      // Immediately register and hot-swap so dropping a file works in 1 step
      customModelRegistry.registerCustomModel(selectedSlotId, file.name, parsed, nextTransform);
      onApplyModelToWorld(selectedSlotId, file.name);
      showTempBanner(`Loaded & applied "${file.name}" to ${slotMeta.name}!`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to parse 3D model file.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleUrlLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setIsLoadingFile(true);
    setErrorMsg(null);
    try {
      const { result, fileName } = await customModelRegistry.parseUrl(urlInput);
      const nextTransform: CustomModelTransform = { ...DEFAULT_MODEL_TRANSFORM };
      setPendingParsed(result);
      setPendingFileName(fileName);
      setTransform(nextTransform);
      customModelRegistry.registerCustomModel(selectedSlotId, fileName, result, nextTransform);
      onApplyModelToWorld(selectedSlotId, fileName);
      showTempBanner(`Loaded "${fileName}" from URL and applied to ${slotMeta.name}!`);
      setUrlInput('');
      setShowUrlInput(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not load model from URL (check CORS or file format).');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const updateTransformField = <K extends keyof CustomModelTransform>(
    key: K,
    value: CustomModelTransform[K]
  ) => {
    const updated = { ...transform, [key]: value };
    setTransform(updated);
    if (pendingParsed) {
      customModelRegistry.registerCustomModel(
        selectedSlotId,
        pendingFileName || 'custom_model.glb',
        pendingParsed,
        updated
      );
      onApplyModelToWorld(selectedSlotId, pendingFileName || 'custom_model.glb');
    }
  };

  const updateRotationAxis = (axisIndex: 0 | 1 | 2, deg: number) => {
    const nextRot: [number, number, number] = [...transform.rotation] as [number, number, number];
    nextRot[axisIndex] = deg;
    updateTransformField('rotation', nextRot);
  };

  const handleResetSlot = () => {
    customModelRegistry.clearSlotModel(selectedSlotId);
    setPendingParsed(null);
    setPendingFileName('');
    setTransform({ ...DEFAULT_MODEL_TRANSFORM });
    onResetSlotToDefault(selectedSlotId);
    showTempBanner(`Restored procedural default mesh for ${slotMeta.name}.`);
  };

  const handleDownloadStarterTemplate = async () => {
    await unityExporter.exportSlotTemplate(selectedSlotId, 'glb');
    showTempBanner(`Downloaded RGSHSC_${selectedSlotId}.glb starter template!`);
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 pointer-events-auto select-none"
    >
      <div className="relative w-full max-w-6xl h-[88vh] rounded-2xl bg-slate-900 border border-slate-700/90 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                3D Model & World Map Importer Studio
              </h2>
              <p className="text-xs text-slate-400">
                Import <span className="text-cyan-300 font-mono-nums">3D Maps (.glb/.obj)</span>,{' '}
                <span className="text-emerald-300 font-mono-nums">Heightmaps (.png/.jpg)</span>,{' '}
                <span className="text-amber-300 font-mono-nums">World Maps (.json)</span>, or custom 3D structures & avatars
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-mono-nums">
              <span>Custom Active:</span>
              <span className="text-cyan-400 font-bold">{registeredEntries.length}</span>
              <span aria-hidden="true">/</span>
              <span>{MODEL_SLOTS.length} Slots</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main 3-Column Studio Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* Column 1: Target Slot Selector (3 cols) */}
          <div className="lg:col-span-3 border-r border-slate-800 bg-slate-950/40 flex flex-col min-h-0">
            {/* Category Tabs */}
            <div className="grid grid-cols-2 gap-1 p-2.5 border-b border-slate-800 bg-slate-950/80">
              {(
                [
                  { id: 'map', label: '🗺️ World Map' },
                  { id: 'cloner', label: 'Cloner Tiers' },
                  { id: 'structure', label: 'Base Props' },
                  { id: 'resource', label: 'Resources' },
                  { id: 'avatar', label: 'Avatar & Tool' },
                ] as Array<{ id: ModelTargetCategory; label: string }>
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(tab.id);
                    const first = MODEL_SLOTS.find((s) => s.category === tab.id);
                    if (first) setSelectedSlotId(first.slotId);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    tab.id === 'map' ? 'col-span-2 ' : ''
                  }${
                    activeCategory === tab.id
                      ? 'bg-cyan-500 text-slate-950 shadow-sm font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Slot List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {categorySlots.map((slot) => {
                const entry = customModelRegistry.getEntry(slot.slotId);
                const isSelected = selectedSlotId === slot.slotId;

                return (
                  <button
                    key={slot.slotId}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.slotId)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/95 border-cyan-500/70 shadow-md'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate">{slot.name}</span>
                      <span
                        className={`text-[10px] font-mono-nums shrink-0 ${
                          entry ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                        }`}
                      >
                        {entry ? 'Custom 3D' : 'Procedural'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-snug">
                      {slot.description}
                    </p>
                    {entry && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-800 text-[10px] font-mono-nums text-cyan-300 truncate">
                        File: {entry.fileName} · {entry.triangleCount.toLocaleString()} tris
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column 2: Drag & Drop Zone + Live 3D Turntable Viewport (5 cols) */}
          <div className="lg:col-span-5 flex flex-col min-h-0 bg-slate-950/70 border-r border-slate-800">
            {/* Drag & Drop Upload Header Bar */}
            <div className="p-3.5 border-b border-slate-800 space-y-2.5">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1.5 ${
                  isDraggingOver
                    ? 'border-cyan-400 bg-cyan-500/15'
                    : 'border-slate-700 hover:border-cyan-500/60 bg-slate-900/70 hover:bg-slate-900'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".glb,.gltf,.obj"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                    e.target.value = '';
                  }}
                />
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                  <Upload className="w-4 h-4" />
                  <span>
                    {isLoadingFile
                      ? 'Parsing 3D Geometry...'
                      : `Drag & Drop .GLB, .GLTF, or .OBJ for "${slotMeta.name}"`}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  or click to browse your computer · Auto-normalizes scale & grounds pivot
                </span>
              </div>

              {/* Secondary Actions: Load from URL or Download Starter GLB */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowUrlInput((prev) => !prev)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{showUrlInput ? 'Hide URL Loader' : 'Load from URL'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadStarterTemplate}
                  title="Download the current mesh as a .glb file to edit in Blender and re-upload"
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Template (.GLB)</span>
                </button>
              </div>

              {showUrlInput && (
                <div className="space-y-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <form onSubmit={handleUrlLoad} className="flex gap-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://raw.githubusercontent.com/.../model.glb"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono-nums"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      Load URL
                    </button>
                  </form>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 mr-1">Quick Test Links:</span>
                    {[
                      {
                        label: 'Sci-Fi Damaged Helmet',
                        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
                      },
                      {
                        label: 'Expressive Robot',
                        url: 'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
                      },
                      {
                        label: 'Cesium Man Avatar',
                        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb',
                      },
                      {
                        label: 'Sci-Fi Lantern Tower',
                        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Lantern/glTF-Binary/Lantern.glb',
                      },
                      {
                        label: 'BrainStem Mech',
                        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BrainStem/glTF-Binary/BrainStem.glb',
                      },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={async () => {
                          setUrlInput(preset.url);
                          setIsLoadingFile(true);
                          setErrorMsg(null);
                          try {
                            const { result, fileName } = await customModelRegistry.parseUrl(preset.url);
                            const nextTransform: CustomModelTransform = { ...DEFAULT_MODEL_TRANSFORM };
                            setPendingParsed(result);
                            setPendingFileName(fileName);
                            setTransform(nextTransform);
                            customModelRegistry.registerCustomModel(selectedSlotId, fileName, result, nextTransform);
                            onApplyModelToWorld(selectedSlotId, fileName);
                            showTempBanner(`Loaded "${fileName}" and applied to ${slotMeta.name}!`);
                          } catch (err: any) {
                            setErrorMsg(err?.message || 'Failed to load preset URL.');
                          } finally {
                            setIsLoadingFile(false);
                          }
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-300 border border-slate-700 text-[10px] text-slate-300 transition-colors cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-950/90 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {statusBanner && (
                <div className="p-2.5 rounded-lg bg-emerald-950/90 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{statusBanner}</span>
                </div>
              )}
            </div>

            {/* Interactive 3D Turntable Canvas */}
            <div className="relative flex-1 min-h-[240px]">
              <div
                ref={previewMountRef}
                onMouseDown={(e) => {
                  isDraggingTurntable.current = true;
                  prevMouseX.current = e.clientX;
                }}
                onMouseMove={(e) => {
                  if (!isDraggingTurntable.current) return;
                  const dx = e.clientX - prevMouseX.current;
                  prevMouseX.current = e.clientX;
                  turntableYaw.current += dx * 0.01;
                }}
                onMouseUp={() => {
                  isDraggingTurntable.current = false;
                }}
                onMouseLeave={() => {
                  isDraggingTurntable.current = false;
                }}
                className="w-full h-full cursor-grab active:cursor-grabbing"
              />

              {/* Viewport Overlay Controls */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div className="px-2.5 py-1 rounded-md bg-slate-950/85 border border-slate-800 text-[11px] text-slate-300 font-mono-nums">
                  {pendingParsed ? (
                    <span>
                      {pendingFileName} · {pendingParsed.vertexCount.toLocaleString()} verts ·{' '}
                      {pendingParsed.triangleCount.toLocaleString()} tris
                    </span>
                  ) : (
                    <span>Previewing Procedural Default · Target Size: {slotMeta.canonicalSize}m</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => setShowHumanScaleRef((p) => !p)}
                    title="Toggle 1.8m Survivor Height Reference"
                    className={`px-2 py-1 rounded text-[11px] font-medium border cursor-pointer transition-colors flex items-center gap-1 ${
                      showHumanScaleRef
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-slate-900/90 border-slate-800 text-slate-400'
                    }`}
                  >
                    <User className="w-3 h-3" />
                    <span>1.8m Scale Ref</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAutoRotatePreview((p) => !p)}
                    className={`px-2 py-1 rounded text-[11px] font-medium border cursor-pointer transition-colors ${
                      autoRotatePreview
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-slate-900/90 border-slate-800 text-slate-400'
                    }`}
                  >
                    {autoRotatePreview ? 'Auto-Spin: On' : 'Auto-Spin: Off'}
                  </button>
                </div>
              </div>

              <div className="absolute bottom-2.5 left-3 text-[11px] text-slate-400 pointer-events-none">
                Drag horizontally to orbit model · Grid squares = 0.5m
              </div>
            </div>
          </div>

          {/* Column 3: Scale, Rotation, Grounding, Map Importer & PBR Material Inspector (4 cols) */}
          <div className="lg:col-span-4 flex flex-col justify-between min-h-0 bg-slate-900/90">
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Special Section when 'world_map' is selected: Heightmap Image, JSON Map & Biome Presets */}
              {selectedSlotId === 'world_map' && (
                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Map className="w-3.5 h-3.5 text-cyan-400" />
                      <span>World Map & Terrain Importer</span>
                    </span>
                    <span className="text-[10px] font-mono-nums px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                      180m × 180m Sector
                    </span>
                  </div>

                  {/* Hidden File Inputs for Heightmap (.png/.jpg) and World Map (.json) */}
                  <input
                    ref={heightmapInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      try {
                        await onUploadHeightmap(file);
                        showTempBanner(`Sculpted 3D terrain from heightmap "${file.name}"!`);
                      } catch (err: any) {
                        setErrorMsg(err?.message || 'Failed to load heightmap image.');
                      }
                    }}
                  />
                  <input
                    ref={jsonMapInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      try {
                        await onImportWorldMapJson(file);
                        showTempBanner(`Imported World Map "${file.name}"!`);
                      } catch (err: any) {
                        setErrorMsg(err?.message || 'Failed to import JSON map file.');
                      }
                    }}
                  />

                  {/* Import Heightmap Image & JSON Map Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => heightmapInputRef.current?.click()}
                      className="p-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Import Heightmap (.PNG)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => jsonMapInputRef.current?.click()}
                      className="p-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileJson className="w-3.5 h-3.5" />
                      <span>Import Map (.JSON)</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onExportWorldMapJson();
                      showTempBanner('Exported current World Map & Base Structures (.JSON)!');
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Save / Export Current Map (.JSON)</span>
                  </button>

                  {/* 5 One-Click Terrain Topography Presets */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                      <Mountain className="w-3 h-3 text-cyan-400" />
                      <span>Terrain Topography Preset:</span>
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: 'default', label: 'Rolling Hills' },
                          { id: 'flat', label: 'Flat Build Grid (0m)' },
                          { id: 'canyon', label: 'Shattered Canyon' },
                          { id: 'crater', label: 'Impact Crater' },
                          { id: 'islands', label: 'Terraced Ridges' },
                        ] as Array<{ id: TerrainPreset; label: string }>
                      ).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            onUpdateMapConfig({ terrainPreset: p.id, hideProceduralTerrain: false });
                            showTempBanner(`Applied "${p.label}" terrain map!`);
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                            mapConfig.terrainPreset === p.id
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Elevation Scale & Ground Biome Color */}
                  <div className="space-y-2 pt-1">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono-nums">
                        <span className="text-slate-300">Terrain Elevation Height</span>
                        <span className="text-cyan-400 font-bold">{mapConfig.elevationScale.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3.5"
                        step="0.1"
                        value={mapConfig.elevationScale}
                        onChange={(e) =>
                          onUpdateMapConfig({ elevationScale: parseFloat(e.target.value) })
                        }
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-300">Ground Biome Surface Tint</span>
                      <div className="flex items-center gap-1.5">
                        {['#94a3b8', '#34d399', '#fbbf24', '#f87171', '#38bdf8'].map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => onUpdateMapConfig({ biomeColor: hex })}
                            className={`w-5 h-5 rounded-full border cursor-pointer ${
                              mapConfig.biomeColor === hex ? 'border-white scale-110' : 'border-slate-700'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                        <input
                          type="color"
                          value={mapConfig.biomeColor}
                          onChange={(e) => onUpdateMapConfig({ biomeColor: e.target.value })}
                          className="w-6 h-6 rounded bg-transparent border border-slate-700 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Hide Default Ground Terrain when using a custom 3D .GLB/.OBJ Map */}
                    <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs cursor-pointer">
                      <span className="text-slate-300">Hide Default Ground (3D Map Only)</span>
                      <input
                        type="checkbox"
                        checked={mapConfig.hideProceduralTerrain}
                        onChange={(e) =>
                          onUpdateMapConfig({ hideProceduralTerrain: e.target.checked })
                        }
                        className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Section 1: Transform & Scale Calibration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Scale, Rotation & Grounding</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const resetT = { ...DEFAULT_MODEL_TRANSFORM };
                      setTransform(resetT);
                      if (pendingParsed) {
                        customModelRegistry.registerCustomModel(
                          selectedSlotId,
                          pendingFileName || 'custom_model.glb',
                          pendingParsed,
                          resetT
                        );
                        onApplyModelToWorld(selectedSlotId, pendingFileName || 'custom_model.glb');
                      }
                    }}
                    className="text-[11px] text-slate-400 hover:text-cyan-400 cursor-pointer"
                  >
                    Reset Sliders
                  </button>
                </div>

                {/* Auto-Normalize Checkbox */}
                <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs cursor-pointer">
                  <div>
                    <span className="font-semibold text-slate-200 block">
                      Auto-Fit to Slot Footprint ({slotMeta.canonicalSize}m)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Normalizes arbitrary Blender/Maya export units automatically
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={transform.autoNormalize}
                    onChange={(e) => updateTransformField('autoNormalize', e.target.checked)}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                </label>

                {/* Uniform Scale Multiplier */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono-nums">
                    <span className="text-slate-300">Scale Multiplier</span>
                    <span className="text-cyan-400 font-bold">{transform.scale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.05"
                    value={transform.scale}
                    onChange={(e) => updateTransformField('scale', parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* 3-Axis Rotation (X, Y, Z) */}
                <div className="grid grid-cols-3 gap-2">
                  {(['X Pitch', 'Y Yaw', 'Z Roll'] as const).map((label, idx) => {
                    const axis = idx as 0 | 1 | 2;
                    return (
                      <div key={label} className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                        <div className="flex justify-between text-[11px] font-mono-nums">
                          <span className="text-slate-400">{label}</span>
                          <span className="text-white">{transform.rotation[axis]}°</span>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="15"
                          value={transform.rotation[axis]}
                          onChange={(e) => updateRotationAxis(axis, parseInt(e.target.value, 10))}
                          className="w-full accent-cyan-500 cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Vertical Ground Offset (Y) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono-nums">
                    <span className="text-slate-300">Vertical Ground Offset (Y)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold">
                        {transform.yOffset >= 0 ? `+${transform.yOffset.toFixed(2)}m` : `${transform.yOffset.toFixed(2)}m`}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateTransformField('yOffset', 0)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowDownToLine className="w-3 h-3 text-cyan-400" />
                        <span>Snap to Ground</span>
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="-2.5"
                    max="2.5"
                    step="0.05"
                    value={transform.yOffset}
                    onChange={(e) => updateTransformField('yOffset', parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Section 2: PBR Material & Surface Overrides */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Material & PBR Surface Finishes</span>
                  </span>

                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transform.wireframe}
                      onChange={(e) => updateTransformField('wireframe', e.target.checked)}
                      className="w-3.5 h-3.5 accent-cyan-500 rounded cursor-pointer"
                    />
                    <span>Wireframe</span>
                  </label>
                </div>

                <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs cursor-pointer">
                  <div>
                    <span className="font-semibold text-slate-200 block">
                      Override Model Materials with Custom PBR
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Useful for untextured .OBJ meshes or matching cryo-tech aesthetics
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={transform.overrideMaterial}
                    onChange={(e) => updateTransformField('overrideMaterial', e.target.checked)}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                </label>

                {transform.overrideMaterial && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Surface Albedo & Glow Tint</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={transform.tintColor}
                          onChange={(e) => updateTransformField('tintColor', e.target.value)}
                          className="w-7 h-7 rounded bg-transparent border border-slate-700 cursor-pointer"
                        />
                        <span className="font-mono-nums text-xs text-slate-300">{transform.tintColor}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono-nums">
                        <span className="text-slate-400">Roughness</span>
                        <span className="text-white">{transform.roughness.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={transform.roughness}
                        onChange={(e) => updateTransformField('roughness', parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono-nums">
                        <span className="text-slate-400">Metalness</span>
                        <span className="text-white">{transform.metalness.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={transform.metalness}
                        onChange={(e) => updateTransformField('metalness', parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono-nums">
                        <span className="text-slate-400">Bioluminescent / Cryo Glow</span>
                        <span className="text-white">{transform.emissiveIntensity.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1.5"
                        step="0.05"
                        value={transform.emissiveIntensity}
                        onChange={(e) => updateTransformField('emissiveIntensity', parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/90 space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSpawnPreviewInWorld(selectedSlotId);
                    showTempBanner(`Spawned ${slotMeta.name} right in front of you!`);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Spawn in Front of Me</span>
                </button>

                {isSlotCustomized && (
                  <button
                    type="button"
                    onClick={handleResetSlot}
                    className="py-2.5 px-3 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Default</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Uploaded models automatically replace all matching objects across the live sector.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
