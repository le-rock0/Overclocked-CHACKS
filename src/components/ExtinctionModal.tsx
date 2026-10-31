import React from 'react';
import { Skull, RotateCcw, HeartPulse, Dna, Sprout, Cpu, AlertOctagon } from 'lucide-react';
import { EcoStats } from '../types/game';

interface ExtinctionModalProps {
  isOpen: boolean;
  reason: 'health' | 'dna';
  dayCount: number;
  clonerStage: number;
  structuresCount: number;
  dnaIntegrity: number;
  ecoStats: EcoStats;
  onReviveAndContinue: () => void;
  onRestartExpedition: () => void;
}

export const ExtinctionModal: React.FC<ExtinctionModalProps> = ({
  isOpen,
  reason,
  dayCount,
  clonerStage,
  structuresCount,
  dnaIntegrity,
  ecoStats,
  onReviveAndContinue,
  onRestartExpedition,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 pointer-events-auto animate-in fade-in duration-300 select-none">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border-2 border-rose-500/70 shadow-[0_0_70px_rgba(244,63,94,0.35)] p-6 md:p-8 text-center space-y-6">
        {/* Top Crimson Emblem */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-inner">
          <Skull className="w-9 h-9" />
        </div>

        {/* Extinction Headline & Narrative */}
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-950/90 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-widest">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>Critical Failure · Carrier Vital Signs Flatlined (0% Health)</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            The Extinction of Humanity
          </h2>

          <p className="text-slate-300 text-xs md:text-sm leading-relaxed max-w-lg mx-auto">
            {reason === 'health'
              ? 'Your health reached zero in the wasteland before the Reproductive Gene-Shifting Homo Sapien Cloner (RGSHSC) could complete human gestation. With the final carrier lost and no one left to safeguard the last DNA strand, Homo sapiens has vanished from Earth.'
              : 'Thermal degradation destroyed the last viable human genome before cryogenic stasis could be established. The genetic lineage of humanity has been lost forever.'}
          </p>
        </div>

        {/* Final Expedition Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono-nums">
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase">Days Survived</span>
            <span className="font-bold text-white text-sm">Day {dayCount}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase">RGSHSC Tier</span>
            <span className="font-bold text-violet-400 text-sm">{clonerStage} / 4</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase">DNA Stability</span>
            <span className="font-bold text-cyan-400 text-sm">{Math.round(dnaIntegrity)}%</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase">Seeds Planted</span>
            <span className="font-bold text-emerald-400 text-sm">
              {ecoStats.seedsPlanted} / {ecoStats.treesCut * 2}
            </span>
          </div>
        </div>

        {/* Biosphere & SDG Survival Lesson Box */}
        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-left space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-300 uppercase tracking-wider">
            <Dna className="w-3.5 h-3.5 text-rose-400" />
            <span>Why Survival Requires Sustainable Systems</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Preventing extinction requires balancing immediate human needs—<strong className="text-cyan-300">Clean Water (SDG #6)</strong> and{' '}
            <strong className="text-amber-300">Food Rations (SDG #2)</strong>—with long-term{' '}
            <strong className="text-emerald-300">Reforestation (SDG #15)</strong> and{' '}
            <strong className="text-violet-300">Cryogenic & Scientific Infrastructure (SDG #9)</strong>. Keep your Hydration and Energy above 0% and warm yourself near a Campfire (`[E]`) or use Bio-Regen Stims.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onReviveAndContinue}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
          >
            <HeartPulse className="w-4 h-4" />
            <span>Emergency Clone Revive (Keep Base)</span>
          </button>

          <button
            type="button"
            onClick={onRestartExpedition}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-rose-400" />
            <span>New Expedition (Return to Title)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
