import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Menu, X } from "lucide-react";
import { useLocation, matchPath } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { panelName, panelLogo } = useSettings();

  const isServerView = matchPath("/servers/:id/*", location.pathname) && !matchPath("/servers/create", location.pathname);

  if (isServerView) {
    return (
      <div className="flex h-[100dvh] w-full bg-transparent text-zinc-100 font-sans overflow-hidden selection:bg-indigo-500/30">
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
          <main className="flex-1 overflow-hidden w-full h-full relative z-10">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-transparent text-zinc-100 font-sans overflow-hidden selection:bg-indigo-500/30">
      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setMobileOpen(false)} 
        />
      )}
      
      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 transform flex-shrink-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar onClose={() => setMobileOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Subtle background glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-transparent backdrop-blur-md border-b border-white/5 flex-shrink-0 relative z-10">
          <div className="flex items-center gap-2">
            {panelLogo ? (
              <img src={panelLogo} alt="Logo" className="w-6 h-6 rounded object-cover" />
            ) : (
              <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
            )}
            <h1 className="text-lg font-bold tracking-tight text-white truncate">{panelName}</h1>
          </div>
          <button onClick={() => setMobileOpen(true)} className="p-2 text-zinc-400 hover:text-white bg-white/5 rounded-lg transition-colors">
            <Menu size={20} />
          </button>
        </div>
        
        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto w-full h-full pb-safe relative z-10 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
