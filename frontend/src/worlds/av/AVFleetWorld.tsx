import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../core/useStore';

export const AVFleetWorld: React.FC = () => {
  const lane = useStore((s) => s.lane);

  const vehicle1Ref = useRef<THREE.Group>(null!);
  const vehicle2Ref = useRef<THREE.Group>(null!);
  const v2xSignalRef = useRef<THREE.Mesh>(null!);

  useFrame((state, delta) => {
    // Move autonomous vehicle fleet along road graph loop
    if (vehicle1Ref.current) {
      vehicle1Ref.current.position.z += delta * 6.0;
      if (vehicle1Ref.current.position.z > 30) {
        vehicle1Ref.current.position.z = -30;
      }
    }
    if (vehicle2Ref.current) {
      vehicle2Ref.current.position.x += delta * 7.5;
      if (vehicle2Ref.current.position.x > 30) {
        vehicle2Ref.current.position.x = -30;
      }
    }

    // Pulse V2X 5G antenna waves
    if (v2xSignalRef.current) {
      const scale = 1 + (Math.sin(state.clock.getElapsedTime() * 4) * 0.3);
      v2xSignalRef.current.scale.set(scale, scale, scale);
    }
  });

  const sendCommand = async (cmdType: string, criticality: string) => {
    try {
      await fetch('/api/frame/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: 'av',
          command_type: cmdType,
          criticality: criticality,
          lane: lane
        })
      });
    } catch (err) {
      console.error("Error sending AV command:", err);
    }
  };

  return (
    <>
      <PerspectiveCamera makeDefault position={[25, 22, 30]} fov={50} />
      <OrbitControls enableDamping maxPolarAngle={Math.PI / 2 - 0.05} />

      <ambientLight intensity={0.5} />
      <directionalLight position={[20, 30, 20]} intensity={1.2} castShadow />
      <pointLight position={[0, 15, 0]} intensity={2.0} color="#00f0ff" />

      {/* Ground & City Grid */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[120, 1, 120]} />
        <meshStandardMaterial color="#0c121e" />
      </mesh>
      <gridHelper args={[120, 60, '#00f0ff', '#1a2638']} position={[0, 0.01, 0]} />

      {/* Procedural City Buildings */}
      <group position={[0, 0, 0]}>
        {[
          { pos: [-25, 6, -20], size: [12, 12, 12], color: '#1e293b' },
          { pos: [-25, 10, 5], size: [10, 20, 10], color: '#0f172a' },
          { pos: [25, 8, -20], size: [14, 16, 12], color: '#1e293b' },
          { pos: [25, 5, 15], size: [12, 10, 14], color: '#0f172a' }
        ].map((bld, idx) => (
          <mesh key={idx} position={bld.pos as [number, number, number]} castShadow receiveShadow>
            <boxGeometry args={bld.size as [number, number, number]} />
            <meshStandardMaterial color={bld.color} metalness={0.5} />
          </mesh>
        ))}
      </group>

      {/* Road Graph Grid */}
      <group position={[0, 0.05, 0]}>
        {/* North-South Corridor */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[6, 0.02, 70]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        {/* East-West Corridor */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[70, 0.02, 6]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </group>

      {/* Fleet & Traffic Management Centre (Ops Room & Server Racks) */}
      <group position={[-25, 0, 25]}>
        <mesh position={[0, 4, 0]} castShadow>
          <boxGeometry args={[16, 8, 12]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <Text position={[0, 9, 0]} fontSize={0.9} color="#00f0ff">
          URBAN V2X FLEET NOC
        </Text>
      </group>

      {/* 5G V2X Gateway Tower */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 8, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.5, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} />
        </mesh>
        {/* Pulsing 5G antenna waves */}
        <mesh ref={v2xSignalRef} position={[0, 16, 0]}>
          <sphereGeometry args={[1.5, 16, 16]} />
          <meshBasicMaterial color="#00f0ff" wireframe transparent opacity={0.5} />
        </mesh>
        <Text position={[0, 18.5, 0]} fontSize={0.7} color="#00f0ff">
          V2X 5G GATEWAY TOWER
        </Text>
      </group>

      {/* Moving Autonomous Vehicles */}
      {/* AV 1 (North-South) */}
      <group ref={vehicle1Ref} position={[1.5, 0.8, -25]}>
        <mesh castShadow>
          <boxGeometry args={[1.8, 1.2, 3.5]} />
          <meshStandardMaterial color="#00f0ff" metalness={0.8} />
        </mesh>
        <Text position={[0, 1.2, 0]} fontSize={0.3} color="#ffffff">
          AV-101 [AUTO]
        </Text>
      </group>

      {/* AV 2 (East-West) */}
      <group ref={vehicle2Ref} position={[-25, 0.8, 1.5]}>
        <mesh castShadow>
          <boxGeometry args={[3.5, 1.2, 1.8]} />
          <meshStandardMaterial color="#00ff88" metalness={0.8} />
        </mesh>
        <Text position={[0, 1.2, 0]} fontSize={0.3} color="#ffffff">
          AV-204 [ROBOTAXI]
        </Text>
      </group>

      {/* 3D Diegetic Dispatch Panel */}
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2} position={[-25, 3, 33]}>
        <group scale={[0.8, 0.8, 0.8]}>
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[11, 6.5]} />
            <meshStandardMaterial color="#0c1424" transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
          <Text position={[0, 2.4, 0.1]} fontSize={0.45} color="#00f0ff">
            V2X COMMAND DISPATCH
          </Text>

          <group position={[-2.8, 1, 0.1]} onClick={() => sendCommand('BRAKE_COMMAND', 'critical')}>
            <mesh>
              <boxGeometry args={[4.8, 0.9, 0.2]} />
              <meshStandardMaterial color="#ff0055" />
            </mesh>
            <Text position={[0, 0, 0.15]} fontSize={0.3} color="#ffffff">
              BRAKE COMMAND (CRITICAL)
            </Text>
          </group>

          <group position={[2.8, 1, 0.1]} onClick={() => sendCommand('SIGNAL_PHASE', 'high')}>
            <mesh>
              <boxGeometry args={[4.8, 0.9, 0.2]} />
              <meshStandardMaterial color="#ffaa00" />
            </mesh>
            <Text position={[0, 0, 0.15]} fontSize={0.3} color="#000000">
              SIGNAL PHASE (HIGH)
            </Text>
          </group>

          <group position={[-2.8, -0.6, 0.1]} onClick={() => sendCommand('SPEED_LIMIT_UPDATE', 'high')}>
            <mesh>
              <boxGeometry args={[4.8, 0.9, 0.2]} />
              <meshStandardMaterial color="#00ff88" />
            </mesh>
            <Text position={[0, 0, 0.15]} fontSize={0.3} color="#000000">
              SPEED LIMIT UPDATE (HIGH)
            </Text>
          </group>

          <group position={[2.8, -0.6, 0.1]} onClick={() => sendCommand('HD_MAP_UPDATE', 'routine')}>
            <mesh>
              <boxGeometry args={[4.8, 0.9, 0.2]} />
              <meshStandardMaterial color="#00aaff" />
            </mesh>
            <Text position={[0, 0, 0.15]} fontSize={0.3} color="#ffffff">
              HD MAP UPDATE (ROUTINE)
            </Text>
          </group>
        </group>
      </Float>
    </>
  );
};
