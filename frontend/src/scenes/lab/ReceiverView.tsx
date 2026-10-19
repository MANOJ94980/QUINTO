import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Float, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../core/useStore';
import { Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

// Animated packet arrival sphere
const ArrivalOrb: React.FC<{ success: boolean }> = ({ success }) => {
  const orbRef = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => {
    if (orbRef.current) orbRef.current.rotation.y += delta * 2;
  });
  return (
    <mesh ref={orbRef}>
      <sphereGeometry args={[0.8, 24, 24]} />
      <meshBasicMaterial color={success ? '#00ff88' : '#ff0055'} wireframe />
    </mesh>
  );
};

export const ReceiverView: React.FC = () => {
  const linkState = useStore((s) => s.linkState);
  const deliveredFrames = useStore((s) => s.deliveredFrames);
  const lastFrame = deliveredFrames[0];

  const lsColor = linkState === 'HEALTHY' ? '#00ff88' : linkState === 'DEGRADED' ? '#ffbb00' : '#ff0055';

  return (
    <div className="relative w-full h-full flex flex-col bg-[#080b11] overflow-hidden">
      {/* 3D background */}
      <div className="absolute inset-0 z-0">
        <Canvas>
          <ambientLight intensity={0.3} />
          <pointLight position={[0, 10, 0]} color={lsColor} intensity={3} />
          <PerspectiveCamera makeDefault position={[0, 5, 15]} fov={50} />
          <OrbitControls enableDamping />
          <mesh position={[0, -1, 0]}>
            <boxGeometry args={[40, 0.2, 40]} />
            <meshStandardMaterial color="#060c14" />
          </mesh>
          <gridHelper args={[40, 20, lsColor, '#0f2030']} position={[0, -0.9, 0]} />

          <Float speed={2} floatIntensity={0.4} position={[0, 2, 0]}>
            <group>
              <ArrivalOrb success={linkState !== 'COMPROMISED'} />
              <Text position={[0, 1.5, 0]} fontSize={0.4} color={lsColor}>BOB / RECEIVER NODE</Text>
              <Text position={[0, 0.9, 0]} fontSize={0.28} color="#94a3b8">
                {`Link: ${linkState}`}
              </Text>
              {lastFrame && (
                <Text position={[0, 0.3, 0]} fontSize={0.22} color="#ffffff">
                  {`Last: ${lastFrame.frame_id?.slice(0, 16) || ''}`}
                </Text>
              )}
            </group>
          </Float>
        </Canvas>
      </div>

      {/* Receiver HUD */}
      <div className="relative z-10 flex flex-col h-full pt-16 px-6 pb-6 overflow-auto">
        <div className="glass-panel rounded-2xl p-5 border border-cyan-500/30 shadow-2xl max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3 border-b border-cyan-800/40 pb-3 mb-4">
            <Shield className="w-6 h-6 text-cyan-400" />
            <h2 className="font-orbitron text-lg font-bold text-cyan-300">BOB — SECURE RECEIVER ENDPOINT</h2>
            <div className={`ml-auto flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-mono font-bold border ${
              linkState === 'HEALTHY' ? 'bg-emerald-950 text-emerald-400 border-emerald-700' :
              linkState === 'DEGRADED' ? 'bg-amber-950 text-amber-400 border-amber-700' :
              'bg-rose-950 text-rose-400 border-rose-700'
            }`}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lsColor }} />
              {linkState}
            </div>
          </div>

          {/* Event Log */}
          <div className="mb-3">
            <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold mb-2">Live Frame Log</p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {deliveredFrames.length === 0 && (
                <p className="text-xs font-mono text-gray-600 text-center py-4">Awaiting frames from Alice via Hub…</p>
              )}
              {deliveredFrames.slice(0, 20).map((frame, index) => (
                <div key={`${frame.frame_id || 'frame'}-${index}`} className="flex items-start gap-2 rounded border border-emerald-900 bg-emerald-950/40 p-2 text-xs font-mono">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span className="text-emerald-300">Frame {frame.frame_id || ''} delivered</span>
                </div>
              ))}
            </div>
          </div>

          {/* Policy Status */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-[#0a0f1c] p-3 rounded border border-gray-800">
              <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Verification Mode</p>
              <p className="font-bold text-cyan-300">{linkState === 'COMPROMISED' ? 'PQC-ONLY (ML-KEM/ML-DSA)' : 'HYBRID QKD + PQC'}</p>
            </div>
            <div className="bg-[#0a0f1c] p-3 rounded border border-gray-800">
              <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Frames Received</p>
              <p className="font-bold text-emerald-300">{deliveredFrames.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
