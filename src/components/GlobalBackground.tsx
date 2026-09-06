import React from 'react';
import { useSettings } from '../context/SettingsContext';

import { useEffect } from 'react';

export function GlobalBackground() {
  const { panelBackgroundImage, panelBackgroundBlur } = useSettings();

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
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-brightness-75" /> {/* Dark overlay for readability */}
    </div>
  );
}

