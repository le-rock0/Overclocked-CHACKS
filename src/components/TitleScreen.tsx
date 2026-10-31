import React, { useState } from 'react';
import { Users, Play, Shield, Globe, Sparkles, Box } from 'lucide-react';

interface TitleScreenProps {
  onStartGame: (roomCode: string, survivorName: string, suitColor: string) => void;
  onOpenModelStudio?: () => void;
  customModelsCount?: number;
}

const SUIT_COLORS = [
  { name: 'Cyan Cryo', hex: '#06B6D4' },
  { name: 'Emerald Bio', hex: '#10B981' },
  { name: 'Amber Hazard', hex: '#F59E0B' },
  { name: 'Violet Quantum', hex: '#8B5CF6' },
  { name: 'Rose Genesis', hex: '#EC4899' },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenModelStudio,
  customModelsCount = 0,
}) => {
  const [roomCode, setRoomCode] = useState('STRAND-1');
  const [survivorName, setSurvivorName] = useState('Survivor-01');
  const [suitColor, setSuitColor] = useState(SUIT_COLORS[0].hex);
  const [isMultiplayer, setIsMultiplayer] = useState(true);

  const handleStart = () => {
    onStartGame(isMultiplayer ? roomCode.trim().toUpperCase() : 'SOLO', survivorName.trim(), suitColor);
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between p-8 md:p-12 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent pointer-events-auto">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest text-cyan-400 font-semibold">Humanity Restoration Initiative</span>
            <p className="text-xs text-slate-300">Cryogenic Sample Classification: Homo Sapien #001</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenModelStudio && (
            <button
              type="button"
              onClick={onOpenModelStudio}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg transition-colors cursor-pointer"
            >
              <Box className="w-4 h-4" />
              <span>
                Import Map & 3D Models (.GLB / .PNG / .JSON) [M]
                {customModelsCount > 0 ? ` (${customModelsCount})` : ''}
              </span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/85 border border-slate-800 text-xs text-slate-300 font-mono-nums">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>24h Day/Night · Unity Export Ready</span>
          </div>
        </div>
      </div>

      {/* Main Title Centerpiece */}
      <div className="max-w-2xl my-auto space-y-6">
        <div className="space-y-2">
          {/* Bespoke inline SVG Title Lockup */}
          <div className="flex items-center gap-4">
            <svg className="w-12 h-12 text-cyan-400 shrink-0" viewBox="0 0 48 48" fill="none">
              <path d="M24 4L42 14V34L24 44L6 34V14L24 4Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
              <path d="M24 14V34" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="24" cy="24" r="5" fill="#38bdf8"/>
              <path d="M16 18C20 22 28 26 32 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M32 18C28 22 20 26 16 30" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white font-sans uppercase">
                RGSHSC
              </h1>
              <p className="text-sm font-medium tracking-widest text-cyan-400 uppercase">
                Reproductive Gene-Shifting Homo Sapien Cloner
              </p>
            </div>
          </div>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl">
            You are the last survivor of humankind. In your possession rests the sole surviving synthetic human DNA vial. 
            Forage the wasteland, build modular life-support shelters, protect the sample from thermal decay, and engineer 
            the 4-tier cloner apparatus to bring back humanity.
          </p>
        </div>

        {/* Expedition Configuration Box */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-4 max-w-lg shadow-2xl">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Survivor Call-sign</label>
              <input
                type="text"
                value={survivorName}
                onChange={(e) => setSurvivorName(e.target.value)}
                maxLength={18}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-cyan-500 font-mono-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Mode & Co-Op Lobby</label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsMultiplayer(true)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                    isMultiplayer ? 'bg-cyan-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Co-Op Room
                </button>
                <button
                  type="button"
                  onClick={() => setIsMultiplayer(false)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                    !isMultiplayer ? 'bg-cyan-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Solo
                </button>
              </div>
            </div>
          </div>

          {isMultiplayer && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Room Code (Join or Host)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  placeholder="STRAND-1"
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400 text-xs font-semibold focus:outline-none focus:border-cyan-500 font-mono-nums tracking-wider uppercase"
                />
                <button
                  type="button"
                  onClick={() => setRoomCode('ROOM-' + Math.random().toString(36).substring(2, 6).toUpperCase())}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors"
                >
                  Randomize
                </button>
              </div>
            </div>
          )}

          {/* Suit Color Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Suit Cryo-Insulation Color</label>
            <div className="flex items-center gap-3">
              {SUIT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setSuitColor(c.hex)}
                  title={c.name}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    suitColor === c.hex ? 'scale-110 border-white shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          {/* Start CTA */}
          <button
            type="button"
            onClick={handleStart}
            className="w-full py-3 px-5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>COMMENCE EXPEDITION · RESTORE HUMANITY</span>
          </button>
        </div>
      </div>

      {/* Control Hint Line */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-800/80 gap-3">
        <div className="flex items-center gap-2 font-mono-nums">
          <span>WASD Move</span>
          <span aria-hidden="true">·</span>
          <span>Shift Sprint</span>
          <span aria-hidden="true">·</span>
          <span>Space Jump</span>
          <span aria-hidden="true">·</span>
          <span>Left-Click / E Harvest</span>
          <span aria-hidden="true">·</span>
          <span>B Build Mode</span>
          <span aria-hidden="true">·</span>
          <span>U Unity Export</span>
        </div>

        <div className="flex items-center gap-1.5 text-cyan-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Click screen once in-game to lock first-person pointer</span>
        </div>
      </div>
    </div>
  );
};
