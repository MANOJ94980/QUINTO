import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Text, Sphere, Torus } from '@react-three/drei';
import * as THREE from 'three';

// Bloch sphere qubit visualisation
const BlochSphere: React.FC<{ basis: number; bit: number }> = ({ basis, bit }) => {
  const arrowRef = useRef<THREE.Mesh>(null!);

  const theta = basis === 0 ? (bit === 0 ? 0 : Math.PI) : (bit === 0 ? Math.PI / 2 : -Math.PI / 2);
  const phi = basis === 1 ? Math.PI / 4 : 0;

  return (
    <group>
      {/* Outer wireframe sphere */}
      <Sphere args={[1.5, 16, 16]}>
        <meshBasicMaterial color="#00f0ff" wireframe transparent opacity={0.2} />
      </Sphere>
      {/* Equator & axes */}
      <Torus args={[1.5, 0.02, 8, 64]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#334155" />
      </Torus>
      {/* State vector */}
      <mesh
        ref={arrowRef}
        position={[
          1.4 * Math.sin(theta) * Math.cos(phi),
          1.4 * Math.cos(theta),
          1.4 * Math.sin(theta) * Math.sin(phi)
        ]}
      >
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshBasicMaterial color={basis === 0 ? '#00ff88' : '#ff0055'} />
      </mesh>
      {/* Axis labels */}
      <Text position={[0, 1.8, 0]} fontSize={0.25} color="#00f0ff">|0⟩</Text>
      <Text position={[0, -1.8, 0]} fontSize={0.25} color="#00f0ff">|1⟩</Text>
      <Text position={[1.8, 0, 0]} fontSize={0.25} color="#ffbb00">|+⟩</Text>
      <Text position={[-1.8, 0, 0]} fontSize={0.25} color="#ffbb00">|−⟩</Text>
    </group>
  );
};

// Lab 3D environment background
const LabEnvironment: React.FC = () => {
  const glowRef = useRef<THREE.PointLight>(null!);
  useFrame((state) => {
    if (glowRef.current) {
      glowRef.current.intensity = 1.5 + Math.sin(state.clock.getElapsedTime() * 2) * 0.4;
    }
  });

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight ref={glowRef} position={[0, 8, 0]} color="#00f0ff" />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <mesh position={[0, -3, 0]} receiveShadow>
        <boxGeometry args={[60, 0.5, 60]} />
        <meshStandardMaterial color="#060d1a" />
      </mesh>
      <gridHelper args={[60, 30, '#00f0ff', '#0f2a3d']} position={[0, -2.75, 0]} />
      {/* Holographic floor rings */}
      {[4, 8, 12].map((r, i) => (
        <Torus key={i} args={[r, 0.04, 6, 80]} rotation={[Math.PI / 2, 0, 0]} position={[0, -2.7, 0]}>
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.2} />
        </Torus>
      ))}
    </>
  );
};

