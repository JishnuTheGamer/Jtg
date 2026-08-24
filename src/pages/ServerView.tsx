// @ts-nocheck
import React, { useEffect, useState } from "react"; 
import { useParams, Link, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import ServerConsole from "../components/ServerConsole";
import FileManager from "../components/FileManager";
import ServerSettings from "../components/ServerSettings";
import ServerProperties from "../components/ServerProperties";
import ServerBackups from "../components/ServerBackups";
import PluginManager from "../components/PluginManager";
import ModManager from "../components/ModManager";
import PlayerManager from "../components/PlayerManager";
import SubUsersManager from "../components/SubUsersManager";
import ServerSFTP from "../components/ServerSFTP";
import PlayitTunnel from "./PlayitTunnel";
import WorldManager from "../components/WorldManager";

import { useSettings } from "../context/SettingsContext";

export default function ServerView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { enablePlayit, panelLogo, panelName } = useSettings();
  
  const [server, setServer] = useState<any>(null);
  const [totalSystemRam, setTotalSystemRam] = useState<number>(0);
  const [showRamWarning, setShowRamWarning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    if (actionLoading !== null) return;
    setActionLoading(action);
    setActionError(null);

    if (action === 'start') {
      setServer((prev: any) => prev ? { ...prev, status: 'starting' } : prev);
    } else if (action === 'stop') {
      setServer((prev: any) => prev ? { ...prev, status: 'stopping' } : prev);
    } else if (action === 'restart') {
      setServer((prev: any) => prev ? { ...prev, status: 'starting' } : prev);
    }
    try {
      if (action === 'stop' && (server?.status === 'starting' || server?.status === 'stopping')) {
        await axios.post(`/api/servers/${id}/kill`);
      } else {
        await axios.post(`/api/servers/${id}/${action}`);
      }
      await fetchServer();
    } catch(e: any) {
       console.error(`Failed to ${action} server:`, e);
       const msg = e?.response?.data?.error || e?.message || `Failed to ${action} server`;
       setActionError(msg);
       await fetchServer();
    } finally {
       setActionLoading(null);
    }
  };

  const handleAction = async (action: string) => {
    if (actionLoading !== null) return;
    if (action === 'start' && totalSystemRam > 0 && server?.ram > totalSystemRam && !showRamWarning) {
      setShowRamWarning(true);
      return;
    }
    executeAction(action);
  };

  if (!server) return (
    <div className="h-full flex items-center justify-center p-8 bg-[#010101]">
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-2 border-[#fb4242] border-t-transparent rounded-full"
      />
    </div>
  );

  const currentPath = location.pathname;
  const isTab = (path: string) => currentPath.endsWith(path) || (path === "" && currentPath === `/servers/${id}`);

  const navTo = (path: string) => {
    navigate(path);
  };

  const currentStatus = String(server.status || "offline").toLowerCase();
  const isOnline = currentStatus === "online";
  const isStarting = currentStatus === "starting";
  const isStopping = currentStatus === "stopping";
  const isRestarting = currentStatus === "restarting";
  const isOffline = !isOnline && !isStarting && !isStopping && !isRestarting;

  let orbClass = "offline";
  if (isOnline) orbClass = "online";
  else if (isStarting || isStopping || isRestarting) orbClass = "starting";

  const getStatusLabel = () => {
    if (isOnline) return "Online";
    if (isStarting) return "Starting";
    if (isStopping) return "Stopping";
    if (isRestarting) return "Restarting";
    if (currentStatus === "error") return "Error";
    return "Offline";
  };

  return (
    <div className="jtg-server-view font-sans">
      
      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-content">
          <Link to="/servers" className="sidebar-btn group" title={panelName || "Dashboard"}>
            {panelLogo ? (
              <img src={panelLogo} alt={panelName || "Logo"} className="w-7 h-7 object-contain rounded transition-transform duration-300 group-hover:scale-110" />
            ) : (
              <div className="w-7 h-7 bg-white flex items-center justify-center rounded transition-transform duration-500 group-hover:rotate-45">
                <div className="w-3.5 h-3.5 bg-black"></div>
              </div>
            )}
            <span className="tip">{panelName || "Dashboard"}</span>
          </Link>

          <div className="sidebar-spacer"></div>

          <div className="sidebar-category active">
            <button className={`sidebar-btn ${isTab("") ? "selected" : ""}`} onClick={() => navTo(`/servers/${id}`)}>
              <i className="bi bi-terminal"></i>
              <span className="tip">Terminal</span>
            </button>
            <button className={`sidebar-btn ${isTab("files") ? "selected" : ""}`} onClick={() => navTo(`/servers/${id}/files`)}>
              <i className="bi bi-folder2"></i>
              <span className="tip">Files</span>
            </button>
            <button className={`sidebar-btn ${isTab("players") ? "selected" : ""}`} onClick={() => navTo(`/servers/${id}/players`)}>
              <i className="bi bi-people"></i>
              <span className="tip">Players</span>
            </button>
            <button className={`sidebar-btn ${isTab("world") ? "selected" : ""}`} onClick={() => navTo(`/servers/${id}/world`)}>
              <i className="bi bi-globe2"></i>
              <span className="tip">World Manager</span>
            </button>
            <button className={`sidebar-btn ${isTab("plugins") ? "selected" : ""}`} onClick={() => navTo(`/servers/${id}/plugins`)}>
              <i className="bi bi-puzzle"></i>
              <span className="tip">Plugins</span>
            </button>
            <button className={`sidebar-btn ${isTab("mods") ? "selected" : ""}`} onClick={() => navTo(`/servers/${id}/mods`)}>
              <i className="bi bi-cpu"></i>
              <span className="tip">Mods</span>
            </button>
            <button className={`sidebar-btn ${isTab("backup") ? "selected" : ""}`} onClick={() => navTo(`/servers/${id}/backup`)}>
              <i className="bi bi-disc"></i>
              <span className="tip">Backups</span>
            </button>
            <button className={`sidebar-btn ${isTab("sftp") ? "selected" : ""}`} onClick={() => navTo(`/servers/${id}/sftp`)}>
              <i className="bi bi-hdd-network"></i>
              <span className="tip">Network (SFTP)</span>
            </button>
            {enablePlayit && (
              <button className={`sidebar-btn ${isTab("playit") ? "selected" : ""}`} onClick={() => navTo(`/servers/${id}/playit`)}>
                <i className="bi bi-broadcast"></i>
                <span className="tip">Playit Tunnel</span>
              </button>
            )}
            <button className={`sidebar-btn ${isTab("subusers") ? "selected" : ""}`} onClick={() => navTo(`/servers/${id}/subusers`)}>
              <i className="bi bi-person-badge"></i>
              <span className="tip">Sub-Users</span>
            </button>
            <button className={`sidebar-btn ${isTab("properties") ? "selected" : ""}`} onClick={() => navTo(`/servers/${id}/properties`)}>
              <i className="bi bi-sliders"></i>
              <span className="tip">Properties</span>
            </button>
            <button className={`sidebar-btn ${isTab("settings") ? "selected" : ""}`} onClick={() => navTo(`/servers/${id}/settings`)}>
              <i className="bi bi-gear"></i>
              <span className="tip">Settings</span>
            </button>
            <div className="sidebar-spacer"></div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="main-content">
        <div className="container">
          
          {/* Top Bar */}
          <div className="topbar">
            <div className="server">
              <div className={`orb ${orbClass}`}></div>
              <div className="flex items-center gap-3">
                <h1>{server.name}</h1>
                <span 
                  id="server-status-badge"
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider font-semibold border ${
                  isOnline 
                    ? "bg-[#42e33d]/10 text-[#42e33d] border-[#42e33d]/30" 
                    : isStarting || isStopping || isRestarting
                    ? "bg-[#e8bd15]/10 text-[#e8bd15] border-[#e8bd15]/30"
                    : currentStatus === "error"
                    ? "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30"
                    : "bg-white/5 text-[#9a9a9a] border-white/10"
                }`}>
                  {getStatusLabel()}
                </span>
              </div>
            </div>
            <div className="power flex items-center gap-2.5 sm:gap-3 flex-nowrap" id="server-power-controls" role="group" aria-label="Server Power Controls">
              <button 
                  id="btn-server-start"
                  className="pbtn green" 
                  title={isOnline ? "Server is already running" : isStarting || isRestarting ? "Server is starting" : "Start Server"} 
                  aria-label="Start Server"
                  aria-busy={actionLoading === 'start'}
                  onClick={() => handleAction('start')}
                  disabled={isOnline || isStarting || isRestarting || actionLoading !== null}
              >
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  {actionLoading === 'start' ? (
                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  ) : (
                    <i className="bi bi-play-fill text-lg"></i>
                  )}
                </div>
                <span>Start</span>
              </button>
              <button 
                  id="btn-server-restart"
                  className="pbtn yellow" 
                  title={isOffline ? "Server is offline" : isStarting || isStopping || isRestarting ? "Server transition in progress" : "Restart Server"} 
                  aria-label="Restart Server"
                  aria-busy={actionLoading === 'restart'}
                  onClick={() => handleAction('restart')}
                  disabled={isOffline || isStarting || isStopping || isRestarting || actionLoading !== null}
              >
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  {actionLoading === 'restart' ? (
                    <div className="w-4 h-4 border-2 border-black/50 border-t-black rounded-full animate-spin" />
                  ) : (
                    <i className="bi bi-arrow-clockwise text-base"></i>
                  )}
                </div>
                <span>Restart</span>
              </button>
              <button 
                  id="btn-server-stop"
                  className="pbtn red" 
                  title={isStarting || isStopping || isRestarting ? "Force Kill Server" : isOnline ? "Stop Server" : "Server is Offline"} 
                  aria-label={isStarting || isStopping || isRestarting ? "Force Kill Server" : "Stop Server"}
                  aria-busy={actionLoading === 'stop'}
                  onClick={() => handleAction('stop')}
                  disabled={(isOffline && !isStarting && !isStopping && !isRestarting) || actionLoading !== null}
              >
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  {actionLoading === 'stop' ? (
                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  ) : isStarting || isStopping || isRestarting ? (
                    <i className="bi bi-x-octagon-fill text-sm"></i>
                  ) : (
                    <i className="bi bi-stop-fill text-base"></i>
                  )}
                </div>
                <span>{isStarting || isStopping || isRestarting ? "Kill" : "Stop"}</span>
              </button>
            </div>
          </div>

          {/* Action Error Banner */}
          <AnimatePresence>
            {actionError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between gap-3 text-red-400 text-sm"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
                <button 
                  onClick={() => setActionError(null)} 
                  className="text-white/60 hover:text-white text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10"
                >
                  Dismiss
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dynamic Route Content */}
          <div className="w-full relative">
            <Routes>
               <Route path="/" element={<ServerConsole serverId={id!} server={server} />} />
               <Route path="/players" element={<PlayerManager serverId={id!} />} />
               <Route path="/properties" element={<ServerProperties serverId={id!} />} />
               <Route path="/world" element={<WorldManager serverId={id!} server={server} onNavigateToFileManager={() => navigate(`/servers/${id}/files`)} />} />
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

      {/* Mobile Nav */}
      <div className="mobile-nav">
        <button className="mobile-nav-btn" onClick={() => navigate('/servers')}>
          {panelLogo ? (
            <img src={panelLogo} alt="Logo" className="w-4 h-4 object-contain rounded-sm" />
          ) : (
            <i className="bi bi-house-fill"></i>
          )}
          <span>{panelName || "Home"}</span>
        </button>
        <button className={`mobile-nav-btn ${isTab("") ? "selected" : ""}`} onClick={() => navigate(`/servers/${id}`)}>
          <i className="bi bi-terminal"></i>
          <span>Console</span>
        </button>
        <button className={`mobile-nav-btn ${isTab("files") ? "selected" : ""}`} onClick={() => navigate(`/servers/${id}/files`)}>
          <i className="bi bi-folder2"></i>
          <span>Files</span>
        </button>
        <button className={`mobile-nav-btn ${isTab("players") ? "selected" : ""}`} onClick={() => navigate(`/servers/${id}/players`)}>
          <i className="bi bi-people"></i>
          <span>Players</span>
        </button>
        <button className={`mobile-nav-btn ${isTab("world") ? "selected" : ""}`} onClick={() => navigate(`/servers/${id}/world`)}>
          <i className="bi bi-globe2"></i>
          <span>World</span>
        </button>
        <button className={`mobile-nav-btn ${isTab("plugins") ? "selected" : ""}`} onClick={() => navigate(`/servers/${id}/plugins`)}>
          <i className="bi bi-puzzle"></i>
          <span>Plugins</span>
        </button>
        <button className={`mobile-nav-btn ${isTab("mods") ? "selected" : ""}`} onClick={() => navigate(`/servers/${id}/mods`)}>
          <i className="bi bi-cpu"></i>
          <span>Mods</span>
        </button>
        <button className={`mobile-nav-btn ${isTab("backup") ? "selected" : ""}`} onClick={() => navigate(`/servers/${id}/backup`)}>
          <i className="bi bi-disc"></i>
          <span>Backups</span>
        </button>
        <button className={`mobile-nav-btn ${isTab("sftp") ? "selected" : ""}`} onClick={() => navigate(`/servers/${id}/sftp`)}>
          <i className="bi bi-hdd-network"></i>
          <span>SFTP</span>
        </button>
        {enablePlayit && (
          <button className={`mobile-nav-btn ${isTab("playit") ? "selected" : ""}`} onClick={() => navigate(`/servers/${id}/playit`)}>
            <i className="bi bi-broadcast"></i>
            <span>Playit</span>
          </button>
        )}
        <button className={`mobile-nav-btn ${isTab("subusers") ? "selected" : ""}`} onClick={() => navigate(`/servers/${id}/subusers`)}>
          <i className="bi bi-person-badge"></i>
          <span>Sub-Users</span>
        </button>
        <button className={`mobile-nav-btn ${isTab("properties") ? "selected" : ""}`} onClick={() => navigate(`/servers/${id}/properties`)}>
          <i className="bi bi-sliders"></i>
          <span>Properties</span>
        </button>
        <button className={`mobile-nav-btn ${isTab("settings") ? "selected" : ""}`} onClick={() => navigate(`/servers/${id}/settings`)}>
          <i className="bi bi-gear"></i>
          <span>Settings</span>
        </button>
      </div>

      <AnimatePresence>
        {showRamWarning && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#131010] border border-[#fb4242]/30 shadow-2xl rounded-2xl p-6 max-w-md w-full relative overflow-hidden"
            >
              <div className="flex items-start mb-4">
                <div className="bg-[#fb4242]/10 p-3 rounded-full mr-4">
                  <AlertTriangle className="w-6 h-6 text-[#fb4242]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">High RAM Allocation</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    This instance is configured to use up to <strong className="text-white">{server?.ram}GB</strong> of RAM, but this system only has <strong className="text-white">{totalSystemRam.toFixed(1)}GB</strong> physically available. 
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowRamWarning(false)}
                  className="px-4 py-2 bg-[#252020] hover:bg-[#2f2828] text-white font-medium rounded-xl transition-colors border border-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowRamWarning(false);
                    executeAction('start');
                  }}
                  className="px-4 py-2 bg-[#fb4242]/20 hover:bg-[#fb4242]/30 text-[#fb4242] font-bold rounded-xl transition-colors border border-[#fb4242]/30"
                >
                  Start Anyway
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
