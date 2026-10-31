import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Hammer, 
  Dna, 
  Wrench, 
  Users, 
  Download, 
  Send, 
  CheckCircle2,
  MousePointer,
  Lock,
  Box,
  XCircle
} from 'lucide-react';
import { Inventory, StructureType, RemoteSurvivor, ChatMessage } from '../types/game';

interface BottomDockProps {
  inventory: Inventory;
  clonerStage: number;
  activeBuildType: StructureType | null;
  onSelectBuildType: (type: StructureType | null) => void;
  onCraftItem: (recipeId: string) => void;
  onOpenUnityModal: () => void;
  onOpenModelStudio: () => void;
  customModelsCount: number;
  survivors: RemoteSurvivor[];
  chatMessages: ChatMessage[];
  onSendChat: (text: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isPointerLocked?: boolean;
  onTogglePointerLock?: () => void;
}

type DockTab = 'cloner' | 'shelter' | 'craft' | 'multiplayer';

export const BottomDock: React.FC<BottomDockProps> = ({
  inventory,
  clonerStage,
  activeBuildType,
  onSelectBuildType,
  onCraftItem,
  onOpenUnityModal,
  onOpenModelStudio,
  customModelsCount,
  survivors,
  chatMessages,
  onSendChat,
  isCollapsed,
  onToggleCollapse,
  isPointerLocked,
  onTogglePointerLock,
}) => {

  const [activeTab, setActiveTab] = useState<DockTab>('cloner');
  const [chatInput, setChatInput] = useState('');

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onSendChat(chatInput.trim());
      setChatInput('');
    }
  };

  const shelterItems: Array<{ type: StructureType; name: string; desc: string; costs: Partial<Record<keyof Inventory, number>> }> = [
    { type: 'foundation', name: 'Foundation Deck', desc: 'Snap grid base for modular shelter structure', costs: { wood: 4, scrapMetal: 2 } },
    { type: 'wall', name: 'Reinforced Wall', desc: 'Insulated storm barrier with quartz viewport', costs: { scrapMetal: 3, wood: 2 } },
    { type: 'roof', name: 'Thermal Roof', desc: 'Shields DNA container from radiation and heat', costs: { scrapMetal: 3, quartzCrystal: 1 } },
    { type: 'solar_panel', name: 'Solar Generator', desc: 'Harvests solar energy to charge machinery', costs: { quartzCrystal: 3, scrapMetal: 4 } },
    { type: 'water_condenser', name: 'Water Condenser', desc: 'Condenses atmospheric moisture into drinkable water', costs: { scrapMetal: 3, quartzCrystal: 2 } },
    { type: 'campfire', name: 'Campfire', desc: 'Restores warmth and protects DNA from freezing', costs: { wood: 3 } },
  ];

  const clonerTiers: Array<{ stage: number; type: StructureType; name: string; desc: string; benefit: string; costs: Partial<Record<keyof Inventory, number>> }> = [
    {
      stage: 1,
      type: 'cryo_stasis_pod',
      name: 'Tier 1: Cryo-Stasis Chamber',
      desc: 'Deep cryogenic pod to stabilize deteriorating human DNA sample.',
      benefit: 'Halts thermal DNA degradation; locks temperature at -18°C.',
      costs: { scrapMetal: 6, quartzCrystal: 4, naniteCircuit: 1 },
    },
    {
      stage: 2,
      type: 'nutrient_bioreactor',
      name: 'Tier 2: Nutrient Bioreactor',
      desc: 'Cultivates synthetic amniotic fluids and human protein matrices.',
      benefit: 'Prepares maternal synthesis medium for cell division.',
      costs: { biomass: 6, purifiedWater: 3, naniteCircuit: 2 },
    },
    {
      stage: 3,
      type: 'gene_shifter_matrix',
      name: 'Tier 3: Gene Shifter Matrix',
      desc: 'Quantum gene sequencer eliminating post-apocalyptic mutations.',
      benefit: 'Diversifies allele spectrum and ensures genetic viability.',
      costs: { quartzCrystal: 6, naniteCircuit: 3, scrapMetal: 5 },
    },
    {
      stage: 4,
      type: 'rgshsc_core',
      name: 'Tier 4: RGSHSC Master Cloner',
      desc: 'The complete Reproductive Gene Shifting Homo Sapien Cloner unit.',
      benefit: 'Enables human embryo synthesis and rebirth of humanity!',
      costs: { quartzCrystal: 8, naniteCircuit: 4, scrapMetal: 8, biomass: 8 },
    },
  ];

  const craftRecipes: Array<{
    id: string;
    name: string;
    desc: string;
    costs: Partial<Record<keyof Inventory, number>>;
    produces: string;
  }> = [
    { id: 'water', name: 'Purified Water', desc: 'Distill clean hydration (+30% Hydration · Logs UN SDG #6)', costs: { biomass: 2, wood: 1 }, produces: '1x Purified Water' },
    { id: 'food', name: 'Nutrient Food Ration', desc: 'Synthesize protein ration (+35% Energy · Logs UN SDG #2)', costs: { biomass: 2, purifiedWater: 1 }, produces: '2x Food Rations' },
    { id: 'seeds', name: 'Bio-Seed Extraction', desc: 'Extract viable saplings to fulfill 2-seeds-per-tree mandate (UN SDG #15)', costs: { biomass: 1 }, produces: '2x Tree Seeds' },
    { id: 'biomass_cultivate', name: 'Hydroponic Biomass Culture', desc: 'Regenerate luminescent flora cultures using purified water', costs: { purifiedWater: 1 }, produces: '3x Biomass' },
    { id: 'mineral_salvage', name: 'Scrap & Crystal Smelting', desc: 'Bio-leach timber ash & flora enzymes into metal & piezo-quartz', costs: { wood: 2, biomass: 1 }, produces: '2x Scrap + 2x Crystal' },
    { id: 'nanite', name: 'Nanite Circuit', desc: 'Forge cybernetic micro-logic (Logs UN SDG #9 Innovation)', costs: { scrapMetal: 4, quartzCrystal: 3 }, produces: '1x Nanite Circuit' },
    { id: 'medkit', name: 'Bio-Regen Stim', desc: 'Restores 40 Health and cleanses radiation', costs: { biomass: 4, purifiedWater: 1 }, produces: '1x Med-Stim' },
  ];

  const canAfford = (costs: Partial<Record<keyof Inventory, number>>) => {
    return Object.entries(costs).every(([k, v]) => (inventory[k as keyof Inventory] || 0) >= (v || 0));
  };

  if (isCollapsed) {
    return null;
  }

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-30 pointer-events-auto select-none"
      style={{
        bottom: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 'min(920px, 95vw)',
        width: '100%',
      }}
    >
      <div className="space-y-1">
          {/* Top Collapse Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              className="px-5 py-1.5 rounded-t-lg bg-slate-900 hover:bg-slate-800 border-t border-x border-slate-700/80 text-xs font-semibold text-slate-200 flex items-center gap-1.5 shadow-lg cursor-pointer transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hide Dock [B]</span>
            </button>
          </div>

          <div className="rounded-xl bg-slate-950/95 border border-slate-800 shadow-2xl p-4 overflow-hidden backdrop-blur-none space-y-3">
            {/* Navigation Tabs Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveTab('cloner')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'cloner' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Dna className="w-3.5 h-3.5" />
                  <span>RGSHSC Cloner ({clonerStage}/4)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('shelter')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'shelter' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Hammer className="w-3.5 h-3.5" />
                  <span>Base Building</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('craft')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'craft' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Crafting</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('multiplayer')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'multiplayer' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Co-Op Team ({survivors.length + 1})</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {activeBuildType && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBuildType(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Blueprint [X / Right-Click]</span>
                  </button>
                )}
                {onTogglePointerLock && (
                  <button
                    type="button"
                    onClick={onTogglePointerLock}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isPointerLocked ? <Lock className="w-3.5 h-3.5 text-cyan-400" /> : <MousePointer className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{isPointerLocked ? 'Free Cursor [Tab]' : 'Lock Look [Tab]'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenModelStudio}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>3D Models [M]{customModelsCount > 0 ? ` (${customModelsCount})` : ''}</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenUnityModal}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unity Export [U]</span>
                </button>

              </div>
            </div>

            {/* Tab 1: RGSHSC Cloner Tech Tree */}
            {activeTab === 'cloner' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {clonerTiers.map((tier) => {
                  const isBuilt = clonerStage >= tier.stage;
                  const isCurrentTarget = clonerStage === tier.stage - 1;
                  const affordable = canAfford(tier.costs);
                  const isPlacing = activeBuildType === tier.type;

                  return (
                    <div
                      key={tier.stage}
                      className={`p-3 rounded-lg border text-xs flex flex-col justify-between space-y-2 ${
                        isBuilt
                          ? 'bg-emerald-950/30 border-emerald-800/80'
                          : isCurrentTarget
                          ? 'bg-slate-900 border-cyan-500/60 shadow-lg ring-1 ring-cyan-500/20'
                          : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{tier.name}</span>
                          {isBuilt ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <span className="text-[10px] uppercase font-mono-nums px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              Tier {tier.stage}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-[11px] leading-snug">{tier.desc}</p>
                        <p className="text-cyan-400 text-[11px] font-medium">{tier.benefit}</p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <div className="flex flex-wrap gap-1 font-mono-nums text-[10px]">
                          {Object.entries(tier.costs).map(([res, amt]) => {
                            const hasEnough = (inventory[res as keyof Inventory] || 0) >= (amt || 0);
                            return (
                              <span
                                key={res}
                                className={`px-1.5 py-0.5 rounded ${
                                  hasEnough ? 'bg-slate-800 text-slate-300' : 'bg-rose-950/80 text-rose-300'
                                }`}
                              >
                                {amt}x {res}
                              </span>
                            );
                          })}
                        </div>

                        {isBuilt ? (
                          <div className="py-1.5 text-center text-emerald-400 font-semibold text-[11px]">
                            ✓ Online & Operational
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPlacing) {
                                onSelectBuildType(null);
                                return;
                              }
                              if (!isCurrentTarget) return;
                              onSelectBuildType(tier.type);
                            }}
                            disabled={!isPlacing && (!affordable || !isCurrentTarget)}
                            className={`w-full py-1.5 px-2 rounded-md font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                              isPlacing
                                ? 'bg-rose-500 hover:bg-rose-400 text-slate-950'
                                : !isCurrentTarget
                                ? 'bg-slate-800/70 text-slate-500 cursor-not-allowed'
                                : affordable
                                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {isPlacing ? <XCircle className="w-3.5 h-3.5" /> : <Hammer className="w-3 h-3" />}
                            <span>
                              {isPlacing
                                ? 'Cancel Placement [X]'
                                : !isCurrentTarget
                                ? `Requires Tier ${tier.stage - 1} First`
                                : affordable
                                ? 'Place Blueprint'
                                : 'Missing Resources'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Shelter Architecture */}
            {activeTab === 'shelter' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {shelterItems.map((item) => {
                  const affordable = canAfford(item.costs);
                  const isPlacing = activeBuildType === item.type;

                  return (
                    <div
                      key={item.type}
                      className={`p-3 rounded-lg border text-xs flex flex-col justify-between space-y-2 ${
                        isPlacing ? 'bg-slate-900 border-amber-500' : 'bg-slate-900/80 border-slate-800'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="font-semibold text-white block">{item.name}</span>
                        <p className="text-slate-400 text-[11px] leading-tight">{item.desc}</p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <div className="flex flex-wrap gap-1 font-mono-nums text-[10px]">
                          {Object.entries(item.costs).map(([res, amt]) => {
                            const hasEnough = (inventory[res as keyof Inventory] || 0) >= (amt || 0);
                            return (
                              <span
                                key={res}
                                className={`px-1.5 py-0.5 rounded ${
                                  hasEnough ? 'bg-slate-800 text-slate-300' : 'bg-rose-950/80 text-rose-300'
                                }`}
                              >
                                {amt}x {res}
                              </span>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isPlacing) {
                              onSelectBuildType(null);
                            } else {
                              onSelectBuildType(item.type);
                            }
                          }}
                          disabled={!isPlacing && !affordable}
                          className={`w-full py-1.5 px-2 rounded-md font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                            isPlacing
                              ? 'bg-rose-500 hover:bg-rose-400 text-slate-950'
                              : affordable
                              ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {isPlacing && <XCircle className="w-3.5 h-3.5" />}
                          <span>{isPlacing ? 'Cancel [X]' : 'Build'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 3: Crafting */}
            {activeTab === 'craft' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {craftRecipes.map((r) => {
                  const affordable = canAfford(r.costs);

                  return (
                    <div key={r.id} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs flex flex-col justify-between space-y-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{r.name}</span>
                          <span className="text-cyan-400 text-xs font-semibold">{r.produces}</span>
                        </div>
                        <p className="text-slate-400 text-xs">{r.desc}</p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <div className="flex gap-2 font-mono-nums text-xs">
                          {Object.entries(r.costs).map(([res, amt]) => (
                            <span key={res} className="px-2 py-1 rounded bg-slate-800 text-slate-300">
                              {amt}x {res}
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCraftItem(r.id);
                          }}
                          disabled={!affordable}
                          className={`w-full py-2 px-3 rounded-md font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                            affordable ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Synthesize</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 4: Multiplayer Co-Op & Team Chat */}
            {activeTab === 'multiplayer' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    Active Survivors in Sector ({survivors.length + 1})
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    <div className="p-2 rounded-lg bg-slate-900 border border-cyan-500/40 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-400" />
                        <span className="font-semibold text-white">You (Local Survivor)</span>
                      </div>
                      <span className="text-cyan-400 font-mono-nums">Carrier</span>
                    </div>

                    {survivors.map((s) => (
                      <div key={s.id} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-slate-200">{s.name}</span>
                        </div>
                        <span className="text-slate-400 font-mono-nums">Health: {s.health}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 flex flex-col justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    Comms Channel
                  </span>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 h-28 overflow-y-auto space-y-1.5 text-xs font-mono-nums">
                    {chatMessages.length === 0 ? (
                      <p className="text-slate-500 italic">No radio traffic yet. Coordinate base construction and DNA defense!</p>
                    ) : (
                      chatMessages.map((m, i) => (
                        <div key={i} className="flex gap-1.5">
                          <span className="font-bold" style={{ color: m.color }}>{m.sender}:</span>
                          <span className="text-slate-200">{m.text}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleSendChat} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Transmit coordinates or resources needed..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono-nums"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Send</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
};

