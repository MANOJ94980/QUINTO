import React from 'react';
import { createRoot } from 'react-dom/client';

// Vite env declarations
declare module '*.glb' { const src: string; export default src; }
declare module '*.hdr' { const src: string; export default src; }
