import React, { useState } from 'react';
import { useStore } from '../core/useStore';
import { Shield, Cpu, Activity, FlaskConical, BarChart3, Info, Camera, Sliders } from 'lucide-react';
import { CreditsModal } from './CreditsModal';

export const Navbar: React.FC = () => {
  const currentRoute = useStore((s) => s.currentRoute);
  const setCurrentRoute = useStore((s) => s.setCurrentRoute);
  const scenario = useStore((s) => s.scenario);
  const setScenario = useStore((s) => s.setScenario);
  const lane = useStore((s) => s.lane);
  const setLane = useStore((s) => s.setLane);
  const linkState = useStore((s) => s.linkState);
  const qberBound = useStore((s) => s.qberBound);
  const cameraPreset = useStore((s) => s.cameraPreset);
  const setCameraPreset = useStore((s) => s.setCameraPreset);
  const autopilotCamera = useStore((s) => s.autopilotCamera);
  const setAutopilotCamera = useStore((s) => s.setAutopilotCamera);

  const [isCreditsOpen, setIsCreditsOpen] = useState(false);

  const getLinkStateBadge = () => {
    if (linkState === 'HEALTHY') {
      return (
        <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40 glow-green">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>HEALTHY ({ (qberBound * 100).toFixed(1) }%)</span>
        </span>
      );
    } else if (linkState === 'DEGRADED') {
      return (
        <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-950 text-amber-400 border border-amber-500/40 glow-yellow">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>DEGRADED ({ (qberBound * 100).toFixed(1) }%)</span>
        </span>
      );
    } else {
      return (
        <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-950 text-rose-400 border border-rose-500/40 glow-red">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>COMPROMISED ({ (qberBound * 100).toFixed(1) }%)</span>
        </span>
      );
    }
  };

  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-40 h-14 bg-[#080c14]/90 border-b border-[#00f0ff]/20 px-4 flex items-center justify-between backdrop-blur-md">
        {/* Brand Title */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00f0ff] to-[#0066ff] p-0.5 flex items-center justify-center shadow-lg">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="font-orbitron font-extrabold text-base tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-cyan-400">
              QGridShield
            </h1>
            <p className="text-[10px] font-mono text-cyan-400/80 -mt-1">
              Laptop 1: Sender + Hub Brain
            </p>
          </div>
        </div>

        {/* Navigation Route Tabs */}
        <nav className="flex items-center space-x-1 bg-[#101726] p-1 rounded-lg border border-gray-800">
          <button
            onClick={() => setCurrentRoute('sender')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition flex items-center gap-1.5 ${
              currentRoute === 'sender'
                ? 'bg-[#00f0ff] text-black font-bold shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>/sender</span>
          </button>

          <button
            onClick={() => setCurrentRoute('receiver')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition flex items-center gap-1.5 ${
              currentRoute === 'receiver'
                ? 'bg-[#00f0ff] text-black font-bold shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>/receiver</span>
          </button>

          <button
            onClick={() => setCurrentRoute('attacker')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition flex items-center gap-1.5 ${
              currentRoute === 'attacker'
                ? 'bg-[#ff0055] text-white font-bold shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>/attacker</span>
          </button>

          <button
            onClick={() => setCurrentRoute('lab')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition flex items-center gap-1.5 ${
              currentRoute === 'lab'
                ? 'bg-[#aa00ff] text-white font-bold shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Quantum Lab</span>
          </button>

          <button
            onClick={() => setCurrentRoute('analysis')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition flex items-center gap-1.5 ${
              currentRoute === 'analysis'
                ? 'bg-[#ffbb00] text-black font-bold shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analysis</span>
          </button>
        </nav>

        {/* Controls & Scenario Selectors */}
        <div className="flex items-center space-x-3">
          {/* Scenario Picker */}
          <div className="flex items-center space-x-1.5 bg-[#0e1624] px-2 py-1 rounded border border-gray-700">
            <span className="text-[10px] font-mono text-gray-400">WORLD:</span>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as any)}
              className="bg-transparent text-xs font-mono text-cyan-300 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="grid" className="bg-gray-900 text-white">Power Grid (SLDC)</option>
              <option value="rail" className="bg-gray-900 text-white">Railway (Tirupati)</option>
              <option value="av" className="bg-gray-900 text-white">AV Fleet (Urban V2X)</option>
            </select>
          </div>

          {/* Lane Picker */}
          <div className="flex items-center space-x-1 bg-[#0e1624] p-0.5 rounded border border-gray-700 font-mono text-xs">
            <button
              onClick={() => setLane('qgs')}
              className={`px-2 py-0.5 rounded font-bold transition ${
                lane === 'qgs' ? 'bg-[#00f0ff] text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              QGS Lane
            </button>
            <button
              onClick={() => setLane('classical')}
              className={`px-2 py-0.5 rounded font-bold transition ${
                lane === 'classical' ? 'bg-[#ff0055] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Classical
            </button>
          </div>

          {/* Link State Badge */}
          {getLinkStateBadge()}

          {/* Presenter Camera Key Indicators */}
          <div className="hidden lg:flex items-center space-x-1 bg-[#0d1420] px-2 py-1 rounded border border-gray-800 text-[10px] font-mono text-gray-400">
            <Camera className="w-3 h-3 text-cyan-400" />
            <span>Cam Keys [1-5]</span>
            <button
              onClick={() => setAutopilotCamera(!autopilotCamera)}
              className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                autopilotCamera ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-400'
              }`}
            >
              AUTOPILOT
            </button>
          </div>

          {/* Credits Modal Button */}
          <button
            onClick={() => setIsCreditsOpen(true)}
            className="p-1.5 rounded-lg bg-[#0e1624] text-gray-300 hover:text-cyan-400 border border-gray-700 transition"
            title="Credits & Asset Attribution"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      <CreditsModal isOpen={isCreditsOpen} onClose={() => setIsCreditsOpen(false)} />
    </>
  );
};