// ---- Main Quantum Lab UI Component ----
export const QuantumLabScene: React.FC = () => {
  const [step, setStep] = useState(0);
  const [interceptSlider, setInterceptSlider] = useState(0);
  const [bb84Result, setBb84Result] = useState<any>(null);
  const [shorResult, setShorResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const steps = [
    { title: 'BB84 Qubit Preparation', subtitle: 'Alice encodes bits in Z or X basis' },
    { title: 'Intercept-Resend Attack', subtitle: 'Eve measures in random basis — 50% wrong basis → errors' },
    { title: 'QBER vs Intercept Rate', subtitle: 'Statistical detection threshold: QBER > 11% = COMPROMISED' },
    { title: 'Finite-Key Confidence Bound', subtitle: 'Clopper-Pearson upper bound at 95% confidence' },
    { title: 'Privacy Amplification', subtitle: 'Toeplitz hash shrinks key to remove Eve\'s partial info' },
    { title: 'ML-KEM-768 (Post-Quantum KEM)', subtitle: 'NIST FIPS 203 lattice-based key encapsulation' },
    { title: 'Hybrid Key Derivation', subtitle: 'HKDF-SHA3-256 combines QKD + ML-KEM + session ID' },
    { title: 'Shor\'s Algorithm (N=15)', subtitle: 'Real quantum circuit on Aer — breaks RSA 1024 instantly' },
  ];

  const runBB84Demo = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bb84/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n_qubits: 16, learn_mode: true, eve_intercept_ratio: interceptSlider / 100, seed: 42 })
      });
      const data = await res.json();
      setBb84Result(data.bb84_result);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const runShorDemo = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shor/run?a=7');
      const data = await res.json();
      setShorResult(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const whyItMatters: Record<number, string> = {
    0: 'No-cloning theorem guarantees Eve cannot copy quantum states without disturbing them — the physical basis of QKD security.',
    1: 'Each wrong-basis intercept introduces a 50% bit-flip probability, raising QBER to ~25% at 100% intercept — statistically detectable.',
    2: 'With only 400 sample bits, the detection probability against 100% interception exceeds 99.9999% (1 − (3/4)^400).',
    3: 'Finite-key bounds quantify how much a small sample can be trusted — conservative bounds prevent false-clean certificates.',
    4: 'Even if Eve observed some sifted bits, Toeplitz hashing reduces her maximum information to negligible levels (ε-security).',
    5: 'ML-KEM-768 provides 128-bit post-quantum security. It is secure against both classical and quantum adversaries.',
    6: 'Combining QKD (information-theoretic security) with ML-KEM (computational PQC) creates defense-in-depth against any single failure.',
    7: 'A 1024-bit RSA key is factored in seconds on a fault-tolerant quantum computer via Shor\'s algorithm — classical crypto is broken in the quantum era.',
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* 3D Canvas Background */}
      <div className="absolute inset-0 z-0">
        <Canvas>
          <LabEnvironment />
          <PerspectiveCamera makeDefault position={[0, 3, 10]} fov={55} />
          <OrbitControls enableDamping target={[0, 0, 0]} maxPolarAngle={Math.PI / 2} />
          {/* Show Bloch sphere for step 0 */}
          {step === 0 && (
            <group position={[0, 0, 0]}>
              <Float speed={2} floatIntensity={0.3}>
                <group position={[-3, 0, 0]}>
                  <BlochSphere basis={0} bit={0} />
                  <Text position={[0, -2.2, 0]} fontSize={0.3} color="#00ff88">Z-basis |0⟩</Text>
                </group>
              </Float>
              <Float speed={1.8} floatIntensity={0.3}>
                <group position={[3, 0, 0]}>
                  <BlochSphere basis={1} bit={0} />
                  <Text position={[0, -2.2, 0]} fontSize={0.3} color="#ffbb00">X-basis |+⟩</Text>
                </group>
              </Float>
            </group>
          )}
          {/* Show Shor circuit hint for step 7 */}
          {step === 7 && shorResult && (
            <Float speed={1.5} floatIntensity={0.5} position={[0, 0, 0]}>
              <Text fontSize={0.45} color="#aa00ff" maxWidth={10} textAlign="center">
                {`N=15, a=7 → r=${shorResult.period_r}\nFactors: ${shorResult.factors?.join(' × ')}\nReal Aer quantum circuit`}
              </Text>
            </Float>
          )}
        </Canvas>
      </div>

      {/* Overlay HUD */}
      <div className="relative z-10 flex flex-col h-full pointer-events-none">
        {/* Step Navigation */}
        <div className="mt-16 mx-auto flex items-center gap-2 pointer-events-auto">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-7 h-7 rounded-full font-mono text-xs font-bold border transition ${
                step === i
                  ? 'bg-[#00f0ff] text-black border-[#00f0ff] shadow-lg'
                  : 'bg-[#0c1424]/80 text-gray-400 border-gray-700 hover:border-cyan-500'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Step Content Panel */}
        <div className="mt-4 mx-auto w-full max-w-3xl pointer-events-auto">
          <div className="glass-panel rounded-2xl p-5 border border-cyan-500/30 shadow-2xl">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="font-orbitron text-lg font-bold text-cyan-300 mb-1">{steps[step].title}</h2>
                <p className="text-sm text-gray-300">{steps[step].subtitle}</p>
              </div>
              <span className="text-xs font-mono text-gray-500 bg-[#0a0f18] px-2 py-1 rounded border border-gray-800">
                STEP {step + 1}/{steps.length}
              </span>
            </div>

            {/* Why it matters */}
            <div className="bg-[#0a1628] border border-cyan-500/20 rounded-lg p-3 mb-4">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold">Why it matters: </span>
              <span className="text-xs text-gray-300">{whyItMatters[step]}</span>
            </div>

            {/* Step-specific interactive controls */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <label className="text-xs font-mono text-gray-300 w-36">
                    Eve Intercept: <span className="text-cyan-400 font-bold">{interceptSlider}%</span>
                  </label>
                  <input
                    type="range" min={0} max={100} value={interceptSlider}
                    onChange={(e) => setInterceptSlider(Number(e.target.value))}
                    className="flex-1 accent-cyan-400"
                  />
                </div>
                <button
                  onClick={runBB84Demo}
                  disabled={loading}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-sm py-2 rounded font-bold transition"
                >
                  {loading ? 'RUNNING QISKIT SIMULATION...' : 'RUN BB84 SIMULATION ON QISKIT AER'}
                </button>
                {bb84Result && (
                  <div className="grid grid-cols-3 gap-2 mt-2 text-center font-mono text-xs">
                    {[
                      { label: 'Raw QBER', value: `${(bb84Result.raw_qber * 100).toFixed(2)}%`, color: 'text-yellow-300' },
                      { label: 'QBER Bound', value: `${(bb84Result.qber_bound * 100).toFixed(2)}%`, color: 'text-red-400' },
                      { label: 'Link State', value: bb84Result.link_state, color: bb84Result.link_state === 'HEALTHY' ? 'text-emerald-400' : 'text-red-400' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-[#0a0f1c] p-2 rounded border border-gray-800">
                        <p className="text-gray-400 text-[10px]">{label}</p>
                        <p className={`font-bold ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 7 && (
              <div className="space-y-3">
                <button
                  onClick={runShorDemo}
                  disabled={loading}
                  className="w-full bg-purple-700 hover:bg-purple-600 text-white font-mono text-sm py-2 rounded font-bold transition"
                >
                  {loading ? 'RUNNING SHOR ON QISKIT AER...' : "RUN SHOR'S ALGORITHM N=15 ON QISKIT AER"}
                </button>
                {shorResult && (
                  <div className="bg-[#0a0f1c] p-3 rounded border border-purple-800 font-mono text-xs space-y-1">
                    <p className="text-purple-300">N = {shorResult.N}, a = {shorResult.a}</p>
                    <p className="text-cyan-300">Period r = {shorResult.period_r}</p>
                    <p className="text-emerald-400 font-bold">Factors found: {shorResult.factors?.join(' × ')}</p>
                    <p className="text-gray-400">Circuit width: {shorResult.circuit_qubits} qubits, depth {shorResult.circuit_depth}</p>
                    <p className="text-gray-500 text-[10px]">{shorResult.explanation}</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-4">
              <button
                disabled={step === 0}
                onClick={() => setStep(s => Math.max(0, s - 1))}
                className="px-4 py-1.5 text-xs font-mono font-bold bg-[#0e1624] border border-gray-700 text-gray-300 hover:text-white rounded transition disabled:opacity-30"
              >
                ← PREV
              </button>
              <button
                disabled={step === steps.length - 1}
                onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
                className="px-4 py-1.5 text-xs font-mono font-bold bg-cyan-700 hover:bg-cyan-600 text-white rounded transition disabled:opacity-30"
              >
                NEXT →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
