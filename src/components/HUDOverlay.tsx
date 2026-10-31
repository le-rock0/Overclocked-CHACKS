import React from 'react';
import { 
  Heart, 
  Droplet, 
  Dna, 
  Volume2, 
  VolumeX, 
  Download, 
  Hammer, 
  Cpu, 
  Flame, 
  TreePine, 
  Boxes, 
  Sparkles,
  MousePointer,
  Box,
  Sun,
  Moon,
  Sunset,
  Tablet,
  Wrench,
  Sprout,
  Utensils,
  XCircle,
  CloudRain,
  Radiation,
  ShieldCheck
} from 'lucide-react';
import { EcoStats, EquippedItem, Inventory, StructureType, SurvivorVitals, WeatherTelemetry } from '../types/game';

interface HUDOverlayProps {
  vitals: SurvivorVitals;
  inventory: Inventory;
  hoverPrompt: string | null;
  roomCode: string;
  survivorsCount: number;
  clonerStage: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenUnityModal: () => void;
  onOpenModelStudio: () => void;
  customModelsCount: number;
  timeOfDay: number;
  timePhase: string;
  dayCount: number;
  isAutoDayNight: boolean;
  onCycleTimePreset: () => void;
  onToggleAutoDayNight: () => void;
  weatherTelemetry: WeatherTelemetry;
  onCycleWeather: () => void;
  isBuildDockCollapsed: boolean;
  onToggleBuildDock: () => void;
  notifications: Array<{ id: string; text: string; type: 'info' | 'warn' | 'success' }>;
  isPointerLocked?: boolean;
  onTogglePointerLock?: () => void;
  equippedItem: EquippedItem;
  onSwitchEquipment: (item: EquippedItem) => void;
  unreadTabletCount: number;
  ecoStats: EcoStats;
  onPlantSeed: () => void;
  onEatFood: () => void;
  activeBuildType: StructureType | null;
  onCancelBuild: () => void;
}

