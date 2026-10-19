import React from 'react';

export const QuantumPlate: React.FC = () => {
  return (
    <div className="absolute top-4 left-4 z-40 flex items-center space-x-2 bg-[#0c121e]/90 border border-[#00f0ff]/40 px-3 py-1.5 rounded-md shadow-lg backdrop-blur-md">
      <div className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] animate-ping" />
      <span className="text-xs font-mono font-semibold tracking-wider text-[#00f0ff] uppercase">
        Simulated Quantum Channel
      </span>
      <span className="text-[10px] text-gray-400 border-l border-gray-700 pl-2">
        QGridShield v1.0
      </span>
    </div>
  );
};
