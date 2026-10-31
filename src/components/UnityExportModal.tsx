import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Code, 
  Box, 
  Layers, 
  CheckCircle2, 
  FileCode, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { unityExporter } from '../game/unityExporter';
import { StructureItem } from '../types/game';

interface UnityExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  structures: StructureItem[];
  clonerStage: number;
}

export const UnityExportModal: React.FC<UnityExportModalProps> = ({
  isOpen,
  onClose,
  structures,
  clonerStage,
}) => {
  const [exportFormat, setExportFormat] = useState<'gltf' | 'obj'>('gltf');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerSuccessNote = (msg: string) => {
    setDownloadSuccess(msg);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleExportMasterCloner = async () => {
    await unityExporter.exportClonerModel(exportFormat);
    triggerSuccessNote(`Exported RGSHSC_Master_Cloner.${exportFormat}`);
  };

  const handleExportModule = async (type: 'cryo' | 'bioreactor' | 'shifter' | 'shelter_foundation' | 'shelter_wall' | 'solar') => {
    await unityExporter.exportModuleModel(type, exportFormat);
    triggerSuccessNote(`Exported module.${exportFormat}`);
  };

  const handleExportSceneHierarchy = () => {
    unityExporter.exportBaseSceneHierarchy(structures, clonerStage);
    triggerSuccessNote('Exported RGSHSC_Unity_Scene_Hierarchy.json');
  };

  const handleDownloadScripts = () => {
    unityExporter.downloadUnityCSharpScripts();
    triggerSuccessNote('Downloaded Unity C# Scripts Package!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-none pointer-events-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col justify-between space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Unity 3D Bridge & Exporter</span>
                <span className="text-[10px] uppercase font-mono-nums px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Ready for Unity 2021+ / Unity 6
                </span>
              </h2>
              <p className="text-xs text-slate-400">Export procedural 3D models, scene hierarchy data, and C# game scripts</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {downloadSuccess && (
          <div className="p-3 rounded-lg bg-emerald-950/90 border border-emerald-800 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Format Selector */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold">Preferred 3D Mesh Format:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExportFormat('gltf')}
              className={`px-3 py-1.5 rounded-lg font-mono-nums font-semibold transition-colors cursor-pointer ${
                exportFormat === 'gltf' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              .glTF 2.0 (Recommended)
            </button>
            <button
              type="button"
              onClick={() => setExportFormat('obj')}
              className={`px-3 py-1.5 rounded-lg font-mono-nums font-semibold transition-colors cursor-pointer ${
                exportFormat === 'obj' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              .OBJ (Wavefront)
            </button>
          </div>
        </div>

        {/* Export Action Sections */}
        <div className="space-y-4 overflow-y-auto pr-1">
          {/* Section 1: Hero RGSHSC Cloner Model */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-white block">Master RGSHSC Cloner 3D Asset</span>
                <p className="text-xs text-slate-400">12-part composite model with gestation vat, rotating DNA helix, cryo pylons, and console</p>
              </div>
              <button
                type="button"
                onClick={handleExportMasterCloner}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Cloner ({exportFormat.toUpperCase()})</span>
              </button>
            </div>
          </div>

          {/* Section 2: Modular Tech & Shelter Components */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Individual Modular Prefab Models
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleExportModule('cryo')}
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs transition-colors cursor-pointer"
              >
                <span className="font-bold text-white block">Cryo-Stasis Pod</span>
                <span className="text-[10px] text-cyan-400">Export .{exportFormat}</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportModule('bioreactor')}
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs transition-colors cursor-pointer"
              >
                <span className="font-bold text-white block">Nutrient Bioreactor</span>
                <span className="text-[10px] text-cyan-400">Export .{exportFormat}</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportModule('shifter')}
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs transition-colors cursor-pointer"
              >
                <span className="font-bold text-white block">Gene Shifter Matrix</span>
                <span className="text-[10px] text-cyan-400">Export .{exportFormat}</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportModule('shelter_foundation')}
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs transition-colors cursor-pointer"
              >
                <span className="font-bold text-white block">Foundation Deck</span>
                <span className="text-[10px] text-slate-400">Export .{exportFormat}</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportModule('shelter_wall')}
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs transition-colors cursor-pointer"
              >
                <span className="font-bold text-white block">Wall with Viewport</span>
                <span className="text-[10px] text-slate-400">Export .{exportFormat}</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportModule('solar')}
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs transition-colors cursor-pointer"
              >
                <span className="font-bold text-white block">Solar Generator</span>
                <span className="text-[10px] text-slate-400">Export .{exportFormat}</span>
              </button>
            </div>
          </div>

          {/* Section 3: Scene Hierarchy JSON & C# Scripts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="font-bold text-white text-xs block">Active Base Layout (.json)</span>
              <p className="text-[11px] text-slate-400">
                Exports all {structures.length} placed shelter components with transforms and prefab references.
              </p>
              <button
                type="button"
                onClick={handleExportSceneHierarchy}
                className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Scene Hierarchy JSON</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="font-bold text-white text-xs block">Unity C# Scripts Package</span>
              <p className="text-[11px] text-slate-400">
                Includes <code className="text-cyan-400">RGSHSC_ClonerMachine.cs</code>, <code className="text-cyan-400">SurvivorPlayerController.cs</code>, and spawner scripts.
              </p>
              <button
                type="button"
                onClick={handleDownloadScripts}
                className="w-full py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Code className="w-3.5 h-3.5" />
                <span>Download Unity C# Scripts</span>
              </button>
            </div>
          </div>

          {/* Quick Unity Import Guide */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>How to import into Unity (3 Simple Steps):</span>
            </span>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] font-mono-nums">
              <li>Drag the exported <code className="text-cyan-400">.gltf</code> or <code className="text-cyan-400">.obj</code> models into your Unity project's <code className="text-slate-300">Assets/Models/</code> folder.</li>
              <li>Drag the exported C# scripts into <code className="text-slate-300">Assets/Scripts/</code>.</li>
              <li>Attach <code className="text-cyan-400">RGSHSC_ClonerMachine.cs</code> to the cloner mesh, press Play in Unity, and experience the full simulation!</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Return to Survival World
          </button>
        </div>
      </div>
    </div>
  );
};
