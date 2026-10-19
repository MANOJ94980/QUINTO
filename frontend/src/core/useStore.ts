import { create } from 'zustand';

const routes = ['sender', 'receiver', 'attacker', 'lab', 'analysis'] as const;
type Route = typeof routes[number];

const routeFromPath = (): Route => {
  const pathRoute = window.location.pathname.replace(/^\/+|\/+$/g, '') as Route;
  return routes.includes(pathRoute) ? pathRoute : 'sender';
};

export interface AppState {
  // Navigation & Role
  currentRoute: Route;
  scenario: 'grid' | 'rail' | 'av';
  lane: 'qgs' | 'classical';
  learnMode: boolean;
  
  // Eve / Attacker controls
  eveInterceptRatio: number;
  eveEraMode: 'classical-era' | 'quantum-era';
  
  // Quantum & Policy Link State
  linkState: 'HEALTHY' | 'DEGRADED' | 'COMPROMISED';
  qberBound: number;
  rawQber: number;
  pqcFallbackActive: boolean;
  
  // Camera & Diegetic View
  cameraPreset: number; // 1 to 5
  autopilotCamera: boolean;
  dayTime: number; // 0 to 24 for day/night cycle
  
  // Active Security Advisor Alert
  activeAlert: any | null;
  alertHistory: any[];
  
  // Cross-screen Event Sync & Frame Telemetry
  deliveredFrames: any[];
  pendingPackets: any[];
  
  // State Setters
  setCurrentRoute: (route: Route) => void;
  setScenario: (scenario: 'grid' | 'rail' | 'av') => void;
  setLane: (lane: 'qgs' | 'classical') => void;
  setLearnMode: (learn: boolean) => void;
  setEveInterceptRatio: (ratio: number) => void;
  setEveEraMode: (mode: 'classical-era' | 'quantum-era') => void;
  setLinkState: (state: 'HEALTHY' | 'DEGRADED' | 'COMPROMISED', bound: number, raw: number) => void;
  setCameraPreset: (preset: number) => void;
  setAutopilotCamera: (auto: boolean) => void;
  setActiveAlert: (alert: any) => void;
  addDeliveredFrame: (frame: any) => void;
  addPendingPacket: (packet: any) => void;
  removePendingPacket: (id: string) => void;
}

export const useStore = create<AppState>((set) => ({
  currentRoute: typeof window === 'undefined' ? 'sender' : routeFromPath(),
  scenario: 'grid',
  lane: 'qgs',
  learnMode: false,
  
  eveInterceptRatio: 0.0,
  eveEraMode: 'quantum-era',
  
  linkState: 'HEALTHY',
  qberBound: 0.02,
  rawQber: 0.01,
  pqcFallbackActive: false,
  
  cameraPreset: 1,
  autopilotCamera: false,
  dayTime: 12.0,
  
  activeAlert: null,
  alertHistory: [],
  
  deliveredFrames: [],
  pendingPackets: [],
  
  setCurrentRoute: (route) => {
    if (typeof window !== 'undefined' && window.location.pathname !== `/${route}`) {
      window.history.pushState({}, '', `/${route}`);
    }
    set({ currentRoute: route });
  },
  setScenario: (scenario) => set({ scenario }),
  setLane: (lane) => set({ lane }),
  setLearnMode: (learnMode) => set({ learnMode }),
  setEveInterceptRatio: (ratio) => set({ eveInterceptRatio: ratio }),
  setEveEraMode: (mode) => set({ eveEraMode: mode }),
  setLinkState: (linkState, qberBound, rawQber) => set({ linkState, qberBound, rawQber }),
  setCameraPreset: (cameraPreset) => set({ cameraPreset }),
  setAutopilotCamera: (autopilotCamera) => set({ autopilotCamera }),
  setActiveAlert: (activeAlert) => set((s) => ({ activeAlert, alertHistory: [activeAlert, ...s.alertHistory] })),
  addDeliveredFrame: (frame) => set((s) => ({ deliveredFrames: [frame, ...s.deliveredFrames.slice(0, 49)] })),
  addPendingPacket: (packet) => set((s) => ({ pendingPackets: [...s.pendingPackets, packet] })),
  removePendingPacket: (id) => set((s) => ({ pendingPackets: s.pendingPackets.filter(p => p.id !== id) }))
}));
