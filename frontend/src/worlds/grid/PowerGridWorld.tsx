import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../core/useStore';

export const PowerGridWorld: React.FC = () => {
  const cameraPreset = useStore((s) => s.cameraPreset);
  const autopilotCamera = useStore((s) => s.autopilotCamera);
  const lane = useStore((s) => s.lane);
  const linkState = useStore((s) => s.linkState);

  // References for animations
  const windTurbineRef1 = useRef<THREE.Group>(null!);
  const windTurbineRef2 = useRef<THREE.Group>(null!);
  const steamRef = useRef<THREE.Points>(null!);
  const powerPulseRef = useRef<THREE.Mesh>(null!);
  const camRef = useRef<any>(null!);

  // Frame animation loop
  useFrame((state, delta) => {
    // Spin wind turbine blades
    if (windTurbineRef1.current) windTurbineRef1.current.rotation.z += delta * 1.5;
    if (windTurbineRef2.current) windTurbineRef2.current.rotation.z += delta * 1.8;

    // Animate power flow pulse along transmission line toward map edge
    if (powerPulseRef.current) {
      powerPulseRef.current.position.x += delta * 15.0;
      if (powerPulseRef.current.position.x > 35) {
        powerPulseRef.current.position.x = -15;
      }
    }

    // Steam particle motion
    if (steamRef.current) {
      const positions = steamRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += delta * 2.0;
        if (positions[i] > 12) positions[i] = 4;
      }
      steamRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Autopilot camera motion
    if (autopilotCamera && camRef.current) {
      const time = state.clock.getElapsedTime();
      camRef.current.position.x = Math.sin(time * 0.2) * 45;
      camRef.current.position.z = Math.cos(time * 0.2) * 45;
      camRef.current.lookAt(0, 5, 0);
    }
  });

  // Steam particle positions
  const particleCount = 40;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 4;
    particlePositions[i * 3 + 1] = 4 + Math.random() * 8;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 4;
  }

  // Camera positions per preset
  const getCameraPos = (): [number, number, number] => {
    switch (cameraPreset) {
      case 2: return [-18, 6, 12]; // Control room focus
      case 3: return [0, 15, 25];  // Switchyard & Transmission
      case 4: return [-12, 5, -8]; // Security Advisor focus
      case 5: return [25, 20, 25]; // Lab transition
      default: return [30, 25, 35]; // Overview
    }
  };

  const sendCommand = async (cmdType: string, criticality: string) => {
    try {
      await fetch('/api/frame/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: 'grid',
          command_type: cmdType,
          criticality: criticality,
          lane: lane
        })
      });
    } catch (err) {
      console.error("Error sending grid command:", err);
    }
  };

  return (
    <>
      <PerspectiveCamera ref={camRef} makeDefault position={getCameraPos()} fov={50} />
      <OrbitControls enableDamping maxPolarAngle={Math.PI / 2 - 0.05} />

      {/* Lighting & Environment */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[30, 40, 20]} intensity={1.2} castShadow />
      <pointLight position={[-15, 10, 10]} intensity={2.0} color="#00f0ff" />
      <pointLight position={[15, 10, -10]} intensity={1.5} color="#ff0055" />

      {/* Sky Box / Environment Ground */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[120, 1, 120]} />
        <meshStandardMaterial color="#0c121e" roughness={0.8} />
      </mesh>
      <gridHelper args={[120, 60, '#00f0ff', '#1a2638']} position={[0, 0.01, 0]} />

      {/* --- Thermal Power Station: Cooling Towers --- */}
      <group position={[-20, 0, -15]}>
        {/* Cooling Tower 1 */}
        <mesh position={[0, 6, 0]} castShadow>
          <cylinderGeometry args={[4, 6, 12, 32, 1, true]} />
          <meshStandardMaterial color="#2d3748" side={THREE.DoubleSide} roughness={0.6} />
        </mesh>
        {/* Steam particles */}
        <points ref={steamRef} position={[0, 0, 0]}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[particlePositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial size={0.8} color="#e2e8f0" transparent opacity={0.6} sizeAttenuation />
        </points>
        <Text position={[0, 14, 0]} fontSize={1.2} color="#00f0ff" font="/fonts/Orbitron.ttf">
          COOLING TOWER A
        </Text>
      </group>

      {/* Cooling Tower 2 */}
      <group position={[-10, 0, -22]}>
        <mesh position={[0, 6, 0]} castShadow>
          <cylinderGeometry args={[4, 6, 12, 32, 1, true]} />
          <meshStandardMaterial color="#2d3748" side={THREE.DoubleSide} roughness={0.6} />
        </mesh>
      </group>

      {/* Chimney Stacks with warning lights */}
      <group position={[-30, 0, -5]}>
        <mesh position={[0, 10, 0]} castShadow>
          <cylinderGeometry args={[0.8, 1.2, 20, 16]} />
          <meshStandardMaterial color="#4a5568" />
        </mesh>
        <mesh position={[0, 20.2, 0]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
      </group>

      {/* Turbine Hall Building */}
      <mesh position={[-15, 4, 5]} castShadow receiveShadow>
        <boxGeometry args={[18, 8, 14]} />
        <meshStandardMaterial color="#1a202c" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Generator Step-Up Transformers */}
      <group position={[0, 2, 5]}>
        {[ -4, 0, 4 ].map((zOffset, idx) => (
          <mesh key={idx} position={[0, 2, zOffset]} castShadow>
            <boxGeometry args={[3, 4, 2.5]} />
            <meshStandardMaterial color="#2b6cb0" metalness={0.7} />
          </mesh>
        ))}
      </group>

      {/* 400 kV Switchyard Gantries & Circuit Breakers */}
      <group position={[15, 0, 5]}>
        <mesh position={[0, 0.2, 0]} receiveShadow>
          <boxGeometry args={[20, 0.4, 20]} />
          <meshStandardMaterial color="#2d3748" />
        </mesh>
        
        {/* Switchyard Gantries */}
        {[-6, 0, 6].map((x, i) => (
          <group key={i} position={[x, 0, 0]}>
            <mesh position={[0, 5, -8]} castShadow>
              <cylinderGeometry args={[0.15, 0.15, 10]} />
              <meshStandardMaterial color="#a0aec0" metalness={0.9} />
            </mesh>
            <mesh position={[0, 5, 8]} castShadow>
              <cylinderGeometry args={[0.15, 0.15, 10]} />
              <meshStandardMaterial color="#a0aec0" metalness={0.9} />
            </mesh>
            <mesh position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.12, 0.12, 16]} />
              <meshStandardMaterial color="#a0aec0" metalness={0.9} />
            </mesh>
          </group>
        ))}

        {/* 400kV Circuit Breakers */}
        <mesh position={[5, 2, 0]}>
          <boxGeometry args={[2, 4, 4]} />
          <meshStandardMaterial color={linkState === 'COMPROMISED' ? '#ff0055' : '#00ff88'} />
        </mesh>
        <Text position={[5, 5, 0]} fontSize={0.9} color="#00f0ff">
          400kV BREAKER [SLDC]
        </Text>
      </group>

      {/* Solar Farm Array */}
      <group position={[25, 0, -20]}>
        {[-4, 0, 4].map((x, i) =>
          [-4, 0, 4].map((z, j) => (
            <mesh key={`${i}-${j}`} position={[x, 0.8, z]} rotation={[-Math.PI / 6, 0, 0]}>
              <boxGeometry args={[2.5, 0.1, 1.8]} />
              <meshStandardMaterial color="#1a365d" metalness={0.9} roughness={0.1} />
            </mesh>
          ))
        )}
      </group>

      {/* Wind Turbines */}
      <group position={[-5, 0, -32]}>
        {/* Shaft */}
        <mesh position={[0, 8, 0]}>
          <cylinderGeometry args={[0.3, 0.6, 16]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
        {/* Nacelle & Rotating Blades */}
        <group position={[0, 16, 0]}>
          <mesh position={[0, 0, 0.5]}>
            <boxGeometry args={[1, 1, 2]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
          <group ref={windTurbineRef1} position={[0, 0, 1.5]}>
            {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, k) => (
              <mesh key={k} rotation={[0, 0, angle]} position={[0, 3, 0]}>
                <boxGeometry args={[0.3, 6, 0.05]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
            ))}
          </group>
        </group>
      </group>

      {/* Transmission Line Towers to Receiver Map Edge */}
      <group position={[-15, 0, 20]}>
        {[-15, 0, 15, 30].map((xPos, idx) => (
          <group key={idx} position={[xPos, 0, 0]}>
            <mesh position={[0, 7, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.4, 14]} />
              <meshStandardMaterial color="#718096" metalness={0.8} />
            </mesh>
          </group>
        ))}

        {/* Animated Power Flow Pulse */}
        <mesh ref={powerPulseRef} position={[-15, 12, 0]}>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshBasicMaterial color="#00f0ff" />
        </mesh>
      </group>

      {/* --- SLDC Control Centre Building --- */}
      <group position={[-20, 0, 10]}>
        <mesh position={[0, 3, 0]} castShadow>
          <boxGeometry args={[12, 6, 10]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* In-World Single Line Diagram Screen */}
        <mesh position={[0, 4, 5.05]}>
          <planeGeometry args={[8, 3.5]} />
          <meshBasicMaterial color="#061224" />
        </mesh>
        <Text position={[0, 4, 5.1]} fontSize={0.6} color="#00f0ff">
          SLDC GRID CONTROL ROOM
        </Text>
      </group>

      {/* 3D Diegetic Interactive Command Panel Floating in Front of Control Room */}
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2} position={[-20, 2, 17]}>
        <group scale={[0.8, 0.8, 0.8]}>
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[10, 6]} />
            <meshStandardMaterial color="#0c1424" transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
          <Text position={[0, 2.2, 0.1]} fontSize={0.5} color="#00f0ff">
            GRID COMMAND DISPATCH
          </Text>

          {/* Interactive Trigger Buttons */}
          <group position={[-2.5, 0.8, 0.1]} onClick={() => sendCommand('TRIP_BREAKER', 'critical')}>
            <mesh>
              <boxGeometry args={[4.2, 1, 0.2]} />
              <meshStandardMaterial color="#ff0055" />
            </mesh>
            <Text position={[0, 0, 0.15]} fontSize={0.35} color="#ffffff">
              TRIP BREAKER (CRITICAL)
            </Text>
          </group>

          <group position={[2.5, 0.8, 0.1]} onClick={() => sendCommand('CLOSE_BREAKER', 'critical')}>
            <mesh>
              <boxGeometry args={[4.2, 1, 0.2]} />
              <meshStandardMaterial color="#ffaa00" />
            </mesh>
            <Text position={[0, 0, 0.15]} fontSize={0.35} color="#000000">
              CLOSE BREAKER (CRITICAL)
            </Text>
          </group>

          <group position={[-2.5, -0.8, 0.1]} onClick={() => sendCommand('LOAD_SHED', 'high')}>
            <mesh>
              <boxGeometry args={[4.2, 1, 0.2]} />
              <meshStandardMaterial color="#00aa22" />
            </mesh>
            <Text position={[0, 0, 0.15]} fontSize={0.35} color="#ffffff">
              LOAD SHED (HIGH)
            </Text>
          </group>

          <group position={[2.5, -0.8, 0.1]} onClick={() => sendCommand('TELEMETRY', 'routine')}>
            <mesh>
              <boxGeometry args={[4.2, 1, 0.2]} />
              <meshStandardMaterial color="#00aaff" />
            </mesh>
            <Text position={[0, 0, 0.15]} fontSize={0.35} color="#ffffff">
              TELEMETRY (ROUTINE)
            </Text>
          </group>
        </group>
      </Float>
    </>
  );
};
