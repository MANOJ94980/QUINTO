import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useStore } from './core/useStore';
import { Navbar } from './ui/Navbar';
import { QuantumPlate } from './ui/QuantumPlate';
import { SenderControls } from './ui/SenderControls';
import { SecurityAdvisorPanel } from './ui/SecurityAdvisorPanel';
import { PowerGridWorld } from './worlds/grid/PowerGridWorld';
import { RailwayWorld } from './worlds/rail/RailwayWorld';
import { AVFleetWorld } from './worlds/av/AVFleetWorld';
import { QuantumLabScene } from './scenes/lab/QuantumLabScene';
import { AnalysisRoom } from './scenes/analysis/AnalysisRoom';
import { AttackerView } from './scenes/lab/AttackerView';
import { ReceiverView } from './scenes/lab/ReceiverView';
import { useWebSocketClient } from './core/useWebSocket';

// Keyboard camera preset handler at top level
const KeyboardHandler: React.FC = () => {
  const setCameraPreset = useStore((s) => s.setCameraPreset);
  const setAutopilotCamera = useStore((s) => s.setAutopilotCamera);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '5') {
        setCameraPreset(Number(e.key));
        setAutopilotCamera(false);
      }
      if (e.key === 'a' || e.key === 'A') {
        setAutopilotCamera(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);
  return null;
};

// Sender 3D worlds with post-processing
const SenderWorldCanvas: React.FC = () => {
  const scenario = useStore((s) => s.scenario);

  return (
    <Canvas
      shadows
      camera={{ position: [30, 25, 35], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, toneMapping: 3, toneMappingExposure: 1.2 }}
    >
      <Suspense fallback={null}>
        {scenario === 'grid' && <PowerGridWorld />}
        {scenario === 'rail' && <RailwayWorld />}
        {scenario === 'av' && <AVFleetWorld />}

        {/* Post-processing for cinematic look */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.6} height={300} intensity={0.8} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
};

export const App: React.FC = () => {
  const currentRoute = useStore((s) => s.currentRoute);
  const setCurrentRoute = useStore((s) => s.setCurrentRoute);
  const socketRole = currentRoute === 'receiver' ? 'receiver' : currentRoute === 'attacker' ? 'attacker' : 'sender';
  useWebSocketClient(socketRole);

  useEffect(() => {
    const syncRoute = () => {
      const pathRoute = window.location.pathname.replace(/^\/+|\/+$/g, '');
      if (['sender', 'receiver', 'attacker', 'lab', 'analysis'].includes(pathRoute)) {
        setCurrentRoute(pathRoute as typeof currentRoute);
      }
    };
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, [setCurrentRoute]);

  const renderContent = () => {
    switch (currentRoute) {
      case 'sender':
        return (
          <div className="w-full h-full relative">
            <SenderWorldCanvas />
            <QuantumPlate />
            <SenderControls />
            <SecurityAdvisorPanel />
          </div>
        );
      case 'receiver':
        return <ReceiverView />;
      case 'attacker':
        return <AttackerView />;
      case 'lab':
        return <QuantumLabScene />;
      case 'analysis':
        return <AnalysisRoom />;
      default:
        return null;
    }
  };

  return (
    <div className="w-screen h-screen bg-[#080b11] overflow-hidden relative">
      <KeyboardHandler />
      <Navbar />
      <div className="absolute inset-0 top-14">
        {renderContent()}
      </div>
    </div>
  );
};
