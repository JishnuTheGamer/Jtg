import React, { useEffect, useState } from "react"; 
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useParams, Link, Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";
import { Terminal, Folder, Play, Square, RefreshCw, ArrowLeft, Sliders, Archive, AlertTriangle, Copy, Check, Menu, X, Users, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import ServerConsole from "../components/ServerConsole";
import FileManager from "../components/FileManager";
import ServerSettings from "../components/ServerSettings";
import ServerProperties from "../components/ServerProperties";
import ServerBackups from "../components/ServerBackups";
import PluginManager from "../components/PluginManager";
import ModManager from "../components/ModManager";
import SubUsersManager from "../components/SubUsersManager";
import ServerSFTP from "../components/ServerSFTP";
import PlayitTunnel from "./PlayitTunnel";
import { Puzzle, Box, Network } from "lucide-react";
import { Settings, Globe } from "lucide-react";
import { useSettings } from "../context/SettingsContext";


export default function ServerView() {
  const { id } = useParams();
  const { enablePlayit } = useSettings();
  const [server, setServer] = useState<any>(null);
  const [totalSystemRam, setTotalSystemRam] = useState<number>(0);
  const [showRamWarning, setShowRamWarning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  

  const handleCopyIp = () => {
    if (!server) return;
    const textToCopy = server.ipAlias ? `${server.ipAlias}:${server.port}` : `${window.location.hostname}:${server.port}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    setIsProcessing(true);
    try {
       await axios.post(`/api/servers/${id}/${action}`);
       await fetchServer();
    } catch(e) {} finally {
       setIsProcessing(false);
    }
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

  const tabs: any[] = [
    { name: "Terminal", path: `/servers/${id}`, exactPath: "", icon: <Terminal size={18} /> },
    { name: "File Manager", path: `/servers/${id}/files`, exactPath: "files", icon: <Folder size={18} /> },
    { name: "SFTP Details", path: `/servers/${id}/sftp`, exactPath: "sftp", icon: <Network size={18} /> },
    { name: "Sub-Users", path: `/servers/${id}/subusers`, exactPath: "subusers", icon: <Users size={18} /> },
  ];

  const isProxy = ["VELOCITY", "BUNGEECORD", "WATERFALL"].includes(server?.type?.toUpperCase() || "");
  
  if (!isProxy) {
    tabs.splice(1, 0, { name: "Properties", path: `/servers/${id}/properties`, exactPath: "properties", icon: <Sliders size={18} /> });
  }

  if (server?.type === "PAPER") {
    tabs.push({ name: "Plugins", path: `/servers/${id}/plugins`, exactPath: "plugins", icon: <Puzzle size={18} /> });
  }

  if (server?.type === "FORGE" || server?.type === "FABRIC") {
    tabs.push({ name: "Mods", path: `/servers/${id}/mods`, exactPath: "mods", icon: <Box size={18} /> });
  }

  tabs.push(
    { name: "Settings", path: `/servers/${id}/settings`, exactPath: "settings", icon: <Settings size={18} /> },
    { name: "Backup", path: `/servers/${id}/backup`, exactPath: "backup", icon: <Archive size={18} /> }
  );

  if (enablePlayit) {
    tabs.push(
      { name: "Playit Tunnel", path: `/servers/${id}/playit`, exactPath: "playit", icon: <Globe size={18} /> }
    );
  }

  const navTabs: any[] = [
    { name: "Back to Dashboard", path: `/servers`, exactPath: "back", icon: <LogOut size={18} /> }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-full bg-transparent overflow-hidden"
    >
            
      
      {/* Drawer Overlay */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-black/80 md:bg-black/40 backdrop-blur-3xl border-r border-white/10 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
             <Link to="/servers" className="p-1.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 shadow-sm rounded-lg text-zinc-400 hover:text-white transition-all shrink-0">
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-lg font-bold tracking-tight text-white truncate pr-2">{server.name}</h1>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 text-zinc-400 hover:text-white bg-white/5 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 custom-scrollbar">
          {/* Status & Quick Actions */}
          <div className="mb-4 p-3 bg-white/[0.02] rounded-xl border border-white/5">
             <div className="flex items-center space-x-2 mb-3">
                <span className="flex h-2 w-2 relative shrink-0">
                   {server.status === 'online' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                   <span className={`relative inline-flex rounded-full h-2 w-2 ${server.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-600'}`}></span>
                </span>
                <span className="text-xs font-medium text-zinc-300 capitalize">{server.status}</span>
                <span className="text-xs text-zinc-600">•</span>
                <button onClick={handleCopyIp} className="flex items-center space-x-1.5 px-1.5 py-0.5 rounded-md hover:bg-white/10 transition-colors group cursor-pointer truncate" title="Copy Connection Info">
                  <span className="text-[11px] font-mono text-zinc-400 group-hover:text-zinc-300 transition-colors truncate">
                    {server.ipAlias ? `${server.ipAlias}:${server.port}` : server.port}
                  </span>
                  {copied ? <Check size={12} className="text-emerald-400 shrink-0" /> : <Copy size={12} className="text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />}
                </button>
             </div>
             <div className="grid grid-cols-2 gap-2">
                {server.status !== 'online' ? (
                  <button disabled={isProcessing} onClick={() => { handleAction('start'); setSidebarOpen(false); }} className="col-span-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-semibold rounded-lg transition-all border border-emerald-500/20 flex items-center justify-center text-xs shadow-sm disabled:opacity-50">
                    {isProcessing ? <div className="w-3.5 h-3.5 border-2 border-emerald-500/50 border-t-emerald-500 rounded-full animate-spin mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />} Start
                  </button>
                ) : (
                  <button disabled={isProcessing} onClick={() => { handleAction('stop'); setSidebarOpen(false); }} className="col-span-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold rounded-lg transition-all border border-red-500/20 flex items-center justify-center text-xs shadow-sm disabled:opacity-50">
                    {isProcessing ? <div className="w-3.5 h-3.5 border-2 border-red-500/50 border-t-red-500 rounded-full animate-spin mr-1.5" /> : <Square className="w-3.5 h-3.5 mr-1.5" />} Stop
                  </button>
                )}
                <button disabled={isProcessing} onClick={() => { handleAction('restart'); setSidebarOpen(false); }} className="col-span-2 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 font-medium rounded-lg transition-all border border-orange-500/20 flex items-center justify-center text-xs shadow-sm disabled:opacity-50">
                  {isProcessing ? <div className="w-3.5 h-3.5 border-2 border-orange-500/50 border-t-orange-500 rounded-full animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />} Restart
                </button>
             </div>
          </div>
          
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-3" />
          
          <div className="text-xs font-semibold text-zinc-500 mb-2 px-3 tracking-wider uppercase">Menu</div>

          {tabs.map(tab => {
             const isActive = location.pathname === tab.path || location.pathname === `${tab.path}/`;
             return (
              <Link 
                key={tab.name}
                to={tab.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 text-sm font-medium transition-all rounded-lg ${isActive ? 'bg-indigo-500/20 text-indigo-300 shadow-sm border border-indigo-500/30' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] border border-transparent'}`}
              >
                <div className={`${isActive ? 'text-indigo-400' : 'text-zinc-500'} transition-colors`}>
                  {React.cloneElement(tab.icon, { className: "w-4 h-4" })}
                </div>
                <span>{tab.name}</span>
              </Link>
            );
          })}
          
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />
          
          <div className="text-xs font-semibold text-zinc-500 mb-2 px-3 tracking-wider uppercase">Navigation</div>

          {navTabs.map(tab => {
             return (
              <Link 
                key={tab.name}
                to={tab.path}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center space-x-3 px-3 py-2.5 text-sm font-medium transition-all rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] border border-transparent"
              >
                <div className="text-zinc-500 transition-colors">
                  {React.cloneElement(tab.icon, { className: "w-4 h-4" })}
                </div>
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden relative isolate">
        {/* Top Header with Hamburger */}
        <div className="bg-black/40 backdrop-blur-2xl border-b border-white/10 p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)] relative z-20">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-1.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 shadow-sm rounded-lg text-zinc-400 hover:text-white transition-all flex items-center justify-center relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-red-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Menu size={18} className="relative z-10 group-hover:text-red-400 transition-colors" />
              </button>
              <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />
              <h1 className="text-base md:text-lg font-bold tracking-tight text-white mb-0.5 leading-none">{server.name}</h1>
            </div>
            <div className="flex md:hidden items-center space-x-2 shrink-0">
               <span className="flex h-2 w-2 relative shrink-0">
                  {server.status === 'online' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${server.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-600'}`}></span>
               </span>
               <span className="text-xs font-medium text-zinc-400 capitalize flex">{server.status}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 justify-between w-full md:w-auto">
             <button onClick={handleCopyIp} className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-colors group cursor-pointer shrink-0" title="Copy Connection Info">
                <span className="text-xs font-mono text-zinc-400 group-hover:text-zinc-300 transition-colors truncate max-w-[150px] lg:max-w-[200px]">
                  {server.ipAlias ? `${server.ipAlias}:${server.port}` : server.port}
                </span>
                {copied ? <Check size={14} className="text-emerald-400 shrink-0" /> : <Copy size={14} className="text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />}
             </button>
             <div className="hidden md:block w-px h-5 bg-white/10" />
             <div className="hidden md:flex items-center space-x-2 shrink-0">
                <span className="flex h-2 w-2 relative shrink-0">
                   {server.status === 'online' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                   <span className={`relative inline-flex rounded-full h-2 w-2 ${server.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-600'}`}></span>
                </span>
                <span className="text-xs font-medium text-zinc-400 capitalize flex">{server.status}</span>
             </div>
                
             <div className="flex items-center space-x-1 sm:space-x-2 shrink-0 ml-auto md:ml-1">
                {server.status !== 'online' ? (
                  <button disabled={isProcessing} onClick={() => handleAction('start')} className="p-1.5 sm:px-3 sm:py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-semibold rounded-lg transition-all border border-emerald-500/20 flex items-center justify-center text-xs shadow-sm disabled:opacity-50">
                    {isProcessing ? <div className="w-3.5 h-3.5 border-2 border-emerald-500/50 border-t-emerald-500 rounded-full animate-spin sm:mr-1.5" /> : <Play className="w-3.5 h-3.5 sm:mr-1.5" />} <span className="hidden sm:block">Start</span>
                  </button>
                ) : (
                  <button disabled={isProcessing} onClick={() => handleAction('stop')} className="p-1.5 sm:px-3 sm:py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold rounded-lg transition-all border border-red-500/20 flex items-center justify-center text-xs shadow-sm disabled:opacity-50">
                    {isProcessing ? <div className="w-3.5 h-3.5 border-2 border-red-500/50 border-t-red-500 rounded-full animate-spin sm:mr-1.5" /> : <Square className="w-3.5 h-3.5 sm:mr-1.5" />} <span className="hidden sm:block">Stop</span>
                  </button>
                )}
                <button disabled={isProcessing} onClick={() => handleAction('restart')} className="p-1.5 sm:px-3 sm:py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 font-medium rounded-lg transition-all border border-orange-500/20 flex items-center justify-center text-xs shadow-sm disabled:opacity-50">
                  {isProcessing ? <div className="w-3.5 h-3.5 border-2 border-orange-500/50 border-t-orange-500 rounded-full animate-spin sm:mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 sm:mr-1.5" />} <span className="hidden sm:block">Restart</span>
                </button>
             </div>
          </div>
        </div>

<div className="flex-1 relative flex flex-col min-h-0 bg-transparent">
        <div className="flex-1 flex flex-col relative overflow-hidden bg-transparent min-h-0">
           <Routes>
             <Route path="/" element={<ServerConsole serverId={id!} server={server} />} />
             <Route path="/properties" element={<ServerProperties serverId={id!} />} />
             <Route path="/files" element={<FileManager serverId={id!} />} />
             <Route path="/sftp" element={<ServerSFTP serverId={id!} server={server} />} />
             <Route path="/subusers" element={<SubUsersManager serverId={id!} />} />
             <Route path="/settings" element={<ServerSettings serverId={id!} server={server} />} />
             <Route path="/backup" element={<ServerBackups serverId={id!} />} />
             <Route path="/plugins" element={<PluginManager serverId={id!} />} />
             <Route path="/mods" element={<ModManager serverId={id!} />} />
             {enablePlayit && <Route path="/playit" element={<PlayitTunnel serverId={id!} />} />}
           </Routes>
        </div>
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
                {(isProcessing) && <LoadingOverlay />}
    </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

