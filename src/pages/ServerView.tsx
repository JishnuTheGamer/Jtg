import React, { useEffect, useState } from "react";
import { useParams, Link, Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";
import { Terminal, Folder, Play, Square, RefreshCw, ArrowLeft, Sliders, Archive, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import ServerConsole from "../components/ServerConsole";
import FileManager from "../components/FileManager";
import ServerSettings from "../components/ServerSettings";
import ServerProperties from "../components/ServerProperties";
import ServerBackups from "../components/ServerBackups";
import { Settings } from "lucide-react";

export default function ServerView() {
  const { id } = useParams();
  const [server, setServer] = useState<any>(null);
  const [totalSystemRam, setTotalSystemRam] = useState<number>(0);
  const [showRamWarning, setShowRamWarning] = useState(false);
  const location = useLocation();

  const fetchServer = async () => {
    try {
      const res = await axios.get(`/api/servers/${id}`);
      setServer(res.data);
    } catch(e) {}
  };

  useEffect(() => {
    fetchServer();
    axios.get("/api/system/stats").then(res => {
      setTotalSystemRam(res.data.totalMemory / (1024 * 1024 * 1024));
    }).catch(() => {});
    const interval = setInterval(fetchServer, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const executeAction = async (action: string) => {
    try {
       await axios.post(`/api/servers/${id}/${action}`);
       fetchServer();
    } catch(e) {}
  };

  const handleAction = async (action: string) => {
    if (action === 'start' && totalSystemRam > 0 && server?.ram > totalSystemRam && !showRamWarning) {
      setShowRamWarning(true);
      return;
    }
    executeAction(action);
  };

  if (!server) return (
    <div className="h-full flex items-center justify-center p-8">
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full"
      />
    </div>
  );

  const tabs = [
    { name: "Terminal", path: `/servers/${id}`, exactPath: "", icon: <Terminal size={18} /> },
    { name: "Properties", path: `/servers/${id}/properties`, exactPath: "properties", icon: <Sliders size={18} /> },
    { name: "Filesystem", path: `/servers/${id}/files`, exactPath: "files", icon: <Folder size={18} /> },
    { name: "Settings", path: `/servers/${id}/settings`, exactPath: "settings", icon: <Settings size={18} /> },
    { name: "Backup", path: `/servers/${id}/backup`, exactPath: "backup", icon: <Archive size={18} /> },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full bg-transparent"
    >
      <div className="bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/5 p-3 md:p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0 shadow-lg relative z-20">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        {/* Left Side: Info */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center space-x-3">
            <Link to="/servers" className="p-1.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 shadow-sm rounded-lg text-zinc-400 hover:text-white transition-all">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-base md:text-lg font-bold tracking-tight text-white mb-0.5 leading-none">{server.name}</h1>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`flex h-2 w-2 relative`}>
                   {server.status === 'online' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                   <span className={`relative inline-flex rounded-full h-2 w-2 ${server.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-600'}`}></span>
                </span>
                <span className="text-[11px] md:text-xs font-medium text-zinc-400 capitalize">{server.status}</span>
                <span className="text-[11px] md:text-xs text-zinc-600">•</span>
                <span className="text-[11px] md:text-xs font-mono text-zinc-400">{server.port}</span>
              </div>
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center space-x-1.5 md:hidden">
            {server.status !== 'online' ? (
              <button onClick={() => handleAction('start')} className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg border border-emerald-500/20">
                <Play className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button onClick={() => handleAction('stop')} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg border border-red-500/20">
                <Square className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={() => handleAction('restart')} className="p-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-lg border border-orange-500/20">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        {/* Right Side: Tabs + Actions for PC */}
        <div className="flex flex-col md:flex-row items-center w-full md:w-auto gap-2 md:gap-4 mt-1 md:mt-0">
          
          {/* Tabs */}
          <div className="flex bg-white/[0.02] p-1 rounded-lg border border-white/5 w-full md:w-auto overflow-x-auto custom-scrollbar">
            {tabs.map(tab => {
               const isActive = location.pathname === tab.path || location.pathname === `${tab.path}/`;
               return (
                <Link 
                  key={tab.name}
                  to={tab.path}
                  className={`flex flex-1 md:flex-none items-center justify-center space-x-1.5 px-3 py-1.5 text-[11px] md:text-xs font-medium transition-colors rounded-md ${isActive ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <div className={`${isActive ? 'text-indigo-400' : 'text-zinc-500'} transition-colors hidden sm:block`}>{React.cloneElement(tab.icon, { size: 14 })}</div>
                  <span>{tab.name}</span>
                </Link>
              );
            })}
          </div>

          {/* PC Actions */}
          <div className="hidden md:flex items-center space-x-2">
            {server.status !== 'online' ? (
              <button onClick={() => handleAction('start')} className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-semibold rounded-lg transition-colors border border-emerald-500/20 flex items-center text-xs shadow-sm">
                <Play className="w-3.5 h-3.5 mr-1.5" /> Start
              </button>
            ) : (
              <button onClick={() => handleAction('stop')} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold rounded-lg transition-colors border border-red-500/20 flex items-center text-xs shadow-sm">
                <Square className="w-3.5 h-3.5 mr-1.5" /> Stop
              </button>
            )}
            <button onClick={() => handleAction('restart')} className="p-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 font-medium rounded-lg transition-colors border border-orange-500/20 flex items-center shadow-sm" title="Restart Unit">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative flex flex-col min-h-0 bg-transparent isolate">
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0a0a0c]">
           <Routes>
             <Route path="/" element={<ServerConsole serverId={id!} server={server} />} />
             <Route path="/properties" element={<ServerProperties serverId={id!} />} />
             <Route path="/files" element={<FileManager serverId={id!} />} />
             <Route path="/settings" element={<ServerSettings serverId={id!} server={server} />} />
             <Route path="/backup" element={<ServerBackups serverId={id!} />} />
           </Routes>
        </div>
      </div>

      <AnimatePresence>
        {showRamWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#121214] border border-red-500/30 shadow-2xl shadow-red-500/10 rounded-2xl p-6 max-w-md w-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-amber-500" />
              <div className="flex items-start mb-4">
                <div className="bg-red-500/10 p-3 rounded-full mr-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">High RAM Allocation</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    This instance is configured to use up to <strong className="text-white">{server?.ram}GB</strong> of RAM, but this system only has <strong className="text-white">{totalSystemRam.toFixed(1)}GB</strong> physically available. 
                  </p>
                  <p className="text-zinc-400 text-sm leading-relaxed mt-2">
                    The container uses memory on-demand, but if actual memory usage exceeds the host's physical RAM, the server will crash/be terminated by the OS.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowRamWarning(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowRamWarning(false);
                    executeAction('start');
                  }}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold rounded-xl transition-colors border border-red-500/30"
                >
                  Start Anyway
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
