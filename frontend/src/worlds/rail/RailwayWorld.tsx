import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../core/useStore';

export const RailwayWorld: React.FC = () => {
  const cameraPreset = useStore((s) => s.cameraPreset);
  const autopilotCamera = useStore((s) => s.autopilotCamera);
  const lane = useStore((s) => s.lane);

  const [signalAspect, setSignalAspect] = useState<'red' | 'yellow' | 'green'>('red');
  const [trainMoving, setTrainMoving] = useState(false);
  const trainRef = useRef<THREE.Group>(null!);

  useFrame((state, delta) => {
    if (trainMoving && trainRef.current) {
      trainRef.current.position.x += delta * 8.0;
      if (trainRef.current.position.x > 40) {
        trainRef.current.position.x = -20;
      }
    }
  });

  const sendCommand = async (cmdType: string, criticality: string) => {
    try {
      if (cmdType === 'SIGNAL_CLEAR') {
        setSignalAspect('green');
      } else if (cmdType === 'MOVEMENT_AUTHORITY') {
        setTrainMoving(true);
      }
      await fetch('/api/frame/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: 'rail',
          command_type: cmdType,
          criticality: criticality,
          lane: lane
        })
      });
    } catch (err) {
      console.error("Error sending rail command:", err);
    }
  };

  return (
    <>
      <PerspectiveCamera makeDefault position={[25, 20, 30]} fov={50} />
      <OrbitControls enableDamping maxPolarAngle={Math.PI / 2 - 0.05} />

      <ambientLight intensity={0.5} />
      <directionalLight position={[20, 30, 20]} intensity={1.2} castShadow />
      <pointLight position={[-10, 8, 5]} intensity={2.0} color="#00f0ff" />

      {/* Ground & Grid */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[120, 1, 120]} />
        <meshStandardMaterial color="#0c121e" />
      </mesh>
      <gridHelper args={[120, 60, '#00f0ff', '#1a2638']} position={[0, 0.01, 0]} />

      {/* --- Tirupati Railway Station Building --- */}
      <group position={[-15, 0, -15]}>
        <mesh position={[0, 4, 0]} castShadow>
          <boxGeometry args={[24, 8, 10]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <Text position={[0, 9, 0]} fontSize={1.2} color="#00f0ff">
          TIRUPATI JUNCTION [TPTY]
        </Text>
        {/* Foot Overbridge */}
        <mesh position={[0, 7, 10]}>
          <boxGeometry args={[2, 4, 15]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      </group>

      {/* Railway Station Platforms */}
      <group position={[0, 0.4, 0]}>
        {/* Platform 1 */}
        <mesh position={[0, 0, -4]} receiveShadow>
          <boxGeometry args={[50, 0.8, 4]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        {/* Platform 2 */}
        <mesh position={[0, 0, 4]} receiveShadow>
          <boxGeometry args={[50, 0.8, 4]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </group>

      {/* Tracks & Sleepers */}
      <group position={[0, 0.1, 0]}>
        {/* Track Line 1 */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[60, 0.1, 2]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Parallel Rails */}
        <mesh position={[0, 0.15, -0.6]}>
          <boxGeometry args={[60, 0.15, 0.1]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.15, 0.6]}>
          <boxGeometry args={[60, 0.15, 0.1]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} />
        </mesh>
      </group>

      {/* Electric Locomotive (WAP-7 Style Livery) & Passenger Coaches */}
      <group ref={trainRef} position={[-15, 1.2, 0]}>
        {/* Engine */}
        <mesh position={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[6, 2.4, 2]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
        <Text position={[0, 2.6, 0]} fontSize={0.4} color="#ffffff">
          WAP-7 30201 [TPTY EXPRESS]
        </Text>
        {/* Coaches */}
        {[-7, -13, -19].map((offset, i) => (
          <mesh key={i} position={[offset, 1.2, 0]} castShadow>
            <boxGeometry args={[5.5, 2.2, 2]} />
            <meshStandardMaterial color="#1d4ed8" />
          </mesh>
        ))}
      </group>

      {/* 4-Aspect Interlocking Signal Post */}
      <group position={[15, 0, -2.5]}>
        <mesh position={[0, 3, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 6]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
        {/* Signal Light Housing */}
        <mesh position={[0, 5, 0]}>
          <boxGeometry args={[0.6, 1.8, 0.6]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Aspect LED */}
        <mesh position={[0, 5, 0.35]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial
            color={
              signalAspect === 'green'
                ? '#00ff88'
                : signalAspect === 'yellow'
                ? '#ffbb00'
                : '#ff0055'
            }
          />
        </mesh>
        <Text position={[0, 6.3, 0]} fontSize={0.5} color="#00f0ff">
          SIGNAL [S-12]
        </Text>
      </group>

      {/* Divisional Control Office (Control Room) */}
      <group position={[20, 0, 15]}>
        <mesh position={[0, 3, 0]} castShadow>
          <boxGeometry args={[12, 6, 10]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <Text position={[0, 4, 5.1]} fontSize={0.6} color="#00f0ff">
          TIRUPATI DIVISIONAL CONTROL
        </Text>
      </group>

      {/* 3D Diegetic Command Dispatch Panel */}
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2} position={[20, 2, 22]}>
        <group scale={[0.8, 0.8, 0.8]}>
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[11, 6.5]} />
            <meshStandardMaterial color="#0c1424" transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
          <Text position={[0, 2.4, 0.1]} fontSize={0.45} color="#00f0ff">
            RAIL INTERLOCKING DISPATCH
          </Text>

          <group position={[-2.8, 1, 0.1]} onClick={() => sendCommand('MOVEMENT_AUTHORITY', 'critical')}>
            <mesh>
              <boxGeometry args={[4.8, 0.9, 0.2]} />
              <meshStandardMaterial color="#ff0055" />
            </mesh>
            <Text position={[0, 0, 0.15]} fontSize={0.3} color="#ffffff">
              MOVEMENT AUTHORITY (CRITICAL)
            </Text>
          </group>

          <group position={[2.8, 1, 0.1]} onClick={() => sendCommand('SIGNAL_CLEAR', 'critical')}>
            <mesh>
              <boxGeometry args={[4.8, 0.9, 0.2]} />
              <meshStandardMaterial color="#00ff88" />
            </mesh>
            <Text position={[0, 0, 0.15]} fontSize={0.3} color="#000000">
              SIGNAL CLEAR (CRITICAL)
            </Text>
          </group>

          <group position={[-2.8, -0.6, 0.1]} onClick={() => sendCommand('POINT_SET', 'critical')}>
            <mesh>
              <boxGeometry args={[4.8, 0.9, 0.2]} />
              <meshStandardMaterial color="#ffaa00" />
            </mesh>
            <Text position={[0, 0, 0.15]} fontSize={0.3} color="#000000">
              POINT SET (CRITICAL)
            </Text>
          </group>

          <group position={[2.8, -0.6, 0.1]} onClick={() => sendCommand('EMERGENCY_STOP', 'critical')}>
            <mesh>
              <boxGeometry args={[4.8, 0.9, 0.2]} />
              <meshStandardMaterial color="#dc2626" />
            </mesh>
            <Text position={[0, 0, 0.15]} fontSize={0.3} color="#ffffff">
              EMERGENCY STOP (CRITICAL)
            </Text>
          </group>
        </group>
      </Float>
    </>
  );
};
