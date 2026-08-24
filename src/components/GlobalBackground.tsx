import React from 'react';
import { useSettings } from '../context/SettingsContext';

export function GlobalBackground() {
  const { panelBackgroundImage, panelBackgroundBlur } = useSettings();

  if (!panelBackgroundImage) return null;

  return (
    <div 
      className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat transition-all duration-500"
      style={{ 
        backgroundImage: `url("${panelBackgroundImage}")`,
        filter: `blur(${panelBackgroundBlur || 0}px)`,
        transform: 'scale(1.08)', // To prevent blurred edges from showing
      }}
    >
      <div className="absolute inset-0 bg-slate-950/40 backdrop-brightness-75" /> {/* Dark overlay for readability */}
    </div>
  );
}

