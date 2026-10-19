import React from 'react';
import { X, ExternalLink, ShieldCheck } from 'lucide-react';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl glass-panel rounded-2xl p-6 border border-cyan-500/30 text-white shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center space-x-3 border-b border-gray-700 pb-4 mb-4">
          <ShieldCheck className="w-8 h-8 text-[#00f0ff]" />
          <div>
            <h2 className="font-orbitron text-xl font-bold text-cyan-400">
              QGridShield Credits & Asset Attribution
            </h2>
            <p className="text-xs text-gray-400">
              Distributed Hybrid QKD + PQC Digital Twin Simulation Architecture
            </p>
          </div>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 font-mono text-xs">
          <div className="bg-[#0e1420] p-3 rounded border border-gray-800">
            <h3 className="text-sm font-semibold text-cyan-300 font-orbitron mb-1">
              3D Environment & Procedural Models
            </h3>
            <p className="text-gray-300 mb-2">
              All 3D assets, textures, procedural buildings, transmission gantries, train locomotives, and vehicle fleet geometries originate exclusively from CC0 Public Domain & CC-BY Creative Commons sources. No trademarked or proprietary brand logos are utilized.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li><strong className="text-gray-200">Kenney.nl</strong> - Industrial, Railway, City Road Graph & Vehicle Kit (CC0)</li>
              <li><strong className="text-gray-200">Quaternius</strong> - Modular Power Station, Substation & Wind Turbine Assets (CC0)</li>
              <li><strong className="text-gray-200">Poly Haven</strong> - PBR Textures, HDRI Outdoor Sky & Lighting Maps (CC0)</li>
              <li><strong className="text-gray-200">Sketchfab Community</strong> - Procedural Train & Substation Components (CC-BY 4.0)</li>
            </ul>
          </div>

          <div className="bg-[#0e1420] p-3 rounded border border-gray-800">
            <h3 className="text-sm font-semibold text-cyan-300 font-orbitron mb-1">
              Quantum Simulation Stack & Cryptography
            </h3>
            <ul className="space-y-1 text-gray-300">
              <li>• <strong className="text-white">Qiskit & Qiskit Aer:</strong> IBM Quantum SDK, AerSimulator, NoiseModel depolarizing/readout error models</li>
              <li>• <strong className="text-white">PQC Standards:</strong> ML-KEM-768 (NIST FIPS 203) & ML-DSA-65 (NIST FIPS 204)</li>
              <li>• <strong className="text-white">QKD Protocol:</strong> BB84 with Clopper-Pearson / Hoeffding finite-key upper confidence bound, Toeplitz privacy amplification, Wegman-Carter HMAC-SHA3-256 MACs</li>
            </ul>
          </div>

          <div className="bg-[#0e1420] p-3 rounded border border-gray-800 text-gray-400 text-[11px]">
            <p>
              This application is a 100% simulated digital twin demonstrator developed for critical infrastructure cybersecurity research and evaluation.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="bg-[#00f0ff] hover:bg-[#00c8d4] text-black font-orbitron font-bold text-xs px-6 py-2 rounded-lg transition"
          >
            CLOSE CREDITS
          </button>
        </div>
      </div>
    </div>
  );
};
