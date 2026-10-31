import React, { useState } from 'react';
import {
  Tablet,
  Droplet,
  Sprout,
  Utensils,
  Cpu,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  TreePine,
  Wrench,
  Sparkles,
  Globe,
  X,
} from 'lucide-react';
import { EcoStats, EquippedItem, Inventory, TabletSDGMessage } from '../types/game';

interface TabletOverlayProps {
  equippedItem: EquippedItem;
  onSwitchEquipment: (item: EquippedItem) => void;
  messages: TabletSDGMessage[];
  onMarkAllRead: () => void;
  ecoStats: EcoStats;
  inventory: Inventory;
  clonerStage: number;
  onPlantSeed: () => void;
  onEatFood: () => void;
  onTriggerSDGTopic: (category: 'water' | 'food' | 'trees' | 'innovation') => void;
}

export const TabletOverlay: React.FC<TabletOverlayProps> = ({
  equippedItem,
  onSwitchEquipment,
  messages,
  onMarkAllRead,
  ecoStats,
  inventory,
  clonerStage,
  onPlantSeed,
  onEatFood,
  onTriggerSDGTopic,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'water' | 'food' | 'trees' | 'innovation'>('all');
  const [dismissedBannerId, setDismissedBannerId] = useState<string | null>(null);

  const requiredSeeds = ecoStats.treesCut * 2;
  const seedsOwed = Math.max(0, requiredSeeds - ecoStats.seedsPlanted);
  const isMandateMet = seedsOwed === 0;

  const latestMessage = messages.length > 0 ? messages[0] : null;
  const unreadCount = messages.filter((m) => !m.read).length;

  const filteredMessages = messages.filter((m) =>
    selectedFilter === 'all' ? true : m.category === selectedFilter
  );

  const getCategoryIcon = (cat: 'water' | 'food' | 'trees' | 'innovation') => {
    if (cat === 'water') return <Droplet className="w-4 h-4 text-cyan-400" />;
    if (cat === 'food') return <Utensils className="w-4 h-4 text-amber-400" />;
    if (cat === 'innovation') return <Cpu className="w-4 h-4 text-violet-400" />;
    return <Sprout className="w-4 h-4 text-emerald-400" />;
  };

  const getCategoryBadgeStyle = (cat: 'water' | 'food' | 'trees' | 'innovation') => {
    if (cat === 'water') return 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300';
    if (cat === 'food') return 'bg-amber-500/15 border-amber-500/40 text-amber-300';
    if (cat === 'innovation') return 'bg-violet-500/15 border-violet-500/40 text-violet-300';
    return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
  };

  // When holding the Utility Weapon/Multi-Tool, show a sleek, compact incoming Tablet SDG notification pill
  if (equippedItem === 'tool') {
    if (!latestMessage || latestMessage.id === dismissedBannerId) return null;

    const isInnovation = latestMessage.category === 'innovation';

    return (
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={`fixed top-16 right-4 z-30 w-80 max-w-[90vw] rounded-xl bg-slate-950/92 border shadow-xl p-2.5 pointer-events-auto animate-in fade-in slide-in-from-right-4 duration-200 ${
          isInnovation ? 'border-violet-500/60' : 'border-cyan-500/50'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${
                isInnovation
                  ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                  : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
              }`}
            >
              {isInnovation ? <Cpu className="w-3.5 h-3.5" /> : <Tablet className="w-3.5 h-3.5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono-nums font-bold bg-emerald-500/20 text-emerald-300">
                  UN SDG #{latestMessage.sdgNumber}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {latestMessage.sdgTitle}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white truncate">{latestMessage.headline}</h4>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissedBannerId(latestMessage.id)}
            className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="mt-1.5 text-[11px] text-slate-300 line-clamp-2 leading-snug">
          {latestMessage.realWorldFact}
        </p>

        <div className="mt-2 flex items-center justify-between gap-2">
          <a
            href={latestMessage.sdgUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
          >
            <Globe className="w-3 h-3" />
            <span>UN SDG #{latestMessage.sdgNumber}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>

          <button
            type="button"
            onClick={() => {
              onMarkAllRead();
              onSwitchEquipment('tablet');
            }}
            className="px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Tablet className="w-3 h-3" />
            <span>Read on Tablet [2 / Q]</span>
          </button>
        </div>
      </div>
    );
  }

  // Full Handheld Biosphere Field Tablet Interface when `equippedItem === 'tablet'`
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-x-0 top-20 bottom-20 z-30 flex items-center justify-center px-4 pointer-events-none"
    >
      <div className="w-full max-w-5xl max-h-full flex flex-col rounded-2xl bg-slate-950/95 border-2 border-cyan-500/60 shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden pointer-events-auto">
        {/* Tablet Top Bezel / OS Header */}
        <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Tablet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  RGSHSC BIOSPHERE FIELD TABLET · SLOT [2]
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono-nums font-semibold">
                  UN SDG #2 · #6 · #9 · #15 LINKED
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Real-World Ecological & Technological Impact Monitor (Water · Food · Reforestation · SDG #9 Innovation)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSwitchEquipment('tool')}
              className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Switch to Utility Weapon [1 / Q]</span>
            </button>
          </div>
        </div>

        {/* Tablet Body Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Mandatory Reforestation Protocol Banner (2 Seeds Per 1 Tree Cut) */}
          <div
            className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              isMandateMet
                ? 'bg-emerald-950/35 border-emerald-500/50'
                : 'bg-amber-950/40 border-amber-500/60'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {isMandateMet ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Mandatory Reforestation Protocol: Plant 2 Seeds for Every 1 Tree Cut
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                To prevent irreversible biosphere collapse while constructing the RGSHSC Cloner, every felled tree requires{' '}
                <strong className="text-emerald-300">2 replacement saplings</strong> planted back into the soil.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap font-mono-nums">
              <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                <span className="text-slate-400 block text-[10px]">Trees Cut</span>
                <span className="font-bold text-white text-sm">{ecoStats.treesCut}</span>
              </div>

              <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                <span className="text-slate-400 block text-[10px]">Seeds Planted</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {ecoStats.seedsPlanted} / {requiredSeeds}
                </span>
              </div>

              <div
                className={`px-3 py-1.5 rounded-lg border text-xs ${
                  seedsOwed > 0
                    ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                    : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                }`}
              >
                <span className="block text-[10px] opacity-80">Mandate Debt</span>
                <span className="font-bold text-sm">
                  {seedsOwed > 0 ? `${seedsOwed} Seeds Owed` : 'Balanced ✓'}
                </span>
              </div>

              <button
                type="button"
                onClick={onPlantSeed}
                disabled={inventory.treeSeeds <= 0}
                className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                  inventory.treeSeeds > 0
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Sprout className="w-4 h-4" />
                <span>Plant Seed [R] ({inventory.treeSeeds})</span>
              </button>
            </div>
          </div>

          {/* 4 Core UN SDG Pillars Interactive Cards (Water SDG #6, Food SDG #2, Trees SDG #15, Innovation SDG #9) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Pillar 1: Clean Water (SDG 6) */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono-nums font-bold">
                    UN SDG #6
                  </span>
                  <Droplet className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="text-sm font-bold text-white">Clean Water & Sanitation</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Over <strong className="text-cyan-300">2.2 billion people</strong> in the real world lack safely managed drinking water. Every drop condensed or distilled sustains life.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <a
                  href="https://sdgs.un.org/goals/goal6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>UN SDG 6</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={() => onTriggerSDGTopic('water')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 cursor-pointer"
                >
                  Log Briefing
                </button>
              </div>
            </div>

            {/* Pillar 2: Zero Hunger & Sustainable Food (SDG 2) */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono-nums font-bold">
                    UN SDG #2 & #12
                  </span>
                  <Utensils className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-sm font-bold text-white">Zero Hunger & Nutrition</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Nearly <strong className="text-amber-300">733 million people</strong> face chronic hunger globally, while 1/3 of food produced is wasted. Sustainable food synthesis saves lives.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <a
                  href="https://sdgs.un.org/goals/goal2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>UN SDG 2</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={onEatFood}
                  disabled={inventory.foodRations <= 0}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    inventory.foodRations > 0
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Eat [F] ({inventory.foodRations})
                </button>
              </div>
            </div>

            {/* Pillar 3: Life on Land & Reforestation (SDG 15) */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono-nums font-bold">
                    UN SDG #15 & #13
                  </span>
                  <TreePine className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-sm font-bold text-white">Life on Land & Forests</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Earth loses <strong className="text-emerald-300">10 million hectares</strong> of forest each year. Planting 2 seeds for every tree cut restores carbon sinks & soil.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <a
                  href="https://sdgs.un.org/goals/goal15"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>UN SDG 15</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={() => onTriggerSDGTopic('trees')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 cursor-pointer"
                >
                  Log Briefing
                </button>
              </div>
            </div>

            {/* Pillar 4: Industry, Innovation & Infrastructure (SDG 9) */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-violet-500/40 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[10px] font-mono-nums font-bold">
                    UN SDG #9 · TIER {clonerStage}/4
                  </span>
                  <Cpu className="w-4 h-4 text-violet-400" />
                </div>
                <h3 className="text-sm font-bold text-white">Innovation & Infrastructure</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Building the <strong className="text-violet-300">Cryo-Stasis Chamber</strong>, Bioreactor, Gene Shifter & resilient base modules advances scientific R&D and sustainable infrastructure.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <a
                  href="https://sdgs.un.org/goals/goal9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>UN SDG 9</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={() => onTriggerSDGTopic('innovation')}
                  className="px-2 py-1 rounded bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-[11px] text-violet-200 font-semibold cursor-pointer"
                >
                  Log SDG #9
                </button>
              </div>
            </div>
          </div>

          {/* Live SDG Dispatch Feed */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Tablet SDG Dispatch Log ({filteredMessages.length})
                </span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-bold text-[10px] font-mono-nums">
                    {unreadCount} NEW
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    { id: 'all', label: 'All Dispatches' },
                    { id: 'innovation', label: 'Innovation (SDG #9)' },
                    { id: 'water', label: 'Water (SDG #6)' },
                    { id: 'food', label: 'Food (SDG #2)' },
                    { id: 'trees', label: 'Forests (SDG #15)' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      selectedFilter === tab.id
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getCategoryIcon(msg.category)}
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-mono-nums font-bold ${getCategoryBadgeStyle(
                          msg.category
                        )}`}
                      >
                        UN SDG #{msg.sdgNumber}: {msg.sdgTitle}
                      </span>
                      <span className="font-bold text-white text-xs">{msg.headline}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{msg.realWorldFact}</p>
                    <p className="text-[11px] text-emerald-400 font-medium">{msg.ecoActionRule}</p>
                  </div>

                  <a
                    href={msg.sdgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Official UN SDG #{msg.sdgNumber}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
