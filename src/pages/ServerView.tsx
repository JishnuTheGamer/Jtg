import React, { useEffect, useState } from "react";
import { useParams, Link, Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";
import { Terminal, Folder, Play, Square, RefreshCw, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import ServerConsole from "../components/ServerConsole";
import FileManager from "../components/FileManager";

export default function ServerView() {
  const { id } = useParams();
  const [server, setServer] = useState<any>(null);
  const location = useLocation();

  const fetchServer = async () => {
    try {
      const res = await axios.get(`/api/servers/${id}`);
      setServer(res.data);
    } catch(e) {}
  };

  useEffect(() => {
    fetchServer();
    const interval = setInterval(fetchServer, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleAction = async (action: string) => {
    try {
       await axios.post(`/api/servers/${id}/${action}`);
       fetchServer();
    } catch(e) {}
  };

  if (!server) return (
    <div className="h-full flex items-center justify-center p-8 bg-gray-950">
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"
      />
    </div>
  );

  const tabs = [
    { name: "Console", path: `/servers/${id}`, exactPath: "", icon: <Terminal size={18} /> },
    { name: "Files", path: `/servers/${id}/files`, exactPath: "files", icon: <Folder size={18} /> },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col min-h-full bg-gray-950"
    >
      <div className="bg-gray-900 border-b border-gray-800 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-4">
          <Link to="/servers" className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{server.name}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${server.status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-500'}`}></span>
              <span className="text-sm text-gray-400 capitalize">{server.status}</span>
              <span className="text-sm text-gray-500 mx-2">•</span>
              <span className="text-sm text-gray-400">Port: {server.port}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap space-y-2 md:space-y-0 space-x-0 md:space-x-3 w-full md:w-auto">
          {server.status !== 'online' ? (
            <button onClick={() => handleAction('start')} className="w-full md:w-auto justify-center px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 font-medium rounded-lg transition-colors border border-green-500/20 flex items-center">
              <Play className="w-4 h-4 mr-2" /> Start
            </button>
          ) : (
            <button onClick={() => handleAction('stop')} className="w-full md:w-auto justify-center px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium rounded-lg transition-colors border border-red-500/20 flex items-center">
              <Square className="w-4 h-4 mr-2" /> Stop
            </button>
          )}
          <button onClick={() => handleAction('restart')} className="w-full md:w-auto justify-center px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 font-medium rounded-lg transition-colors border border-orange-500/20 flex items-center">
            <RefreshCw className="w-4 h-4 mr-2 text-orange-500" /> Restart
          </button>
        </div>
      </div>
      
      <div className="flex border-b border-gray-800 bg-gray-950 px-6 overflow-x-auto custom-scrollbar shrink-0">
        {tabs.map(tab => {
           const isActive = location.pathname === tab.path || location.pathname === `${tab.path}/`;
          return (
            <Link 
              key={tab.name}
              to={tab.path}
              className={`flex items-center space-x-2 px-6 py-4 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${isActive ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
              {tab.icon}
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="flex-1 p-4 relative flex flex-col min-h-0 bg-gray-950">
        <Routes>
          <Route path="/" element={<ServerConsole serverId={id!} />} />
          <Route path="/files" element={<FileManager serverId={id!} />} />
        </Routes>
      </div>
    </motion.div>
  );
}
