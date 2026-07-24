import React, { useEffect, useState } from "react";
import axios from "axios";
import { Server, Activity, HardDrive, Cpu, MemoryStick, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [servers, setServers] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, serversRes] = await Promise.all([
          axios.get("/api/system/stats"),
          axios.get("/api/servers")
        ]);
        setStats(statsRes.data);
        setServers(serversRes.data);
      } catch(e){}
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return (
    <div className="h-full flex items-center justify-center p-8">
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full"
      />
    </div>
  );

  const runningServers = servers.filter(s => s.status === 'online').length;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemAnim = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10"
    >
      <header className="mb-8 flex flex-col gap-4 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
            Overview
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            System Overview
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Monitor your infrastructure and activity.
          </p>
        </div>
        {user?.role === "admin" && (
          <Link
            to="/servers/create"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070708]"
          >
            Deploy New Server
          </Link>
        )}
      </header>
      
      <motion.div variants={container} initial="hidden" animate="show" className={`grid grid-cols-1 md:grid-cols-2 ${user?.role === 'admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-2 lg:max-w-3xl'} gap-5 mb-12`}>
        <StatCard title="Total Servers" value={servers.length.toString()} icon={<Server size={22} className="text-indigo-400" />} trend="+2 this week" chartColor="from-indigo-500 to-indigo-500/0" />
        <StatCard title="Running Servers" value={runningServers.toString()} icon={<Activity size={22} className="text-emerald-400" />} trend="Active now" chartColor="from-emerald-500 to-emerald-500/0" />
        {user?.role === "admin" && (
          <>
            <StatCard title="Dedicated CPU Usage" value={`${stats.cpuUsage}%`} icon={<Cpu size={22} className="text-blue-400" />} trend="Normal load" chartColor="from-blue-500 to-blue-500/0" />
            <StatCard title="Dedicated RAM Usage" value={`${stats.ramUsage}%`} icon={<MemoryStick size={22} className="text-purple-400" />} trend="Stable" chartColor="from-purple-500 to-purple-500/0" />
          </>
        )}
      </motion.div>

      <div className="flex items-center justify-between mb-6 mt-14">
        <h2 className="text-xl font-bold tracking-tight text-white">Recent Activity</h2>
        <Link to="/servers" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center transition-colors">
          View all <ChevronRight size={16} className="ml-1" />
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-[0_0_50px_-15px_rgba(0,0,0,0.5)] ring-1 ring-white/5 relative">
        {/* Subtle top glow */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-50" />
        
        {servers.length === 0 ? (
           <div className="p-16 text-center relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
             <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-inner relative z-10">
                <Server className="text-zinc-400" size={40} />
             </div>
             <h3 className="text-xl font-bold text-white mb-2 relative z-10 tracking-tight">No Activity Found</h3>
             <p className="text-zinc-400 text-sm font-medium relative z-10">Create a new server to get started.</p>
           </div>
        ) : (
          <div className="divide-y divide-white/5">
            {servers.slice(0, 5).map((server, index) => (
              <motion.div 
                key={server.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + (index * 0.05) }}
              >
                <Link to={`/servers/${server.id}`} className="flex items-center justify-between p-5 md:p-6 hover:bg-white/5 transition-all group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center group-hover:border-indigo-500/40 group-hover:bg-indigo-500/20 transition-all shadow-inner relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Server className="w-6 h-6 text-zinc-400 group-hover:text-indigo-400 transition-colors relative z-10" />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-100 group-hover:text-white transition-colors text-lg tracking-tight drop-shadow-sm">{server.name}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="flex h-2.5 w-2.5 relative">
                          {server.status === 'online' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${server.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-zinc-600'}`}></span>
                        </span>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{server.status}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="text-xs font-mono font-medium text-zinc-500 hidden sm:block bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                      {new Date(server.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <ChevronRight className="w-6 h-6 text-zinc-500 group-hover:text-white transition-colors group-hover:translate-x-1" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function StatCard({ title, value, icon, trend, chartColor }: { title: string, value: string, icon: React.ReactNode, trend?: string, chartColor?: string }) {
  const itemAnim = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };
  return (
    <motion.div variants={itemAnim} className="bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-white/10 relative overflow-hidden group hover:bg-black/60 transition-all shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
      {/* Decorative gradient blur in background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${chartColor} opacity-5 group-hover:opacity-10 transition-opacity`} />
      <div className={`absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br ${chartColor} opacity-20 blur-[50px] group-hover:opacity-40 transition-opacity`} />
      
      <div className="relative z-10 flex justify-between items-start mb-4">
        <div className="p-3 bg-white/5 rounded-xl border border-white/10 shadow-inner">
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <h3 className="text-3xl font-black text-white tracking-tight mb-1 drop-shadow-md">{value}</h3>
        <p className="text-sm font-bold text-zinc-300 uppercase tracking-widest opacity-80">{title}</p>
      </div>
      {trend && (
        <div className="relative z-10 mt-4 text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
          {trend}
        </div>
      )}
    </motion.div>
  );
}
