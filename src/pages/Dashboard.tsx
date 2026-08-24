import React, { useState, useEffect, useMemo } from 'react';
import { 
  Server, Cpu, HardDrive, Activity, Terminal, Play, 
  Square, RotateCw, Search, LayoutGrid, 
  List, Shield, Globe, Clock, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDashboardData } from '../hooks/useDashboardData';
import { useSettings } from '../context/SettingsContext';

const generateSparkline = (points = 10, min = 20, max = 80) => {
  return Array.from({ length: points }, () => Math.floor(Math.random() * (max - min + 1)) + min);
};

const SparklineChart = ({ data, color }: { data: number[], color: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (((val - min) / range) * 80 + 10);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="w-full h-12 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polyline
        points={`${points}`}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-md"
      />
      <polygon
        points={`0,100 ${points} 100,100`}
        fill={`url(#gradient-${color.replace('#', '')})`}
      />
    </svg>
  );
};

const ProgressBar = ({ value, max = 100, colorClass = "bg-violet-500" }: any) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={`h-full rounded-full ${colorClass}`}
      />
    </div>
  );
};

const StatusPill = ({ status }: any) => {
  const config: any = {
    online: { text: 'Online', bg: 'bg-emerald-500/10', textCol: 'text-emerald-400', dot: 'bg-emerald-500', anim: 'animate-pulse' },
    offline: { text: 'Offline', bg: 'bg-slate-800/50', textCol: 'text-slate-400', dot: 'bg-slate-500', anim: '' },
    starting: { text: 'Starting', bg: 'bg-amber-500/10', textCol: 'text-amber-400', dot: 'bg-amber-500', anim: 'animate-ping' },
    stopping: { text: 'Stopping', bg: 'bg-rose-500/10', textCol: 'text-rose-400', dot: 'bg-rose-500', anim: 'animate-pulse' },
    restarting: { text: 'Restarting', bg: 'bg-cyan-500/10', textCol: 'text-cyan-400', dot: 'bg-cyan-500', anim: 'animate-spin' },
  };
  const c = config[status] || config.offline;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-white/5 ${c.bg} ${c.textCol}`}>
      <span className="relative flex h-2 w-2 items-center justify-center">
        {c.anim && <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${c.dot} ${c.anim}`} />}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${c.dot}`} />
      </span>
      {c.text}
    </span>
  );
};

export default function Dashboard() {
  const { panelName } = useSettings();
  const { stats, statsHistory, servers: realServers, refetch } = useDashboardData();
  const [servers, setServers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  const navigate = useNavigate();
  const [actionInProgress, setActionInProgress] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (realServers && Array.isArray(realServers)) {
      setServers(realServers.map(s => ({
        id: s.id,
        name: s.name,
        type: (s.software || 'Unknown') + (s.version ? ` ${s.version}` : ''),
        ip: s.ipAlias || `${window.location.hostname}:${s.port || 25565}`,
        status: s.status,
        cpu: s.cpu || 0,
        ram: { used: s.memory || 0, total: 4096 }, // Default total memory for now
        uptime: isNaN(Number((s as any).uptime)) ? '-' : `${Math.floor(Number((s as any).uptime) / 3600)}h ${Math.floor((Number((s as any).uptime) % 3600) / 60)}m`
      })));
    }
  }, [realServers]);

  const STATS = useMemo(() => {
    const defaultData = Array(20).fill(0);
    const cpuData = statsHistory?.length ? statsHistory.map((s: any) => s.cpuUsage || 0) : defaultData;
    const ramData = statsHistory?.length ? statsHistory.map((s: any) => s.ramUsage || 0) : defaultData;
    const containersData = statsHistory?.length ? statsHistory.map((s: any) => s.activeContainers || 0) : defaultData;
    
    // pad with 0s if length is less than 2
    while (cpuData.length < 2) cpuData.unshift(0);
    while (ramData.length < 2) ramData.unshift(0);
    while (containersData.length < 2) containersData.unshift(0);

    return [
      { id: 'cpu', label: 'Cluster CPU', value: `${(stats?.cpuUsage || 0).toFixed(1)}%`, data: cpuData, color: '#8b5cf6' },
      { id: 'ram', label: 'Memory Usage', value: `${(stats?.ramUsage || 0).toFixed(1)}%`, data: ramData, color: '#06b6d4' },
      { id: 'net', label: 'Servers Online', value: `${(Array.isArray(realServers) ? realServers : []).filter(s => s.status === 'online').length} / ${(Array.isArray(realServers) ? realServers : []).length}`, data: defaultData, color: '#10b981' },
      { id: 'nodes', label: 'Active Containers', value: `${stats?.activeContainers || 0} / ${stats?.totalContainers || 0}`, data: containersData, color: '#f59e0b' }
    ];
  }, [stats, statsHistory, realServers]);

  const handleAction = async (id: string, action: string) => {
    setActionInProgress(prev => ({ ...prev, [id]: true }));
    try {
      await axios.post(`/api/servers/${id}/${action}`);
      refetch();
    } catch (e) {
      console.error('Action failed', e);
      alert('Failed to execute action');
    } finally {
      setActionInProgress(prev => ({ ...prev, [id]: false }));
    }
  };

  const filteredServers = useMemo(() => {
    return servers.filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.ip.includes(search)
    );
  }, [search, servers]);

  return (
    <div className="min-h-screen bg-transparent text-slate-200 font-sans selection:bg-violet-500/30 overflow-x-hidden">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Server className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{panelName || 'Panel Control'}</h1>
              <p className="text-sm text-slate-400">Global Infrastructure Overview</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            
            
            <div className="hidden sm:flex p-1 bg-transparent border border-white/5 rounded-xl">
              <button 
                onClick={() => setView('grid')}
                className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setView('list')}
                className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat, idx) => (
            <motion.div 
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-transparent backdrop-blur-none border border-white/5 rounded-2xl p-5 flex flex-col justify-between overflow-hidden relative group hover:border-white/10 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">{stat.label}</p>
                  <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
                </div>
                <div className="p-2 bg-white/5 rounded-lg">
                  <Activity className="h-5 w-5" style={{ color: stat.color }} />
                </div>
              </div>
              <div className="-mx-5 -mb-5 mt-4 opacity-60 group-hover:opacity-100 transition-opacity">
                <SparklineChart data={stat.data} color={stat.color} />
              </div>
            </motion.div>
          ))}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Server className="h-5 w-5 text-violet-400" />
              Deployed Instances
              <span className="px-2 py-0.5 rounded-md bg-white/5 text-xs text-slate-400 font-normal ml-2">
                {filteredServers.length}
              </span>
            </h2>
          </div>

          <motion.div 
            layout
            className={view === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" 
              : "flex flex-col gap-3"
            }
          >
            <AnimatePresence mode='popLayout'>
              {filteredServers.map((server) => (
                <ServerCard 
                  key={server.id} 
                  server={server} 
                  view={view}
                  isBusy={actionInProgress[server.id] || ['starting', 'stopping', 'restarting'].includes(server.status)}
                  onAction={(action: string) => handleAction(server.id, action)}
                  onOpenTerminal={() => navigate(`/servers/${server.id}`)}
                />
              ))}
            </AnimatePresence>
            
            {filteredServers.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 border border-dashed border-white/10 rounded-2xl"
              >
                <Search className="h-10 w-10 mb-4 opacity-50" />
                <p>No instances match your search parameters.</p>
              </motion.div>
            )}
          </motion.div>
        </section>

      </div>
    </div>
  );
}

const ServerCard = ({ server, view, isBusy, onAction, onOpenTerminal }: any) => {
  const cpuColor = server.cpu > 80 ? 'bg-rose-500' : server.cpu > 50 ? 'bg-amber-500' : 'bg-cyan-500';
  const ramColor = "bg-violet-500";
  
  if (view === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-transparent backdrop-blur-none border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-6 hover:bg-[#16161a] transition-colors"
      >
        <div className="flex items-center gap-4 min-w-[200px] flex-shrink-0">
          <StatusPill status={server.status} />
          <div>
            <h3 className="font-semibold text-slate-100 truncate w-40">{server.name}</h3>
            <p className="text-xs text-slate-500 font-mono">{server.id}</p>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-500 text-xs mb-1">IP Address</p>
            <p className="font-mono text-slate-300">{server.ip}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">Type</p>
            <p className="text-slate-300 truncate">{server.type}</p>
          </div>
          <div className="col-span-2 md:col-span-2 flex gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">CPU</span>
                <span className="text-slate-300">{server.cpu}%</span>
              </div>
              <ProgressBar value={server.cpu} colorClass={cpuColor} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">RAM</span>
                <span className="text-slate-300">{(server.ram.used/1024).toFixed(1)}/{(server.ram.total/1024).toFixed(1)}G</span>
              </div>
              <ProgressBar value={(server.ram.used/server.ram.total)*100} colorClass={ramColor} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <ActionButtons status={server.status} isBusy={isBusy} onAction={onAction} />
          <button 
            onClick={onOpenTerminal}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Open Console"
          >
            <Terminal className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-transparent backdrop-blur-none border border-white/5 rounded-2xl p-5 flex flex-col group hover:border-violet-500/30 transition-all hover:shadow-2xl hover:shadow-violet-500/5 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500/0 via-violet-500/20 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg text-slate-100 mb-1">{server.name}</h3>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>{server.id}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {server.ip}</span>
          </div>
        </div>
        <StatusPill status={server.status} />
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6 bg-white/5 rounded-lg p-2 px-3 w-max border border-white/5">
        <Shield className="h-4 w-4 text-violet-400" />
        {server.type}
      </div>

      <div className="space-y-4 mb-6 flex-1">
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-slate-400 flex items-center gap-1.5"><Cpu className="h-4 w-4" /> CPU Load</span>
            <span className="text-slate-200 font-medium">{server.cpu}%</span>
          </div>
          <ProgressBar value={server.cpu} colorClass={cpuColor} />
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-slate-400 flex items-center gap-1.5"><HardDrive className="h-4 w-4" /> Memory</span>
            <span className="text-slate-200 font-medium">{(server.ram.used/1024).toFixed(1)} / {(server.ram.total/1024).toFixed(1)} GB</span>
          </div>
          <ProgressBar value={(server.ram.used/server.ram.total)*100} colorClass={ramColor} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5" /> Uptime: {server.uptime}
        </div>
        
        <div className="flex items-center gap-2">
          <ActionButtons status={server.status} isBusy={isBusy} onAction={onAction} />
          
          <div className="w-px h-6 bg-white/10 mx-1" />
          
          <button 
            onClick={onOpenTerminal}
            className="p-2 rounded-lg bg-transparent hover:bg-violet-500/20 text-slate-400 hover:text-violet-300 border border-white/5 transition-all group/term"
          >
            <Terminal className="h-4 w-4 group-hover/term:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const ActionButtons = ({ status, isBusy, onAction }: any) => {
  const isOnline = status === 'online';

  return (
    <>
      {isOnline ? (
        <>
          <button 
            onClick={() => onAction('restart')} 
            disabled={isBusy}
            className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
            title="Restart"
          >
            <RotateCw className={`h-4 w-4 ${isBusy ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => onAction('stop')} 
            disabled={isBusy}
            className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors disabled:opacity-50"
            title="Stop"
          >
            <Square className="h-4 w-4" fill="currentColor" />
          </button>
        </>
      ) : (
        <button 
          onClick={() => onAction('start')} 
          disabled={isBusy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <Play className={`h-3.5 w-3.5 ${isBusy ? 'animate-pulse' : ''}`} fill="currentColor" /> Start
        </button>
      )}
    </>
  );
};
