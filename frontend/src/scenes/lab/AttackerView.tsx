import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Float, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../core/useStore';

// Animated moving packet sphere in 3D space
const PacketOrb: React.FC<{ position: THREE.Vector3; color: string; label: string }> = ({ position, color, label }) => {
  const orbRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (orbRef.current) {
      orbRef.current.rotation.y += delta * 2;
    }
  });

  return (
    <group ref={orbRef} position={position}>
      <Sphere args={[0.4, 16, 16]}>
        <meshBasicMaterial color={color} />
      </Sphere>
      <Text position={[0, 0.7, 0]} fontSize={0.25} color={color}>{label}</Text>
    </group>
  );
};

// Main Attacker (Eve) UI
export const AttackerView: React.FC = () => {
  const eveInterceptRatio = useStore((s) => s.eveInterceptRatio);
  const setEveInterceptRatio = useStore((s) => s.setEveInterceptRatio);
  const eveEraMode = useStore((s) => s.eveEraMode);
  const setEveEraMode = useStore((s) => s.setEveEraMode);
  const lane = useStore((s) => s.lane);
  const linkState = useStore((s) => s.linkState);

  const [tamperActive, setTamperActive] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [tapLog, setTapLog] = useState<any[]>([]);

  const applySettings = async () => {
    try {
      await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: useStore.getState().scenario,
          lane: lane,
          learn_mode: false,
          eve_intercept_ratio: eveInterceptRatio,
          eve_era_mode: eveEraMode
        })
      });
    } catch (e) { console.error(e); }
  };

  const intercept_pct = Math.round(eveInterceptRatio * 100);
  const predicted_qber = (eveInterceptRatio * 0.25).toFixed(3);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#080b11] overflow-hidden">
      {/* 3D background */}
      <div className="absolute inset-0 z-0">
        <Canvas>
          <ambientLight intensity={0.2} />
          <pointLight position={[0, 10, 0]} color="#ff0055" intensity={3} />
          <PerspectiveCamera makeDefault position={[0, 5, 15]} fov={55} />
          <OrbitControls enableDamping />
          <mesh position={[0, -1, 0]}>
            <boxGeometry args={[40, 0.2, 40]} />
            <meshStandardMaterial color="#0a0014" />
          </mesh>
          <gridHelper args={[40, 20, '#ff0055', '#1a0a14']} position={[0, -0.9, 0]} />

          {/* Interception node */}
          <Float speed={2} floatIntensity={0.5} position={[0, 2, 0]}>
            <group>
              <Sphere args={[1.2, 24, 24]}>
                <meshBasicMaterial color="#ff0055" wireframe transparent opacity={0.5} />
              </Sphere>
              <Text position={[0, 1.8, 0]} fontSize={0.4} color="#ff0055">EVE / ATTACKER NODE</Text>
              <Text position={[0, 1.2, 0]} fontSize={0.28} color="#ffffff">
                {`${intercept_pct}% Intercept | Mode: ${eveEraMode}`}
              </Text>
              <Text position={[0, 0.6, 0]} fontSize={0.28} color="#ffbb00">
                {`Predicted QBER: ${predicted_qber}`}
              </Text>
            </group>
          </Float>

          {/* Tap packet visualisation */}
          {tapLog.slice(0, 6).map((f, i) => (
            <PacketOrb
              key={f.frame_id || i}
              position={new THREE.Vector3((i - 2.5) * 3, 0, 0)}
              color="#ff0055"
              label={f.verdict || 'TAPPED'}
            />
          ))}
        </Canvas>
      </div>

      {/* Attacker Control Panel Overlay */}
      <div className="relative z-10 flex flex-col h-full pt-16 px-6 pb-6 overflow-auto">
        <div className="glass-panel rounded-2xl p-5 border border-red-500/30 shadow-2xl max-w-2xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-red-800/40 pb-3 mb-4">
            <div className="w-4 h-4 rounded-full bg-red-500 animate-ping" />
            <h2 className="font-orbitron text-lg font-bold text-red-400">EVE — QUANTUM ATTACKER CONSOLE</h2>
          </div>

          {/* Era Mode Toggle */}
          <div className="mb-4">
            <p className="text-xs font-mono text-gray-400 mb-2 uppercase tracking-wider">Attacker Era Capability</p>
            <div className="flex gap-2">
              <button
                onClick={() => setEveEraMode('classical-era')}
                className={`flex-1 py-2 rounded font-mono text-xs font-bold border transition ${
                  eveEraMode === 'classical-era'
                    ? 'bg-amber-900 border-amber-500 text-amber-300'
                    : 'bg-[#0a0f18] border-gray-700 text-gray-400 hover:border-amber-600'
                }`}
              >
                🏛️ Classical-Era<br />
                <span className="text-[10px] font-normal text-gray-400">Cannot break crypto</span>
              </button>
              <button
                onClick={() => setEveEraMode('quantum-era')}
                className={`flex-1 py-2 rounded font-mono text-xs font-bold border transition ${
                  eveEraMode === 'quantum-era'
                    ? 'bg-red-950 border-red-500 text-red-300'
                    : 'bg-[#0a0f18] border-gray-700 text-gray-400 hover:border-red-600'
                }`}
              >
                ⚛️ Quantum-Era<br />
                <span className="text-[10px] font-normal text-gray-400">Oracle ON — breaks RSA instantly</span>
              </button>
            </div>
            {eveEraMode === 'quantum-era' && (
              <div className="mt-2 bg-red-950/50 border border-red-800/60 rounded p-2 text-[11px] font-mono text-red-300">
                ⚠ Simulated Fault-Tolerant Quantum Computer Oracle active. Classical RSA/DH lane: payloads fully readable & forgeable.
              </div>
            )}
          </div>

          {/* Intercept Ratio Slider */}
          <div className="mb-4">
            <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
              <span>BB84 Intercept-Resend Ratio</span>
              <span className={`font-bold ${intercept_pct >= 80 ? 'text-red-400' : intercept_pct >= 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                {intercept_pct}%
              </span>
            </div>
            <input
              type="range" min={0} max={100} value={intercept_pct}
              onChange={(e) => setEveInterceptRatio(Number(e.target.value) / 100)}
              className="w-full accent-red-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-gray-600 mt-0.5">
              <span>Predicted QBER: {predicted_qber}</span>
              <span className={intercept_pct >= 44 ? 'text-red-400' : 'text-gray-400'}>
                {intercept_pct >= 44 ? '→ COMPROMISED' : '→ Within safe band'}
              </span>
            </div>
          </div>

          {/* Attack Mode Toggles */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setTamperActive(!tamperActive)}
              className={`py-2 rounded font-mono text-xs font-bold border transition ${
                tamperActive
                  ? 'bg-red-900 border-red-500 text-red-300'
                  : 'bg-[#0a0f18] border-gray-700 text-gray-400 hover:border-red-700'
              }`}
            >
              ✏️ TAMPER PAYLOADS<br />
              <span className="text-[10px] font-normal">{tamperActive ? 'ACTIVE — forging commands' : 'Inactive'}</span>
            </button>
            <button
              onClick={() => setDropActive(!dropActive)}
              className={`py-2 rounded font-mono text-xs font-bold border transition ${
                dropActive
                  ? 'bg-orange-950 border-orange-500 text-orange-300'
                  : 'bg-[#0a0f18] border-gray-700 text-gray-400 hover:border-orange-700'
              }`}
            >
              🚫 DROP FRAMES<br />
              <span className="text-[10px] font-normal">{dropActive ? 'ACTIVE — causing timeouts' : 'Inactive'}</span>
            </button>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-3 gap-2 mb-4 text-center font-mono text-xs">
            {[
              { label: 'QKD Link', value: linkState, color: linkState === 'HEALTHY' ? 'text-green-400' : linkState === 'DEGRADED' ? 'text-yellow-400' : 'text-red-400' },
              { label: 'Classical Lane', value: eveEraMode === 'quantum-era' ? 'BROKEN' : 'SECURE', color: eveEraMode === 'quantum-era' ? 'text-red-400' : 'text-green-400' },
              { label: 'QGS Lane', value: linkState === 'COMPROMISED' ? 'PQC ONLY' : 'HYBRID', color: 'text-cyan-400' }
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#0a0f1c] p-2 rounded border border-gray-800">
                <p className="text-gray-500 text-[10px]">{label}</p>
                <p className={`font-bold text-sm ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <button
            onClick={applySettings}
            className="w-full bg-red-700 hover:bg-red-600 text-white font-mono text-sm py-2.5 rounded font-bold transition"
          >
            ⚡ APPLY ATTACK SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
};
