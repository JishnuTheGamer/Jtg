import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Server,
  Activity,
  Cpu,
  MemoryStick,
  ChevronRight,
  User,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [servers, setServers] = useState<any[]>([]);
  const [hoveredServer, setHoveredServer] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, serversRes] = await Promise.all([
          axios.get("/api/system/stats"),
          axios.get("/api/servers"),
        ]);
        setStats(statsRes.data);
        setServers(serversRes.data);
      } catch (e) {}
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!stats)
    return (
      <div className="h-full flex items-center justify-center p-8 bg-[#05050A]">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
            boxShadow: [
              "0 0 20px rgba(168,85,247,0.5)",
              "0 0 60px rgba(168,85,247,0.8)",
              "0 0 20px rgba(168,85,247,0.5)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-2 border-purple-500 border-t-transparent rounded-full"
        />
      </div>
    );

  const runningServers = servers.filter((s) => s.status === "online").length;
  const totalRam = servers.reduce((acc, s) => acc + (s.ram || 0), 0);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const itemAnim = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 400, damping: 25 },
    },
  };

  return (
    <div className="relative min-h-screen bg-[#05050A] overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.25, 0.15],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ repeat: Infinity, duration: 20, ease: "easeInOut" }}
          className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -60, 0],
            y: [0, 60, 0],
          }}
          transition={{ repeat: Infinity, duration: 25, ease: "easeInOut" }}
          className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-fuchsia-600/15 rounded-full blur-[140px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 p-5 md:p-10 max-w-7xl mx-auto"
      >
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between mb-12 gap-6"
        >
          <div className="flex items-center gap-5">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-2xl blur-xl opacity-40" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-purple-600 via-fuchsia-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl border border-purple-400/30">
                <User className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            <div>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm font-medium text-purple-300/60 mb-1"
              >
                Welcome back,
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl md:text-4xl font-black text-white tracking-tight"
              >
                {user?.username || user?.name || "Administrator"}
                <span className="inline-block ml-3 text-xs font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/30">
                  {user?.role === "admin" ? "ADMIN" : "USER"}
                </span>
              </motion.h1>
            </div>
          </div>

          {user?.role === "admin" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Link
                to="/servers/create"
                className="group relative inline-flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 border border-fuchsia-400/30 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span>Deploy New Server</span>
                <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Link>
            </motion.div>
          )}
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          <StatCard
            title="Total Servers"
            value={servers.length}
            icon={<Server className="w-6 h-6" />}
            trend="+2 this week"
            trendUp={true}
            color="purple"
            delay={0.1}
          />
          <StatCard
            title="Active Servers"
            value={runningServers}
            icon={<Activity className="w-6 h-6" />}
            trend="Running smoothly"
            trendUp={true}
            color="emerald"
            delay={0.2}
          />
          {user?.role === "admin" && (
            <>
              <StatCard
                title="CPU Usage"
                value={`${stats.cpuUsage}%`}
                icon={<Cpu className="w-6 h-6" />}
                trend="Optimal performance"
                trendUp={stats.cpuUsage < 70}
                color="cyan"
                delay={0.3}
              />
              <StatCard
                title="Memory Usage"
                value={`${stats.ramUsage}%`}
                icon={<MemoryStick className="w-6 h-6" />}
                trend={`${totalRam}GB allocated`}
                trendUp={stats.ramUsage < 70}
                color="fuchsia"
                delay={0.4}
              />
            </>
          )}
        </motion.div>

        {/* Recent Activity Section - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#0f1221]/60 backdrop-blur-2xl rounded-3xl border border-purple-500/20 overflow-hidden shadow-2xl"
        >
          <div className="p-6 border-b border-purple-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 rounded-xl border border-purple-500/30">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Recent Activity
                </h2>
                <p className="text-xs text-purple-300/40">
                  Latest server updates
                </p>
              </div>
            </div>
            <Link
              to="/servers"
              className="text-sm font-bold text-purple-400 hover:text-fuchsia-400 flex items-center gap-1 transition-colors group"
            >
              View All{" "}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="divide-y divide-purple-500/5">
            {servers.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-12 text-center"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 3,
                    ease: "easeInOut",
                  }}
                  className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-purple-500/30"
                >
                  <Server className="w-10 h-10 text-purple-400" />
                </motion.div>
                <h3 className="text-lg font-bold text-white mb-2">
                  No Servers Yet
                </h3>
                <p className="text-sm text-purple-300/40 mb-6">
                  Create your first server to get started
                </p>
                {user?.role === "admin" && (
                  <Link
                    to="/servers/create"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl border border-purple-500/30 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Create Server
                  </Link>
                )}
              </motion.div>
            ) : (
              servers
                .slice(0, 5)
                .map((server, index) => (
                  <ServerRow
                    key={server.id}
                    server={server}
                    index={index}
                    isHovered={hoveredServer === server.id}
                    onHover={setHoveredServer}
                  />
                ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon, trend, trendUp, color, delay }: any) {
  const colors: any = {
    purple: {
      from: "from-purple-500",
      to: "to-fuchsia-500",
      bg: "from-purple-600/20 to-fuchsia-600/20",
      text: "text-purple-400",
      border: "border-purple-500/30",
    },
    emerald: {
      from: "from-emerald-500",
      to: "to-cyan-500",
      bg: "from-emerald-600/20 to-cyan-600/20",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
    },
    cyan: {
      from: "from-cyan-500",
      to: "to-blue-500",
      bg: "from-cyan-600/20 to-blue-600/20",
      text: "text-cyan-400",
      border: "border-cyan-500/30",
    },
    fuchsia: {
      from: "from-fuchsia-500",
      to: "to-purple-500",
      bg: "from-fuchsia-600/20 to-purple-600/20",
      text: "text-fuchsia-400",
      border: "border-fuchsia-500/30",
    },
  };

  const c = colors[color];

  return (
    <motion.div
      className={`relative bg-[#0f1221]/60 backdrop-blur-2xl p-6 rounded-3xl border ${c.border} overflow-hidden group hover:scale-[1.02] transition-all duration-300 shadow-2xl`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${c.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
      />
      <div
        className={`absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-br ${c.from} ${c.to} opacity-20 blur-[60px] group-hover:opacity-40 transition-opacity`}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={`p-3 bg-gradient-to-br ${c.bg} rounded-2xl border ${c.border} shadow-lg`}
          >
            {icon}
          </motion.div>
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className={`w-2 h-2 rounded-full bg-gradient-to-r ${c.from} ${c.to}`}
          />
        </div>

        <div className="mb-3">
          <h3 className="text-4xl font-black text-white tracking-tight mb-1">
            {value}
          </h3>
          <p className="text-sm font-bold text-purple-300/60 uppercase tracking-wider">
            {title}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold ${
              trendUp ? "text-emerald-400" : "text-amber-400"
            } uppercase tracking-wider flex items-center gap-1`}
          >
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// Server Row Component
function ServerRow({ server, index, isHovered, onHover }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 * index }}
      onMouseEnter={() => onHover(server.id)}
      onMouseLeave={() => onHover(null)}
    >
      <Link
        to={`/servers/${server.id}`}
        className="flex items-center justify-between p-5 hover:bg-purple-500/5 transition-all group relative"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-fuchsia-500/10 to-purple-500/10"
        />

        <div className="flex items-center gap-4 relative z-10">
          <motion.div
            animate={isHovered ? { scale: 1.1, rotate: 5 } : {}}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${
              server.status === "online"
                ? "bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-emerald-500/30 shadow-lg shadow-emerald-500/20"
                : "bg-zinc-800/50 border-zinc-700"
            }`}
          >
            <Server
              className={`w-6 h-6 ${
                server.status === "online"
                  ? "text-emerald-400"
                  : "text-zinc-500"
              }`}
            />
          </motion.div>

          <div>
            <h3 className="font-bold text-white group-hover:text-fuchsia-300 transition-colors text-lg">
              {server.name}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    server.status === "online"
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-zinc-600"
                  }`}
                />
                <span className="text-xs font-bold text-purple-300/60 uppercase">
                  {server.status}
                </span>
              </span>
              <span className="text-xs text-purple-300/40">•</span>
              <span className="text-xs font-mono text-purple-300/40">
                {server.cpu}% CPU
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="hidden md:block text-right">
            <div className="text-xs font-mono text-purple-300/40">
              {new Date(server.createdAt).toLocaleDateString()}
            </div>
            <div className="text-[10px] text-purple-300/30">
              {server.ram}GB RAM
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-purple-400/50 group-hover:text-fuchsia-400 group-hover:translate-x-1 transition-all" />
        </div>
      </Link>
    </motion.div>
  );
}
