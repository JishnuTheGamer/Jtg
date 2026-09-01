// @ts-nocheck
import React, { useEffect, useState } from "react"; 
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useParams, Link, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Terminal, Folder, Database, Calendar, Users, Disc, Network, Plug, Settings, Activity,
  Play, Square, RefreshCw, ArrowLeft, Archive, AlertTriangle, Copy, Check, Menu, X, LogOut, Lock,
  Home, User, Sliders, Puzzle, Globe, ChevronRight, Server as ServerIcon, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ServerConsole from "../components/ServerConsole";
import FileManager from "../components/FileManager";
import ServerSettings from "../components/ServerSettings";
import ServerProperties from "../components/ServerProperties";
import ServerBackups from "../components/ServerBackups";
import PluginManager from "../components/PluginManager";
import ModManager from "../components/ModManager";
import SubUsersManager from "../components/SubUsersManager";
import PlayerManager from "../components/PlayerManager";
import ServerSFTP from "../components/ServerSFTP";
import PlayitTunnel from "./PlayitTunnel";
import { useSettings } from "../context/SettingsContext";

export default function ServerView() {
  const { id } = useParams();
  const { enablePlayit } = useSettings();
  const [server, setServer] = useState<any>(null);
  const [totalSystemRam, setTotalSystemRam] = useState<number>(0);
  const [showRamWarning, setShowRamWarning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const handleCopyIp = () => {
    if (!server) return;
    const alias = server.ipAlias?.trim();
    const textToCopy = alias 
      ? (alias.includes(':') ? alias : `${alias}:${server.port || "25565"}`) 
      : `${server.port || "25565"}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const fetchServer = async () => {
    try {
      const { data } = await axios.get(`/api/servers/${id}`);
      setServer(data);
    } catch (error) {
      console.error("Error fetching server:", error);
    }
  };

  const fetchSystemRam = async () => {
    try {
      const { data } = await axios.get('/api/system/metrics');
      if (data && data.ram) {
        setTotalSystemRam(data.ram.total);
      }
    } catch (error) {
      console.error("Error fetching system ram:", error);
    }
  };

  useEffect(() => {
    fetchServer();
    fetchSystemRam();
    const interval = setInterval(fetchServer, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const executeAction = async (action: 'start' | 'stop' | 'restart') => {
    if (!server) return;
    try {
      setIsProcessing(true);
      await axios.post(`/api/servers/${server.id}/${action}`);
      await fetchServer();
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAction = (action: 'start' | 'stop' | 'restart') => {
    if (action === 'start' && server && server.ram > totalSystemRam && totalSystemRam > 0) {
      setShowRamWarning(true);
      return;
    }
    executeAction(action);
  };

  if (!server) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-[#010101]">
        <div className="w-8 h-8 border-4 border-[#fb4242] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const tabs = [
    { name: 'Terminal', path: `/servers/${id}`, icon: <Terminal size={20} /> },
    { name: 'File Manager', path: `/servers/${id}/files`, icon: <Folder size={20} /> },
    { name: 'Player Manager', path: `/servers/${id}/players`, icon: <Users size={20} /> },
    { name: 'Properties', path: `/servers/${id}/properties`, icon: <Sliders size={20} /> },
    { name: 'SFTP Details', path: `/servers/${id}/sftp`, icon: <Network size={20} /> },
    { name: 'Sub-Users', path: `/servers/${id}/subusers`, icon: <Shield size={20} /> },
    { name: 'Plugins', path: `/servers/${id}/plugins`, icon: <Puzzle size={20} /> },
    { name: 'Mods', path: `/servers/${id}/mods`, icon: <Plug size={20} /> },
    { name: 'Backup', path: `/servers/${id}/backup`, icon: <Archive size={20} /> },
    { name: 'Settings', path: `/servers/${id}/settings`, icon: <Settings size={20} /> },
    ...(enablePlayit ? [{ name: 'Playit Tunnel', path: `/servers/${id}/playit`, icon: <Globe size={20} /> }] : []),
  ];

  const currentTab = tabs.find(tab => 
    tab.name === 'Terminal' 
      ? location.pathname === tab.path 
      : location.pathname.startsWith(tab.path)
  ) || tabs[0];

  const getStatusColor = () => {
    if (server.status === 'online') return '#42e33d';
    if (server.status === 'starting' || server.status === 'restarting') return '#e8bd15';
    return '#fb4242';
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#010101] text-[#e9eaee] font-sans overflow-hidden">
      
      {/* Mobile Sidebar Backdrop Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/75 backdrop-blur-sm z-40 transition-opacity" 
            onClick={() => setSidebarOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* Mobile Slide-Out Navigation Drawer */}
      <div 
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-[290px] max-w-[85vw] bg-[#0c0c0e] border-r border-[#232020] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#1f1d1d] flex items-center justify-between bg-[#121113]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <ServerIcon size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{server.name || "Server"}</div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getStatusColor() }} />
                <span className="capitalize">{server.status || "offline"}</span>
                <span className="text-[#52525b]">•</span>
                <span className="text-[#d4d4d8] font-mono">{server.port || "25565"}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-[#a1a1aa] hover:text-white hover:bg-[#27272a] rounded-lg transition-colors"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Section Title */}
        <div className="px-4 pt-3 pb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717a]">Server Menu</span>
        </div>

        {/* Server Tabs Navigation List */}
        <div className="flex-1 px-3 py-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col gap-1">
          {tabs.map(tab => {
            const isActive = tab.name === 'Terminal' 
              ? location.pathname === tab.path 
              : location.pathname.startsWith(tab.path);
            
            return (
              <Link
                key={tab.name}
                to={tab.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all font-medium text-sm min-h-[44px]
                  ${isActive 
                    ? 'bg-red-500/15 border border-red-500/30 text-white shadow-sm font-semibold' 
                    : 'text-[#d4d4d8] hover:text-white hover:bg-[#1a1818]'}`}
              >
                <div className={`shrink-0 ${isActive ? 'text-red-400' : 'text-[#a1a1aa]'}`}>
                  {tab.icon}
                </div>
                <span className="truncate">{tab.name}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-400" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Drawer Bottom Quick Navigation */}
        <div className="p-3 border-t border-[#1f1d1d] bg-[#0e0d0f] flex flex-col gap-1">
          <Link 
            to="/" 
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a1a1aa] hover:text-white hover:bg-[#1a1818] transition-colors"
          >
            <Home size={18} />
            <span>Dashboard</span>
          </Link>
          <Link 
            to="/admin/servers" 
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a1a1aa] hover:text-white hover:bg-[#1a1818] transition-colors"
          >
            <Settings size={18} />
            <span>Admin Fleet</span>
          </Link>
          <Link 
            to="/settings" 
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a1a1aa] hover:text-white hover:bg-[#1a1818] transition-colors"
          >
            <User size={18} />
            <span>Account Settings</span>
          </Link>
        </div>
      </div>

      {/* Desktop Nebula Icon Sidebar (Visible on md and larger) */}
      <div className="hidden md:flex w-[75px] flex-col items-center py-4 bg-gradient-to-b from-[#010101]/30 to-transparent backdrop-blur-[12px] border-r border-[#131010] relative shrink-0">
        
        {/* Home */}
        <div className="mb-4 w-full px-2">
          <Link to="/" className="w-full h-[55px] flex items-center justify-center rounded-[10px] text-white hover:bg-[#ffffff20] transition-all relative group" title="Home">
            <Home size={22} className="group-hover:translate-x-[3px] transition-transform" />
          </Link>
        </div>

        <div className="w-[75%] h-px bg-[#131010] mb-4"></div>

        {/* Server Tabs */}
        <div className="flex-1 w-full px-2 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col items-center gap-2">
          {tabs.map(tab => {
            const isActive = tab.name === 'Terminal' 
              ? location.pathname === tab.path 
              : location.pathname.startsWith(tab.path);
            
            return (
              <Link
                key={tab.name}
                to={tab.path}
                title={tab.name}
                className={`w-[55px] h-[55px] flex items-center justify-center rounded-[10px] transition-all relative group shrink-0
                  ${isActive ? 'bg-[#fb4242]/20 border border-white/20' : 'text-white hover:bg-[#ffffff20]'}`}
              >
                <div className={`transition-transform duration-300 ${isActive ? 'text-white' : 'text-white group-hover:translate-x-[3px]'}`}>
                  {React.cloneElement(tab.icon, { size: 22 })}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="w-[75%] h-px bg-[#131010] mt-4 mb-4"></div>

        {/* Account / Settings */}
        <div className="w-full px-2 flex flex-col gap-2 pb-2">
          <Link to="/admin/servers" className="w-[55px] h-[55px] flex items-center justify-center rounded-[10px] text-white hover:bg-[#ffffff20] transition-all relative group shrink-0" title="Admin Fleet">
            <Settings size={22} className="group-hover:translate-x-[3px] transition-transform" />
          </Link>
          <Link to="/settings" className="w-[55px] h-[55px] flex items-center justify-center rounded-[10px] text-white hover:bg-[#ffffff20] transition-all relative group shrink-0" title="Account">
            <User size={22} className="group-hover:translate-x-[3px] transition-transform" />
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden min-w-0 relative bg-[#010101]">
        
        {/* Mobile Navigation Header Bar (Visible on mobile < md) */}
        <header className="md:hidden flex items-center justify-between px-3.5 py-2.5 bg-[#0a0a0c]/90 backdrop-blur-md border-b border-[#1f1d1d] z-30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              id="mobile-server-sidebar-toggle"
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-1 text-[#e4e4e7] hover:text-white bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] rounded-lg transition-colors flex items-center justify-center touch-manipulation min-w-[40px] min-h-[40px]"
              aria-label="Open server menu"
            >
              <Menu size={20} />
            </button>
            
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                style={{ backgroundColor: getStatusColor() }}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate max-w-[130px] sm:max-w-[200px]">
                  {server.name || "Server"}
                </span>
                <span className="text-[11px] text-[#a1a1aa] truncate flex items-center gap-1">
                  <span>{currentTab.name}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyIp}
              className="px-2.5 py-1.5 text-xs font-medium bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#d4d4d8] hover:text-white rounded-lg transition-colors flex items-center gap-1.5 touch-manipulation min-h-[36px]"
              title="Copy Address"
            >
              {copiedIp ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              <span className="hidden xs:inline">{copiedIp ? "Copied" : "Address"}</span>
            </button>

            <Link
              to="/"
              className="p-2 text-[#a1a1aa] hover:text-white bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] rounded-lg transition-colors flex items-center justify-center min-w-[36px] min-h-[36px]"
              title="Dashboard"
            >
              <Home size={16} />
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          <Routes>
            <Route path="/" element={<ServerConsole serverId={id!} server={server} />} />
            <Route path="/players" element={<PlayerManager serverId={id!} />} />
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
                  <p className="text-gray-400 text-sm leading-relaxed">
                    This instance is configured to use up to <strong className="text-white">{server?.ram}GB</strong> of RAM, but this system only has <strong className="text-white">{totalSystemRam.toFixed(1)}GB</strong> physically available. 
                  </p>
                  <p className="text-gray-400 text-sm leading-relaxed mt-2">
                    The container uses memory on-demand, but if actual memory usage exceeds the host's physical RAM, the server will crash/be terminated by the OS.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowRamWarning(false)}
                  className="px-4 py-2 bg-[#1c1818] hover:bg-[#252020] text-white font-medium rounded-xl transition-colors"
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
    </div>
  );
}
