import React, { useEffect, useState } from "react"; 
import { LoadingOverlay } from "../components/LoadingOverlay";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Server, ArrowLeft, Cpu, HardDrive, MemoryStick, Globe, User, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import SearchableDropdown from "../components/SearchableDropdown";

export default function CreateServer() {
  const [name, setName] = useState("");
  const [ram, setRam] = useState<string>("2");
  const [cpu, setCpu] = useState<string>("100");
  const [disk, setDisk] = useState<string>("10");
  const [port, setPort] = useState<string>("25565");
  const [ipAlias, setIpAlias] = useState<string>("");
  const [type, setType] = useState<string>("PAPER");
  const [version, setVersion] = useState("1.21.1");
  const [owner, setOwner] = useState("");
  const [versions, setVersions] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);
  const [totalSystemRam, setTotalSystemRam] = useState<number>(0);
  const [showRamWarning, setShowRamWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    axios.get(`/api/system/versions?type=${type}`).then(res => {
      setVersions(res.data);
      if(res.data.length > 0) setVersion(res.data[0]);
    });
  }, [type]);

  useEffect(() => {
    axios.get("/api/system/stats").then(res => {
      // res.data.totalMemory is in bytes
      setTotalSystemRam(res.data.totalMemory / (1024 * 1024 * 1024));
    }).catch(() => {});
    axios.get("/api/auth/users").then(res => {
      setUsers(res.data);
      if (res.data.length > 0) {
        // Default to the current admin's ID if available, otherwise first user
        const defaultOwner = res.data.find((u: any) => u.id === user?.id)?.id || res.data[0].id;
        setOwner(defaultOwner);
      }
    }).catch(() => {});
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for RAM overcommit
    if (totalSystemRam > 0 && Number(ram) > totalSystemRam && !showRamWarning) {
      setShowRamWarning(true);
      return;
    }
    
    executeSubmit();
  };
  
  const executeSubmit = async () => {
    setShowRamWarning(false);
    setLoading(true);
    setCreateProgress(0);

    const interval = setInterval(() => {
      setCreateProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 5;
      });
    }, 400);
    
    try {
      const payload: any = { 
        name, 
        ram: Number(ram), 
        cpu: Number(cpu),
        disk: Number(disk),
        port: Number(port), 
        ipAlias,
        type,
        version 
      };
      if (owner) {
        payload.owner = owner;
      }
      await axios.post("/api/servers", payload);
      
      clearInterval(interval);
      setCreateProgress(100);
      setError(null);
      
      setTimeout(() => {
        navigate("/servers");
      }, 500);
    } catch (e: any) {
      clearInterval(interval);
      setCreateProgress(0);
      setError(e.response?.data?.error || "Error creating server");
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-5 md:p-10 max-w-3xl mx-auto"
    >
      <div className="mb-10">
        <Link to="/servers" className="inline-flex items-center text-sm font-medium text-zinc-400 hover:text-white transition-colors mb-4">
          <ArrowLeft size={16} className="mr-2" /> Back to Instances
        </Link>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">Deploy Instance</h1>
        <p className="text-zinc-400">Configure parameters for a new Minecraft container.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-[#0a0a0c] p-6 md:p-8 rounded-2xl border border-white/5 shadow-2xl relative">
        {/* Subtle decorative glow */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full" />
        </div>

        <div className="space-y-8 relative z-10">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center">
              <Server className="w-4 h-4 mr-2 text-indigo-400" /> Instance Name
            </label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full bg-white/[0.02] border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-4 py-3 text-white transition-all shadow-inner outline-none"
              placeholder="e.g. Production Survival"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/[0.01] p-5 rounded-2xl border border-white/[0.02]">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center">
                <MemoryStick className="w-4 h-4 mr-2 text-purple-400" /> RAM Allocation (GB)
              </label>
              <input 
                type="number" 
                required 
                min={1}
                value={ram} 
                onChange={e => setRam(e.target.value)} 
                className="w-full bg-white/[0.02] border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-4 py-3 text-white transition-all shadow-inner outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center">
                <Cpu className="w-4 h-4 mr-2 text-blue-400" /> CPU Limit (%)
              </label>
              <input 
                type="number" 
                required 
                min={10}
                value={cpu} 
                onChange={e => setCpu(e.target.value)} 
                className="w-full bg-white/[0.02] border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-4 py-3 text-white transition-all shadow-inner outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center">
                <HardDrive className="w-4 h-4 mr-2 text-emerald-400" /> Disk Limit (GB)
              </label>
              <input 
                type="number" 
                required 
                min={1}
                value={disk} 
                onChange={e => setDisk(e.target.value)} 
                className="w-full bg-white/[0.02] border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-4 py-3 text-white transition-all shadow-inner outline-none font-mono"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 flex items-center ${error?.includes("Port") ? "text-red-400" : "text-zinc-300"}`}>
                 <Globe className={`w-4 h-4 mr-2 ${error?.includes("Port") ? "text-red-400" : "text-orange-400"}`} /> Network Port
              </label>
              <input 
                type="number" 
                required 
                value={port} 
                onChange={e => { setPort(e.target.value); setError(null); }} 
                className={`w-full bg-white/[0.02] border focus:ring-1 rounded-xl px-4 py-3 text-white transition-all shadow-inner outline-none font-mono ${error?.includes("Port") ? "border-red-500 focus:border-red-500 focus:ring-red-500/50" : "border-white/10 focus:border-indigo-500 focus:ring-indigo-500/50"}`}
              />
              {error?.includes("Port") && (
                <p className="mt-2 text-sm text-red-400 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1.5" />
                  {error}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center">
                 <Globe className="w-4 h-4 mr-2 text-indigo-400" /> IP Alias
              </label>
              <input 
                type="text" 
                value={ipAlias} 
                onChange={e => setIpAlias(e.target.value)} 
                placeholder="e.g. play.example.com"
                className="w-full bg-white/[0.02] border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-4 py-3 text-white transition-all shadow-inner outline-none font-mono"
              />
            </div>
          </div>

          <div className="md:col-span-2 relative z-20">
            <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center">
              <User className="w-4 h-4 mr-2 text-indigo-400" /> Assign Server Owner
            </label>
            <SearchableDropdown
              value={owner}
              onChange={setOwner}
              options={users.map(u => ({ value: u.id, label: `${u.username} ${u.id === user?.id ? "(You)" : `(${u.role})`}` }))}
              placeholder="Select a user..."
              searchPlaceholder="Search users..."
            />
            <p className="text-xs text-zinc-500 mt-2">Select which user owns and has access to this server.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Server Software Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-4 py-3 text-white transition-all shadow-inner outline-none"
              >
                <option value="PAPER" className="bg-zinc-900">Paper (Performance Minecraft)</option>
                <option value="VELOCITY" className="bg-zinc-900">Velocity (Proxy)</option>
                <option value="BUNGEECORD" className="bg-zinc-900">BungeeCord (Proxy)</option>
                <option value="FORGE" className="bg-zinc-900">Forge (Modded)</option>
                <option value="FABRIC" className="bg-zinc-900">Fabric (Modded)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Software Version</label>
              <SearchableDropdown
                value={version}
                onChange={setVersion}
                options={versions.map(v => ({ value: v, label: v }))}
                placeholder="Select a version..."
                searchPlaceholder="Search versions..."
                className="font-mono"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
             {loading && (
               <div className="mb-6 p-4 border border-zinc-800 bg-black/20 rounded-xl">
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-sm font-medium text-indigo-400">Downloading {version} and creating container...</span>
                   <span className="text-sm font-mono text-indigo-400/80">{createProgress}% downloading</span>
                 </div>
                 <div className="w-full bg-zinc-800/50 rounded-full h-2.5 overflow-hidden">
                   <div 
                     className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300 ease-out" 
                     style={{ width: `${createProgress}%` }}
                   ></div>
                 </div>
               </div>
             )}
             {error && !error.includes("Port") && (
               <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start text-red-400 mb-6">
                 <AlertTriangle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                 <p className="text-sm font-medium">{error}</p>
               </div>
             )}
             
             <button 
                type="submit" 
                disabled={loading}
                className="w-full px-4 py-3.5 bg-white text-zinc-900 hover:bg-zinc-200 font-bold rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center"
              >
                {loading ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full mr-3" />
                    Deploying...
                  </>
                ) : "Launch Instance"}
             </button>
          </div>
        </div>
      </form>

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
                    You are attempting to allocate <strong className="text-white">{ram}GB</strong> of RAM, but this system only has <strong className="text-white">{totalSystemRam.toFixed(1)}GB</strong> physically available. 
                  </p>
                  <p className="text-zinc-400 text-sm leading-relaxed mt-2">
                    The server has been configured to use memory on-demand, but if it actually consumes more than the available physical RAM during runtime, the host operating system may forcibly terminate (crash) it to prevent system instability.
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
                  onClick={executeSubmit}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold rounded-xl transition-colors border border-red-500/30"
                >
                  Yes, Proceed Anyway
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
          {(loading) && <LoadingOverlay message="Creating server..." />}
    </motion.div>
  );
}