export const HUDOverlay: React.FC<HUDOverlayProps> = ({
  vitals,
  inventory,
  hoverPrompt,
  clonerStage,
  isMuted,
  onToggleMute,
  onOpenUnityModal,
  onOpenModelStudio,
  customModelsCount,
  timeOfDay,
  timePhase,
  dayCount,
  onCycleTimePreset,
  weatherTelemetry,
  onCycleWeather,
  isBuildDockCollapsed,
  onToggleBuildDock,
  notifications,
  isPointerLocked = false,
  equippedItem,
  onSwitchEquipment,
  unreadTabletCount,
  ecoStats,
  onPlantSeed,
  onEatFood,
  activeBuildType,
  onCancelBuild,
}) => {
  const requiredSeeds = ecoStats.treesCut * 2;
  const seedsOwed = Math.max(0, requiredSeeds - ecoStats.seedsPlanted);
  const isOptimalTemp = vitals.dnaTemperature <= -15;
  const harvestSpeedPct = Math.round(weatherTelemetry.harvestSpeedMultiplier * 100);

  const formatClock = (hr: number) => {
    const clean = ((hr % 24) + 24) % 24;
    const h24 = Math.floor(clean);
    const mins = Math.floor((clean - h24) * 60);
    const period = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${String(h12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
  };

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 md:p-4 select-none">
      {/* TOP BAR: Compact Vitals + DNA Status on Left | Clock + Weather + Studio Tools on Right */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Streamlined Vitals + DNA Integrity + Mandate */}
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="px-3 py-2 rounded-xl bg-slate-950/85 border border-slate-800/90 shadow-lg pointer-events-auto flex flex-col gap-1.5"
        >
          {/* Row 1: Vitals Bars (HP, Energy, Water) */}
          <div className="flex items-center gap-3 text-[11px] font-mono-nums">
            <div className="flex items-center gap-1.5" title="Survivor Health">
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-current shrink-0" />
              <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, vitals.health))}%` }}
                />
              </div>
              <span className="text-slate-200 font-bold">{Math.round(vitals.health)}%</span>
            </div>

            <div className="flex items-center gap-1.5" title="Energy / Nutrition">
              <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, vitals.hunger))}%` }}
                />
              </div>
              <span className="text-slate-200 font-bold">{Math.round(vitals.hunger)}%</span>
            </div>

            <div className="flex items-center gap-1.5" title="Hydration">
              <Droplet className="w-3.5 h-3.5 text-cyan-400 fill-current shrink-0" />
              <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, vitals.hydration))}%` }}
                />
              </div>
              <span className="text-slate-200 font-bold">{Math.round(vitals.hydration)}%</span>
            </div>
          </div>

          {/* Row 2: Compact DNA Sample & Reforestation Status */}
          <div className="pt-1 border-t border-slate-800/80 flex items-center gap-2.5 text-[11px] font-mono-nums flex-wrap">
            <span className="flex items-center gap-1 text-cyan-300 font-semibold">
              <Dna className="w-3.5 h-3.5 text-cyan-400" />
              <span>DNA: {Math.round(vitals.dnaIntegrity)}%</span>
              <span className={isOptimalTemp ? 'text-cyan-400' : 'text-amber-400'}>
                ({Math.round(vitals.dnaTemperature)}°C)
              </span>
            </span>

            <span className="text-slate-600" aria-hidden="true">·</span>

            <span className="text-emerald-400 font-semibold">
              Cloner: {clonerStage}/4
            </span>

            <span className="text-slate-600" aria-hidden="true">·</span>

            <span
              className={`flex items-center gap-1 font-semibold ${
                seedsOwed > 0 ? 'text-amber-300' : 'text-emerald-300'
              }`}
              title="Mandatory Reforestation Rule: Plant 2 Seeds for every 1 Tree cut"
            >
              <Sprout className="w-3 h-3 text-emerald-400" />
              <span>
                Seeds: {ecoStats.seedsPlanted}/{requiredSeeds}
                {seedsOwed > 0 ? ` (${seedsOwed} owed)` : ' ✓'}
              </span>
            </span>
          </div>
        </div>

        {/* Top-Right: Compact Single-Row Clock, Weather & Studio Actions */}
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 pointer-events-auto flex-wrap justify-end"
        >
          {/* Dynamic Weather Toggle Button [G] */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCycleWeather();
            }}
            title="Click or press [G] to toggle Weather (Clear -> Rain -> Radiation Storm)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono-nums shadow-md transition-colors cursor-pointer ${
              weatherTelemetry.weather === 'radiation_storm'
                ? 'bg-lime-950/90 hover:bg-lime-900/90 border-lime-500/60 text-lime-300'
                : weatherTelemetry.weather === 'rain'
                ? 'bg-sky-950/90 hover:bg-sky-900/90 border-sky-500/50 text-sky-200'
                : 'bg-slate-950/85 hover:bg-slate-900 border-slate-800 text-slate-200'
            }`}
          >
            {weatherTelemetry.weather === 'radiation_storm' ? (
              <Radiation className="w-3.5 h-3.5 text-lime-400 animate-spin" />
            ) : weatherTelemetry.weather === 'rain' ? (
              <CloudRain className="w-3.5 h-3.5 text-sky-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="font-bold">
              {weatherTelemetry.weather === 'radiation_storm'
                ? 'Rad Storm'
                : weatherTelemetry.weather === 'rain'
                ? 'Rain'
                : 'Clear'}
            </span>
            <span
              className={`text-[10px] px-1 py-0.2 rounded ${
                harvestSpeedPct > 100
                  ? 'bg-sky-500/20 text-sky-300'
                  : harvestSpeedPct < 100
                  ? 'bg-rose-500/20 text-rose-300'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {harvestSpeedPct}% Harvest
            </span>
            {weatherTelemetry.weather === 'radiation_storm' && (
              <span
                className={`text-[10px] font-bold flex items-center gap-0.5 ${
                  weatherTelemetry.isSheltered ? 'text-emerald-300' : 'text-rose-400'
                }`}
              >
                {weatherTelemetry.isSheltered ? (
                  <>
                    <ShieldCheck className="w-3 h-3" />
                    <span>SHELTERED</span>
                  </>
                ) : (
                  <span>EXPOSED -HP</span>
                )}
              </span>
            )}
            <span className="text-[10px] text-cyan-400">[G]</span>
          </button>

          {/* Day/Night Clock Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCycleTimePreset();
            }}
            title="Click or press [T] to cycle Time of Day (Morning / Noon / Sunset / Night)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950/85 hover:bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono-nums shadow-md transition-colors cursor-pointer"
          >
            {timePhase === 'Night' ? (
              <Moon className="w-3.5 h-3.5 text-cyan-400" />
            ) : timePhase === 'Sunset' || timePhase === 'Dawn' ? (
              <Sunset className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>D{dayCount}</span>
            <span className="font-bold text-white">{formatClock(timeOfDay)}</span>
            <span className="text-[10px] text-cyan-400">[T]</span>
          </button>

          {/* 3D Models & Map Importer */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenModelStudio();
            }}
            title="Import Custom Maps (.GLB / .OBJ / Heightmap .PNG / .JSON) & 3D Models [M]"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md transition-colors cursor-pointer"
          >
            <Box className="w-3.5 h-3.5" />
            <span>Map & 3D [M]{customModelsCount > 0 ? ` (${customModelsCount})` : ''}</span>
          </button>

          {/* Unity Exporter */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenUnityModal();
            }}
            title="Export 3D Models & C# Scripts to Unity [U]"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950/85 hover:bg-slate-900 border border-slate-800 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Unity [U]</span>
          </button>

          {/* Mute Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            title={isMuted ? 'Unmute audio' : 'Mute audio'}
            className="p-1.5 rounded-lg bg-slate-950/85 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* CENTER: Minimal Crosshair & Contextual Prompt */}
      <div className="my-auto mx-auto flex flex-col items-center gap-2">
        <div className="w-4 h-4 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/90 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
        </div>

        {/* Active Blueprint Controls Banner */}
        {activeBuildType && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="px-3.5 py-1.5 rounded-xl bg-slate-950/95 border border-amber-500/80 text-xs flex items-center gap-2.5 shadow-xl pointer-events-auto"
          >
            <Hammer className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-white uppercase">
              {activeBuildType.replace(/_/g, ' ')}
            </span>
            <span className="text-slate-400 font-mono-nums text-[11px] hidden sm:inline">
              [L-Click] Place · [R-Click / X] Cancel
            </span>
            <button
              type="button"
              onClick={onCancelBuild}
              className="px-2 py-0.5 rounded bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <XCircle className="w-3 h-3" />
              <span>Cancel [X]</span>
            </button>
          </div>
        )}

        {/* Contextual Target Prompt */}
        {hoverPrompt && (
          <div className="px-3 py-1 rounded-lg bg-slate-950/90 border border-cyan-500/50 text-cyan-300 text-xs font-semibold shadow-lg">
            {hoverPrompt}
          </div>
        )}

        {/* Subtle Pointer Unlock Hint */}
        {!isPointerLocked && !activeBuildType && (
          <div className="px-2.5 py-0.5 rounded-md bg-slate-950/75 border border-slate-800 text-[10px] text-slate-400 flex items-center gap-1">
            <MousePointer className="w-2.5 h-2.5 text-cyan-400" />
            <span>Click 3D view or press [Tab] to Look Around</span>
          </div>
        )}
      </div>

      {/* BOTTOM AREA: Notifications on Left + Single Unified Hotbar Dock (Hidden when Build Drawer is Open so they never overlap) */}
      <div className="flex flex-col gap-2">
        {/* Compact Toast Notifications (Max 2 recent items) */}
        {notifications.length > 0 && (
          <div className="space-y-1 max-w-xs pointer-events-none">
            {notifications.slice(-2).map((n) => (
              <div
                key={n.id}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border shadow-md ${
                  n.type === 'warn'
                    ? 'bg-rose-950/90 border-rose-800 text-rose-200'
                    : n.type === 'success'
                    ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
                    : 'bg-slate-950/90 border-slate-800 text-slate-200'
                }`}
              >
                {n.text}
              </div>
            ))}
          </div>
        )}

        {/* Unified Single-Row Bottom Hotbar (Only shown when Build Dock is collapsed) */}
        {isBuildDockCollapsed && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto flex items-center gap-1.5 flex-wrap justify-center px-2.5 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800/90 pointer-events-auto shadow-2xl"
          >
            {/* 1. Equipment Switcher: [1] Weapon | [2] SDG Tablet */}
            <div className="flex items-center gap-1 pr-1.5 border-r border-slate-800">
              <button
                type="button"
                onClick={() => onSwitchEquipment('tool')}
                title="Equip Harvester Pickaxe [1]"
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  equippedItem === 'tool'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>[1] Pickaxe</span>
              </button>

              <button
                type="button"
                onClick={() => onSwitchEquipment('tablet')}
                title="Equip SDG Field Tablet [2 or Q]"
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  equippedItem === 'tablet'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                <Tablet className="w-3.5 h-3.5" />
                <span>[2] Tablet</span>
                {unreadTabletCount > 0 && (
                  <span className="px-1 rounded bg-amber-400 text-slate-950 font-mono-nums text-[10px] font-extrabold">
                    {unreadTabletCount}
                  </span>
                )}
              </button>
            </div>

            {/* 2. Compact Resource Counters */}
            <div className="flex items-center gap-1.5 text-xs font-mono-nums px-1">
              <span className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-800/80" title="Wood">
                <TreePine className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-bold text-white">{inventory.wood}</span>
              </span>

              <span className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-800/80" title="Scrap Metal">
                <Boxes className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-white">{inventory.scrapMetal}</span>
              </span>

              <span className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-800/80" title="Quartz Crystal">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold text-white">{inventory.quartzCrystal}</span>
              </span>

              <span className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-800/80" title="Biomass">
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-white">{inventory.biomass}</span>
              </span>

              <span className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-800/80" title="Purified Water">
                <Droplet className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold text-white">{inventory.purifiedWater}</span>
              </span>

              <span className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-800/80" title="Nanite Circuits">
                <Cpu className="w-3.5 h-3.5 text-violet-400" />
                <span className="font-bold text-white">{inventory.naniteCircuit}</span>
              </span>
            </div>

            {/* 3. Quick Actions: Plant Seed [R], Eat Food [F], Open Build & Craft Dock [B] */}
            <div className="flex items-center gap-1 pl-1.5 border-l border-slate-800">
              <button
                type="button"
                onClick={onPlantSeed}
                title="Plant a Tree Seed [R] (Mandate: 2 Seeds per Tree Cut)"
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-mono-nums font-semibold transition-colors cursor-pointer ${
                  seedsOwed > 0
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/60 text-emerald-300'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-emerald-300'
                }`}
              >
                <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                <span>{inventory.treeSeeds}</span>
                <span className="text-[10px] text-emerald-400 font-bold">[R]</span>
              </button>

              <button
                type="button"
                onClick={onEatFood}
                title="Eat Nutrient Food Ration (+35% Energy) [F]"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono-nums font-semibold text-amber-300 transition-colors cursor-pointer"
              >
                <Utensils className="w-3.5 h-3.5 text-amber-400" />
                <span>{inventory.foodRations}</span>
                <span className="text-[10px] text-amber-400 font-bold">[F]</span>
              </button>

              <button
                type="button"
                onClick={onToggleBuildDock}
                title="Open RGSHSC Cloner, Base Building & Crafting Dock [B]"
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
              >
                <Hammer className="w-3.5 h-3.5" />
                <span>Build & Craft [B]</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
