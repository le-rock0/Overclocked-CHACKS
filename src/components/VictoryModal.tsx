import React from 'react';
import { Sparkles, Dna, Download, ArrowRight } from 'lucide-react';

interface VictoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUnityModal: () => void;
  structuresCount: number;
  survivorsCount: number;
  dnaIntegrity: number;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  onClose,
  onOpenUnityModal,
  structuresCount,
  survivorsCount,
  dnaIntegrity,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-none pointer-events-auto animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.25)] p-6 md:p-8 text-center space-y-6">
        {/* Crown Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Sparkles className="w-8 h-8 fill-emerald-500/20" />
        </div>

        {/* Victory Headline */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Humanity Restored · RGSHSC Milestone Reached
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            The First New Human Has Awakened
          </h2>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed max-w-md mx-auto">
            Through hardship, resourcefulness, and protection of the last synthetic DNA strand, the Reproductive Gene-Shifting Homo Sapien Cloner has successfully gestated the next generation of humanity. The extinction has been reversed.
          </p>
        </div>

        {/* Mission Telemetry Stats */}
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono-nums">
          <div className="p-2 rounded bg-slate-900/60">
            <span className="text-slate-400 block text-[10px] uppercase">Final DNA Stability</span>
            <span className="font-bold text-cyan-400 text-sm">{Math.round(dnaIntegrity)}%</span>
          </div>

          <div className="p-2 rounded bg-slate-900/60">
            <span className="text-slate-400 block text-[10px] uppercase">Base Modules Built</span>
            <span className="font-bold text-amber-400 text-sm">{structuresCount}</span>
          </div>

          <div className="p-2 rounded bg-slate-900/60">
            <span className="text-slate-400 block text-[10px] uppercase">Survivors Co-Op</span>
            <span className="font-bold text-emerald-400 text-sm">{survivorsCount}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenUnityModal();
            }}
            className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Base to Unity</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>Continue in Wasteland</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
