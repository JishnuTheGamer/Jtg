import React from 'react';
import { useSettings } from '../context/SettingsContext';

import { useEffect } from 'react';

export function GlobalBackground() {
  const { panelBackgroundImage, panelBackgroundBlur, blueprintMode, blueprintOpacity, blueprintSize } = useSettings();

  useEffect(() => {
    if (panelBackgroundImage) {
      document.documentElement.classList.add('has-bg-image');
    } else {
      document.documentElement.classList.remove('has-bg-image');
    }
    return () => {
      document.documentElement.classList.remove('has-bg-image');
    }
  }, [panelBackgroundImage]);

  if (!panelBackgroundImage && !blueprintMode) return null;

  return (
    <div 
      className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat transition-all duration-500"
      style={{ 
        backgroundColor: "#07131c",
      }}
    >
      {panelBackgroundImage && <div className="absolute inset-[-20px] bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url("${panelBackgroundImage}")`, filter: `blur(${panelBackgroundBlur || 0}px)` }} />}
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-brightness-75" /> {/* Dark overlay for readability */}
      {blueprintMode && <div className="absolute inset-0" style={{ opacity: blueprintOpacity, backgroundImage: "linear-gradient(rgba(34,211,238,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.8) 1px, transparent 1px)", backgroundSize: `${blueprintSize}px ${blueprintSize}px` }} />}
    </div>
  );
}

