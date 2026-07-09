import React from 'react';
import { useSettings } from '../context/SettingsContext';

export function GlobalBackground() {
  const { panelBackgroundImage, panelBackgroundBlur } = useSettings();

  if (!panelBackgroundImage) return null;

  return (
    <div 
      className="fixed inset-0 z-[-1] bg-cover bg-center bg-no-repeat"
      style={{ 
        backgroundImage: `url(${panelBackgroundImage})`,
        filter: `blur(${panelBackgroundBlur || 0}px)`,
        transform: 'scale(1.1)', // To prevent blurred edges from showing the background behind it
      }}
    >
      <div className="absolute inset-0 bg-black/40" /> {/* Dark overlay for readability */}
    </div>
  );
}
