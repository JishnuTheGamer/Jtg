// @ts-nocheck
import React, { useEffect, useState } from "react"; 
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useParams, Link, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Terminal, Folder, Database, Calendar, Users, Disc, Network, Plug, Settings, Activity,
  Play, Square, RefreshCw, ArrowLeft, Archive, AlertTriangle, Copy, Check, Menu, X, LogOut, Lock,
  Home, User, Sliders, Puzzle
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
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const handleCopyIp = () => {
    if (!server) return;
    const textToCopy = server.ipAlias ? `${server.ipAlias}:${server.port}` : `${window.location.hostname}:${server.port}`;
    navigator.clipboard.writeText(textToCopy);
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
    { name: 'Terminal', path: `/servers/${id}`, icon: <Terminal /> },
    { name: 'Player Manager', path: `/servers/${id}/players`, icon: <Users /> },
    { name: 'Properties', path: `/servers/${id}/properties`, icon: <Sliders /> },
    { name: 'File Manager', path: `/servers/${id}/files`, icon: <Folder /> },
    { name: 'SFTP Details', path: `/servers/${id}/sftp`, icon: <Network /> },
    { name: 'Sub-Users', path: `/servers/${id}/subusers`, icon: <Users /> },
    { name: 'Plugins', path: `/servers/${id}/plugins`, icon: <Puzzle /> },
    { name: 'Settings', path: `/servers/${id}/settings`, icon: <Settings /> },
    { name: 'Backup', path: `/servers/${id}/backup`, icon: <Archive /> },
  ];

  const getStatusColor = () => {
    if (server.status === 'online') return '#42e33d';
    if (server.status === 'starting' || server.status === 'restarting') return '#e8bd15';
    return '#fb4242';
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#010101] text-[#e9eaee] font-sans overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Nebula Icon Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-[75px] flex flex-col items-center py-4 bg-gradient-to-b from-[#010101]/30 to-transparent backdrop-blur-[12px] border-r border-[#131010] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
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
            // Need exact match for Terminal so it doesn't stay active on subpages
            const isActive = tab.name === 'Terminal' 
              ? location.pathname === tab.path 
              : location.pathname.startsWith(tab.path);
            
            return (
              <Link
                key={tab.name}
                to={tab.path}
                onClick={() => setSidebarOpen(false)}
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
          <Link to="/admin/servers" className="w-[55px] h-[55px] flex items-center justify-center rounded-[10px] text-white hover:bg-[#ffffff20] transition-all relative group shrink-0" title="Admin">
            <Settings size={22} className="group-hover:translate-x-[3px] transition-transform" />
          </Link>
          <Link to="/settings" className="w-[55px] h-[55px] flex items-center justify-center rounded-[10px] text-white hover:bg-[#ffffff20] transition-all relative group shrink-0" title="Account">
            <User size={22} className="group-hover:translate-x-[3px] transition-transform" />
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden min-w-0 relative">
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
