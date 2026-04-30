import React from 'react';
import { Loader2, BrainCircuit } from 'lucide-react';

// Full-screen loading overlay with glassmorphism effect
const LoadingScreen = ({ message = 'Loading Platform...' }) => (
  <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center space-y-6">
    <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center animate-bounce shadow-2xl shadow-primary/40">
      <BrainCircuit className="text-white w-8 h-8" />
    </div>
    <Loader2 className="w-10 h-10 text-primary animate-spin" />
    <div className="text-white/40 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
      {message}
    </div>
  </div>
);

export default LoadingScreen;
