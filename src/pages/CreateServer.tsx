import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import {
  ArrowLeft, Server, AlertTriangle, AlignLeft, MemoryStick as MemoryStickIcon,
  Cpu, Zap, Sparkles, HardDrive, Globe, User, Radio, GitBranch, Check,
  ChevronDown, Search, Rocket, SlidersHorizontal, FastForward, Network,
  Wrench, Feather, Info, Code2, TerminalSquare, Gamepad2, Layers, HelpCircle, Bot
} from "lucide-react";

const pageStyles = `
  .deploy-theme {
    background: #050505; color: #fff; font-family: 'IBM Plex Sans', sans-serif;
    min-height: 100vh;
  }
  .deploy-theme .font-display { font-family: 'Chakra Petch', sans-serif; }
  .deploy-theme .font-mono { font-family: 'IBM Plex Mono', monospace; }
  
  .deploy-theme .bg-grid {
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background-image: linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse 95% 70% at 50% 0%, #000 25%, transparent 78%);
    -webkit-mask-image: radial-gradient(ellipse 95% 70% at 50% 0%, #000 25%, transparent 78%);
  }
  .deploy-theme .scanline {
    position: fixed; left: 0; right: 0; height: 140px; top: -140px; z-index: 1; pointer-events: none;
    background: linear-gradient(to bottom, transparent, rgba(255,255,255,.028), transparent);
    animation: scan 10s linear infinite;
  }
  @keyframes scan { to { top: 100vh; } }
  .deploy-theme .noise {
    position: fixed; inset: 0; z-index: 60; pointer-events: none; opacity: .035;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  
  .deploy-theme .corner { position: absolute; width: 12px; height: 12px; }
  .deploy-theme .c-tl { top: -1px; left: -1px; border-top: 2px solid #fff; border-left: 2px solid #fff; }
  .deploy-theme .c-tr { top: -1px; right: -1px; border-top: 2px solid #fff; border-right: 2px solid #fff; }
  .deploy-theme .c-bl { bottom: -1px; left: -1px; border-bottom: 2px solid #fff; border-left: 2px solid #fff; }
  .deploy-theme .c-br { bottom: -1px; right: -1px; border-bottom: 2px solid #fff; border-right: 2px solid #fff; }

  .deploy-theme .inp {
    width: 100%; background: #0e0e0e; border: 1px solid #232323; padding: .85rem 1rem; color: #fff; outline: none; transition: border-color .25s, box-shadow .25s; font-size: .95rem;
  }
  .deploy-theme .inp::placeholder { color: #4c4c4c; }
  .deploy-theme .inp:focus { border-color: #fff; box-shadow: 0 0 0 1px #fff; }
  
  .deploy-theme .sel-card {
    position: relative; background: #0e0e0e; border: 1px solid #232323; cursor: pointer; transition: all .28s cubic-bezier(.16,1,.3,1); overflow: hidden;
  }
  .deploy-theme .sel-card:hover { transform: translateY(-3px); border-color: #5a5a5a; }
  .deploy-theme .sel-card.selected { border-color: #fff; background: #131313; box-shadow: 0 0 0 1px #fff, 0 14px 40px -14px rgba(255,255,255,.25); }
  .deploy-theme .sel-card .tick {
    position: absolute; top: 8px; right: 8px; width: 18px; height: 18px; background: #fff; color: #000; display: flex; align-items: center; justify-content: center; opacity: 0; transform: scale(.3); transition: all .3s cubic-bezier(.34,1.56,.64,1);
  }
  .deploy-theme .sel-card.selected .tick { opacity: 1; transform: scale(1); }
  .deploy-theme .soft-card .ic { color: #4c4c4c; transition: all .3s; }
  .deploy-theme .soft-card:hover .ic { color: #cfcfcf; }
  .deploy-theme .soft-card.selected .ic { color: #fff; filter: drop-shadow(0 0 8px rgba(255,255,255,.5)); }

  .deploy-theme .btn-white { position: relative; overflow: hidden; background: #fff; color: #000; }
  .deploy-theme .btn-white::before { content: ''; position: absolute; inset: 0; background: #000; transform: translateY(101%); transition: transform .35s cubic-bezier(.16,1,.3,1); }
  .deploy-theme .btn-white:hover:not(:disabled)::before { transform: translateY(0); }
  .deploy-theme .btn-white > * { position: relative; z-index: 1; transition: color .35s; }
  .deploy-theme .btn-white:hover:not(:disabled) > * { color: #fff; }
  .deploy-theme .btn-white:disabled { opacity: .35; cursor: not-allowed; }
  
  .deploy-theme .btn-ghost { background: transparent; border: 1px solid #232323; color: #8f8f8f; transition: all .25s; }
  .deploy-theme .btn-ghost:hover:not(:disabled) { border-color: #fff; color: #fff; }
  .deploy-theme .btn-ghost:disabled { opacity: .3; cursor: not-allowed; }

  .deploy-theme .dot { width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border: 1px solid #232323; background: #0b0b0b; font-size: 12px; color: #4c4c4c; transition: all .35s cubic-bezier(.16,1,.3,1); }
  .deploy-theme .dot.active { border-color: #fff; color: #fff; box-shadow: 0 0 0 1px #fff, 0 0 22px -4px rgba(255,255,255,.5); }
  .deploy-theme .dot.done { background: #fff; color: #000; border-color: #fff; }
  .deploy-theme .conn-fill { height: 100%; background: #fff; width: 0; transition: width .5s cubic-bezier(.16,1,.3,1); }
  
  .deploy-theme .anim-forward { animation: sR .5s cubic-bezier(.16,1,.3,1); }
  .deploy-theme .anim-back { animation: sL .5s cubic-bezier(.16,1,.3,1); }
  @keyframes sR { from { opacity: 0; transform: translateX(46px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes sL { from { opacity: 0; transform: translateX(-46px); } to { opacity: 1; transform: translateX(0); } }
  
  .deploy-theme .pulse-dot { animation: pd 2.4s infinite; }
  @keyframes pd { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,.35); } 50% { box-shadow: 0 0 0 6px rgba(255,255,255,0); } }
`;

const RAM = [
  {v:1,label:'Small Testing Server'},{v:2,label:'Small Testing Server'},{v:4,label:'Starter Survival'},
  {v:8,label:'Medium Survival Server'},{v:16,label:'Large Community Server'},
  {v:24,label:'Heavy Modpack Server'},{v:32,label:'High-Traffic Network'},
  {v:48,label:'Enterprise Workload'},{v:64,label:'Extreme Performance'},
];
const CPU_MAP: Record<number, number> = {1:100,2:100,4:150,8:200,16:300,24:400,32:500,48:700,64:800};

const MINECRAFT_SOFTWARE = [
  {id:'paper',name:'Paper',desc:'High Performance',icon: Zap},
  {id:'spigot',name:'Spigot',desc:'Classic Plugins',icon: Wrench},
  {id:'fabric',name:'Fabric',desc:'Lightweight Mods',icon: Feather},
  {id:'forge',name:'Forge',desc:'Classic Modpack',icon: Wrench},
  {id:'bungeecord',name:'BungeeCord',desc:'Classic Proxy',icon: Network},
  {id:'velocity',name:'Velocity',desc:'Next-gen Proxy',icon: FastForward}
];

const APPLICATION_SOFTWARE = [
  {id:'nodejs',name:'Node.js',desc:'JS / TS Runtime & Discord Bots',icon: Code2},
  {id:'python',name:'Python',desc:'Python 3.x Runtime & Scripts',icon: TerminalSquare}
];

const SOFTWARE = [...MINECRAFT_SOFTWARE, ...APPLICATION_SOFTWARE];

const STEPS = ['IDENTITY','RESOURCES','ACCESS','SOFTWARE','REVIEW'];

// Custom Dropdown Component
function CustomDropdown({ value, options, onChange, renderValue, renderOption, placeholder }: any) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filtered = options.filter((o: any) => 
    (o.label || o.name || o.value || o.v || '').toString().toLowerCase().includes(search.toLowerCase())
  );
  
  const selected = options.find((o: any) => (o.value || o.v) === value);

  return (
    <div className="relative" ref={wrapperRef}>
      <button 
        type="button" 
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 inp text-left !py-3 bg-[#0e0e0e]"
      >
        <span className="flex items-center gap-3 min-w-0">
          {selected ? renderValue(selected) : <span className="text-[#4c4c4c]">{placeholder}</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-[#4c4c4c] transition-transform duration-300 shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      
      {open && (
        <div className="absolute z-50 mt-2 w-full bg-[#0b0b0b] border border-[#232323] shadow-2xl shadow-black/70">
          <div className="p-2 border-b border-[#232323]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4c4c4c]" />
              <input 
                autoFocus
                className="w-full bg-[#050505] border border-[#232323] pl-8 pr-2 py-2 text-sm outline-none focus:border-white transition-colors text-white" 
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length > 0 ? filtered.map((o: any, i: number) => {
               const val = o.value || o.v;
               const isSel = val === value;
               return (
                 <div key={i} onClick={() => { onChange(val); setOpen(false); setSearch(''); }}>
                   {renderOption(o, isSel)}
                 </div>
               );
            }) : <p className="px-3 py-3 text-[11px] text-[#4c4c4c] font-mono">NO RESULTS</p>}
          </div>
        </div>
      )}
    </div>
  );
}

const getInitials = (name: string) => name ? name.slice(0, 2).toUpperCase() : '??';

import { useSettings } from '../context/SettingsContext';

export default function CreateServer() {
  const { defaultRuntime, runtimeLocked, isDev, panelName, panelLogo } = useSettings();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const pName = panelName || 'JTG PANEL';
  const nameParts = pName.split(' ');
  const firstWord = nameParts[0]?.toUpperCase() || 'JTG';
  const restWords = nameParts.slice(1).join(' ').toUpperCase();
  
  // Data
  const [nodes, setNodes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [versions, setVersions] = useState<string[]>([]);
  
  // Form State
  const [currentStep, setCurrentStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [deployed, setDeployed] = useState(false);
  const [deployProgress, setDeployProgress] = useState(0);
  const [nameError, setNameError] = useState(false);
  const [dir, setDir] = useState('forward');
  
  const [portStatus, setPortStatus] = useState('idle'); // 'idle', 'checking', 'used', 'available', 'invalid', 'error'
  const portCheckIdRef = useRef(0);
  
  const [softwareCategory, setSoftwareCategory] = useState<'minecraft' | 'other'>('minecraft');
  const [state, setState] = useState({
    name: '', desc: '', ram: 4, cpu: 150, disk: 10, ip: '', port: 25565, runtimeType: 'docker', 
    owner: user?.id || '', node: '', software: 'paper', version: 'latest', auto: true
  });

  const handleCategoryChange = (cat: 'minecraft' | 'other') => {
    setSoftwareCategory(cat);
    if (cat === 'minecraft') {
      if (!MINECRAFT_SOFTWARE.some(s => s.id === state.software)) {
        updateState('software', 'paper');
        if (state.port === 3000 || state.port === 8000 || state.port === 8080) {
          updateState('port', 25565);
        }
      }
    } else {
      if (!APPLICATION_SOFTWARE.some(s => s.id === state.software)) {
        updateState('software', 'nodejs');
        if (state.port === 25565) {
          updateState('port', 3000);
        }
      }
    }
  };

  useEffect(() => {
    if (defaultRuntime) {
      setState(s => ({ ...s, runtimeType: defaultRuntime }));
    }
  }, [defaultRuntime]);

  useEffect(() => {
    if (currentStep < 2) return;
    
    if (!state.port || state.port <= 0 || state.port > 65535) {
      setPortStatus('invalid');
      return;
    }
    
    const checkId = ++portCheckIdRef.current;
    setPortStatus('checking');
    
    const timer = setTimeout(() => {
      axios.get(`/api/servers/check-port?port=${state.port}`)
        .then(res => {
          if (checkId === portCheckIdRef.current) {
            setPortStatus(res.data.inUse ? 'used' : 'available');
          }
        })
        .catch(() => {
          if (checkId === portCheckIdRef.current) {
            setPortStatus('error');
          }
        });
    }, 400);
    
    return () => clearTimeout(timer);
  }, [state.port, currentStep]);

  useEffect(() => {
    // Add custom font link
    const link1 = document.createElement("link");
    link1.href = "https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500&display=swap";
    link1.rel = "stylesheet";
    document.head.appendChild(link1);
    
    axios.get("/api/nodes").then((res) => {
      setNodes(res.data);
      if (res.data.length > 0 && !state.node) {
        setState(s => ({ ...s, node: res.data[0].id }));
      }
    }).catch(() => {});
    
    if (user?.role === "admin" || user?.role === "owner") {
      axios.get("/api/auth/users").then((res) => setUsers(res.data)).catch(() => {});
    }
    
    return () => {
      document.head.removeChild(link1);
    };
  }, []);

  useEffect(() => {
    let active = true;
    axios.get(`/api/system/versions?type=${state.software}`).then((res) => {
      if (!active) return;
      const v = Array.isArray(res.data) ? res.data : (res.data.versions || []);
      setVersions(v);
      setState(s => ({
        ...s,
        version: s.version && v.includes(s.version) ? s.version : (v[0] || 'latest')
      }));
    }).catch(() => {
      if (!active) return;
      setVersions(['latest']);
      setState(s => ({ ...s, version: 'latest' }));
    });
    return () => { active = false; };
  }, [state.software]);

  const updateState = (key: string, val: any) => {
    setState(prev => ({ ...prev, [key]: val }));
  };

  const handleRamClick = (ramVal: number) => {
    let newCpu = state.cpu;
    if (state.auto) {
      newCpu = CPU_MAP[ramVal] || 100;
    }
    setState(prev => ({ ...prev, ram: ramVal, cpu: newCpu }));
  };

  const handleAutoToggle = () => {
    const nextAuto = !state.auto;
    setState(prev => ({ 
      ...prev, 
      auto: nextAuto, 
      cpu: nextAuto ? (CPU_MAP[prev.ram] || 100) : prev.cpu 
    }));
  };

  const [isCheckingPort, setIsCheckingPort] = useState(false); // Kept for type compatibility if used elsewhere
  const validateStep = async () => {
    if (currentStep === 0 && !state.name.trim()) {
      setNameError(true);
      return false;
    }
    
    if (currentStep === 2) {
      if (!state.port || state.port <= 0 || state.port > 65535) {
        alert("Please enter a valid Server Port (1-65535).");
        return false;
      }
      if (portStatus === 'used') {
        alert("Port is already in use by another server.");
        return false;
      }
      if (portStatus === 'checking') {
        // Wait for check to finish? The button should be disabled, but just in case
        return false;
      }
      if (portStatus === 'error') {
        alert("Could not verify this port. Try again.");
        return false;
      }
    }
    return true;
  };

  const showStep = (n: number) => {
    setDir(n > currentStep ? 'forward' : 'back');
    setCurrentStep(n);
    setMaxVisited(Math.max(maxVisited, n));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = async () => {
    const isValid = await validateStep();
    if (!isValid) return;
    if (currentStep < STEPS.length - 1) {
      showStep(currentStep + 1);
    } else {
      launch();
    }
  };
  
  const [deployStage, setDeployStage] = useState('Initializing deployment...');
  const deployTimerRef = useRef<any>(null);
  const pollTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (deployTimerRef.current) clearInterval(deployTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const launch = async () => {
    if (deployed) return;
    setDeployProgress(8);
    setDeployStage('Configuring instance parameters...');
    
    // Clear any previous timer
    if (deployTimerRef.current) clearInterval(deployTimerRef.current);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    let isCompleted = false;

    // Dynamic, continuous progress simulation that never freezes
    deployTimerRef.current = setInterval(() => {
      setDeployProgress(p => {
        if (isCompleted) return 100;
        
        let increment = 0;
        if (p < 30) {
          // Fast initial step: 8% -> 30%
          increment = Math.random() * 4 + 3;
          setDeployStage('Configuring instance parameters...');
        } else if (p < 60) {
          // File system & container provisioning: 30% -> 60%
          increment = Math.random() * 3 + 2;
          setDeployStage('Allocating server filesystem & assets...');
        } else if (p < 80) {
          // Runtime container allocation: 60% -> 80%
          increment = Math.random() * 2.5 + 1.5;
          setDeployStage('Provisioning runtime container...');
        } else if (p < 90) {
          // Network bindings phase: 80% -> 90%
          increment = Math.random() * 1.5 + 0.8;
          setDeployStage('Finalizing network bindings & port allocations...');
        } else if (p < 95) {
          // Gradual step-by-step progress (90%, 91%, 92%, 93%, 94%...)
          increment = Math.random() * 0.8 + 0.4;
          setDeployStage('Configuring environment permissions & SFTP...');
        } else if (p < 98) {
          // High percentage slow trickle (95%, 96%, 97%...)
          increment = Math.random() * 0.5 + 0.25;
          setDeployStage('Synchronizing runtime daemon state...');
        } else if (p < 99) {
          // Approaching completion (98% -> 99%)
          increment = 0.15;
          setDeployStage('Finalizing container launch...');
        } else {
          increment = 0.02; // ultra small trickle near 99.5% so it's always actively ticking
        }

        const next = Math.min(99.4, p + increment);
        return next;
      });
    }, 280);

    const markSuccessAndRedirect = () => {
      if (isCompleted) return;
      isCompleted = true;
      if (deployTimerRef.current) clearInterval(deployTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);

      setDeployStage('Instance ready!');
      setDeployProgress(100);

      setTimeout(() => {
        setDeployed(true);
      }, 400);

      setTimeout(() => {
        navigate("/servers");
      }, 1400);
    };

    // Safety polling after 4 seconds to detect if server is already created
    pollTimerRef.current = setInterval(async () => {
      if (isCompleted) {
        clearInterval(pollTimerRef.current);
        return;
      }
      try {
        const checkRes = await axios.get("/api/servers");
        if (Array.isArray(checkRes.data)) {
          const match = checkRes.data.find((s: any) => 
            (s.name === state.name || Number(s.port) === Number(state.port)) &&
            (Date.now() - new Date(s.createdAt || 0).getTime() < 120000)
          );
          if (match) {
            markSuccessAndRedirect();
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 2500);

    try {
      const payload = {
        name: state.name,
        description: state.desc,
        ram: state.ram,
        cpuLimit: state.cpu,
        diskLimit: state.disk,
        port: state.port,
        ipAlias: state.ip,
        type: state.software,
        version: state.version,
        ownerId: state.owner || user?.id,
        runtimeType: state.runtimeType,
        nodeId: state.node
      };
      await axios.post("/api/servers", payload, { timeout: 60000 });
      markSuccessAndRedirect();
    } catch (e: any) {
      if (isCompleted) return;
      if (deployTimerRef.current) clearInterval(deployTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      setDeployProgress(0);
      setDeployStage('');
      alert(e.response?.data?.error || e.message || "Failed to deploy container");
    }
  };

  const renderReviewRow = (k: string, v: string) => (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-[#4c4c4c] tracking-widest text-[11px] font-mono">{k}</span>
      <span className="text-white text-right truncate font-mono">{v}</span>
    </div>
  );

  return (
    <div className="deploy-theme">
      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
      <div className="noise"></div>
      <div className="bg-grid"></div>
      <div className="scanline"></div>
      
      {/* Progress Line */}
      <div 
        style={{ 
          position: 'fixed', top: 0, left: 0, height: '2px', width: '100%', zIndex: 100, 
          background: '#fff', transformOrigin: 'left', 
          transform: `scaleX(${(currentStep + 1) / STEPS.length})`, 
          boxShadow: '0 0 12px rgba(255,255,255,.7)', transition: 'transform .5s cubic-bezier(.16,1,.3,1)' 
        }} 
      />

      <div className="relative z-10">
        <nav className="sticky top-0 z-50 border-b border-[#232323] bg-[#050505]/90 backdrop-blur-md">
          <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
            <button onClick={() => navigate('/servers')} className="flex items-center gap-2 font-mono text-[11px] tracking-widest text-[#8f8f8f] hover:text-white transition-colors border border-[#232323] px-3 py-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> INSTANCES
            </button>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/servers'); }} className="flex items-center gap-3 group">
              {panelLogo ? (
                <img src={panelLogo} alt={pName} className="w-7 h-7 object-contain rounded" />
              ) : (
                <div className="w-7 h-7 bg-white flex items-center justify-center group-hover:rotate-45 transition-transform duration-500">
                  <div className="w-3.5 h-3.5 bg-black"></div>
                </div>
              )}
              <span className="font-display font-bold text-lg tracking-wide uppercase text-white">
                {firstWord} {restWords && <span className="text-[#8f8f8f] font-medium">{restWords}</span>}
              </span>
            </a>
          </div>
        </nav>

        <main className="max-w-3xl mx-auto px-5 pt-12 pb-16">
          <header className="mb-10">
            <p className="font-mono text-[11px] tracking-[0.3em] text-[#4c4c4c] mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-white rounded-full pulse-dot"></span> NEW CONTAINER
            </p>
            <h1 className="font-display font-bold tracking-tight text-4xl md:text-5xl">DEPLOY INSTANCE</h1>
          </header>

          {/* Stepper */}
          <div className="mb-4">
            <div className="flex items-start">
              {STEPS.map((s, i) => (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center flex-shrink-0" style={{ width: '56px' }}>
                    <button 
                      type="button" 
                      onClick={() => { if (i <= maxVisited && i !== currentStep && !deployed) showStep(i); }}
                      className={`dot font-mono ${i < currentStep ? 'done' : i === currentStep ? 'active' : ''}`}
                    >
                      {i < currentStep ? <Check className="w-4 h-4 stroke-[3]" /> : String(i + 1).padStart(2, '0')}
                    </button>
                    <span className="hidden sm:block mt-2 font-mono text-[9px] tracking-widest text-[#4c4c4c] text-center">
                      {s}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 h-px bg-[#232323] mt-[19px] mx-1">
                      <div className="conn-fill" style={{ width: i < currentStep ? '100%' : '0%' }}></div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="sm:hidden mt-4 font-mono text-[11px] tracking-widest text-[#8f8f8f] text-center">
              STEP {currentStep + 1} OF {STEPS.length} — {STEPS[currentStep]}
            </p>
          </div>

          <div className="relative border border-[#232323] bg-[#0b0b0b] p-6 md:p-9 mt-6">
            <span className="corner c-tl"></span><span className="corner c-tr"></span>
            <span className="corner c-bl"></span><span className="corner c-br"></span>

            <div className={`${dir === 'forward' ? 'anim-forward' : 'anim-back'}`}>
              
              {/* STEP 1: IDENTITY */}
              {currentStep === 0 && (
                <div className="step-content">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="font-mono text-xs text-[#4c4c4c]">01</span>
                    <h2 className="font-display font-bold tracking-wide text-sm">IDENTITY</h2>
                    <span className="flex-1 h-px bg-[#232323]"></span>
                  </div>
                  
                  <label className="flex items-center gap-2 text-sm text-[#8f8f8f] mb-2.5">
                    <Server className="w-4 h-4" /> Instance Name <span className="text-white">*</span>
                  </label>
                  <input 
                    type="text" 
                    className={`inp ${nameError ? 'border-theme-500' : ''}`} 
                    placeholder="e.g. Production Survival" 
                    value={state.name}
                    onChange={(e) => { updateState('name', e.target.value); setNameError(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNext(); } }}
                  />
                  {nameError && (
                    <p className="mt-2 text-xs text-theme-400 font-mono flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Instance name is required.
                    </p>
                  )}

                  <label className="flex items-center gap-2 text-sm text-[#8f8f8f] mb-2.5 mt-7">
                    <AlignLeft className="w-4 h-4" /> Description
                  </label>
                  <textarea 
                    className="inp" 
                    style={{ resize: 'vertical', minHeight: '96px', fontFamily: '"IBM Plex Sans", sans-serif' }}
                    placeholder="Short description of this server (optional)"
                    value={state.desc}
                    onChange={(e) => updateState('desc', e.target.value)}
                  />
                  <p className="text-[11px] text-[#4c4c4c] mt-2 mb-7 font-mono">Helps your team identify this instance later.</p>

                  {isDev && (
                    <div className="mt-4 pt-4 border-t border-[#232323]">
                      <div className="flex items-center justify-between mb-2.5">
                        <label className="flex items-center gap-2 text-sm text-[#8f8f8f]">
                          <Cpu className="w-4 h-4" /> Execution Runtime
                        </label>
                        <span className="text-[10px] font-mono text-theme-400 bg-theme-500/10 border border-theme-500/20 px-2 py-0.5 rounded">
                          Dev Panel Mode
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => updateState('runtimeType', 'docker')}
                          className={`sel-card p-4 text-left flex flex-col justify-between ${state.runtimeType === 'docker' ? 'selected' : ''}`}
                        >
                          <span className="tick"><Check className="w-3 h-3 stroke-[3]" /></span>
                          <div>
                            <div className="font-display font-bold text-sm text-white flex items-center gap-2">
                              Docker Container
                              {state.runtimeType === 'docker' && <span className="text-[9px] bg-theme-500 text-white px-1.5 py-0.2 rounded font-mono uppercase">Active</span>}
                            </div>
                            <div className="text-[11px] text-[#8f8f8f] mt-1">Isolated sandbox environment with full resource limits and terminal support.</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateState('runtimeType', 'local')}
                          className={`sel-card p-4 text-left flex flex-col justify-between ${state.runtimeType === 'local' ? 'selected' : ''}`}
                        >
                          <span className="tick"><Check className="w-3 h-3 stroke-[3]" /></span>
                          <div>
                            <div className="font-display font-bold text-sm text-white flex items-center gap-2">
                              Local Process (Node.js)
                              {state.runtimeType === 'local' && <span className="text-[9px] bg-amber-500 text-black px-1.5 py-0.2 rounded font-mono uppercase">Active</span>}
                            </div>
                            <div className="text-[11px] text-[#8f8f8f] mt-1">Direct system process execution. Ideal for environments without Docker daemon.</div>
                          </div>
                        </button>
                      </div>
                      <p className="text-[11px] text-[#4c4c4c] mt-2 font-mono">Developer mode: Select how this unit will be executed on the host.</p>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: RESOURCES */}
              {currentStep === 1 && (
                <div className="step-content">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="font-mono text-xs text-[#4c4c4c]">02</span>
                    <h2 className="font-display font-bold tracking-wide text-sm">RESOURCES</h2>
                    <span className="flex-1 h-px bg-[#232323]"></span>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-[#8f8f8f] mb-4">
                    <MemoryStickIcon className="w-4 h-4" /> RAM Allocation (GB)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {RAM.map(r => (
                      <button 
                        key={r.v} 
                        type="button" 
                        onClick={() => handleRamClick(r.v)}
                        className={`sel-card p-4 text-left ${r.v === state.ram ? 'selected' : ''}`}
                      >
                        <span className="tick"><Check className="w-3 h-3 stroke-[3]" /></span>
                        <div className="font-display font-bold text-2xl text-white">
                          {r.v}<span className="text-sm text-[#8f8f8f] ml-1">GB</span>
                        </div>
                        <div className="text-[11px] text-[#8f8f8f] mt-1.5 leading-snug">{r.label}</div>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                    <div>
                      <label className="flex items-center gap-2 text-sm text-[#8f8f8f] mb-2.5">
                        <Cpu className="w-4 h-4" /> CPU Limit (%)
                      </label>
                      <div className="flex gap-2.5">
                        <div className="relative flex-1">
                          <input 
                            type="number" min="10" 
                            className="inp font-mono pr-10" 
                            value={state.cpu}
                            onChange={(e) => { updateState('cpu', Number(e.target.value)); updateState('auto', false); }}
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4c4c4c] font-mono text-sm">%</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={handleAutoToggle}
                          className={`px-4 py-3 font-display font-bold text-sm tracking-widest transition-all flex items-center gap-2 whitespace-nowrap border ${state.auto ? 'bg-white text-black border-white' : 'bg-transparent text-[#8f8f8f] border-[#232323]'}`}
                        >
                          {state.auto ? <><Zap className="w-4 h-4" /> AUTO</> : <><SlidersHorizontal className="w-4 h-4" /> MANUAL</>}
                        </button>
                      </div>
                      <p className={`text-[11px] mt-2.5 font-mono flex items-center gap-1.5 ${state.auto ? 'text-[#8f8f8f]' : 'text-[#4c4c4c]'}`}>
                        {state.auto 
                          ? <><Sparkles className="w-3.5 h-3.5" /> Auto-optimized for {state.ram}GB</> 
                          : <><SlidersHorizontal className="w-3.5 h-3.5" /> Manual override active</>
                        }
                      </p>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm text-[#8f8f8f] mb-2.5">
                        <HardDrive className="w-4 h-4" /> Disk Limit (GB)
                      </label>
                      <input 
                        type="number" min="1" 
                        className="inp font-mono" 
                        value={state.disk}
                        onChange={(e) => updateState('disk', Number(e.target.value))}
                      />
                      <p className="text-[11px] text-[#4c4c4c] mt-2.5 font-mono flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" /> Storage space allocated to this server.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: NETWORK & ACCESS */}
              {currentStep === 2 && (
                <div className="step-content">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="font-mono text-xs text-[#4c4c4c]">03</span>
                    <h2 className="font-display font-bold tracking-wide text-sm">NETWORK & ACCESS</h2>
                    <span className="flex-1 h-px bg-[#232323]"></span>
                  </div>


                  <label className="flex items-center gap-2 text-sm text-[#8f8f8f] mb-2.5">
                    <Network className="w-4 h-4" /> Server Port
                  </label>
                  <div className="relative mb-4">
                    <input 
                      type="number" className={`inp font-mono ${portStatus === 'used' || portStatus === 'invalid' ? '!border-red-500/50' : portStatus === 'available' ? '!border-green-500/50' : ''}`} placeholder="25565" 
                      value={state.port || ''} onChange={e => updateState('port', e.target.value ? Number(e.target.value) : '')}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] tracking-widest flex items-center">
                      {portStatus === 'checking' && <span className="text-[#8f8f8f]">CHECKING...</span>}
                      {portStatus === 'available' && <span className="text-green-500">AVAILABLE</span>}
                      {portStatus === 'used' && <span className="text-red-500">IN USE</span>}
                      {portStatus === 'invalid' && <span className="text-red-500">INVALID</span>}
                      {portStatus === 'error' && <span className="text-red-500">ERROR</span>}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#4c4c4c] -mt-2 mb-8 font-mono">
                    {portStatus === 'used' ? "This port is already in use." : portStatus === 'invalid' ? "Port must be between 1 and 65535." : portStatus === 'error' ? "Could not verify this port. Try again." : "The main port the server will bind to. Must not be in use."}
                  </p>

                  <label className="flex items-center gap-2 text-sm text-[#8f8f8f] mb-2.5">
                    <Globe className="w-4 h-4" /> IP Alias
                  </label>
                  <input 
                    type="text" className="inp font-mono" placeholder="play.example.com" 
                    value={state.ip} onChange={e => updateState('ip', e.target.value)}
                  />
                  <p className="text-[11px] text-[#4c4c4c] mt-2 mb-8 font-mono">Optional custom domain or subdomain used to access your server.</p>

                  {(user?.role === "admin" || user?.role === "owner") && (
                    <>
                      <label className="flex items-center gap-2 text-sm text-[#8f8f8f] mb-2.5">
                        <User className="w-4 h-4" /> Assign Server Owner
                      </label>
                      <CustomDropdown
                        value={state.owner}
                        options={users.map(u => ({ v: u.id, name: u.username, tag: u.role, role: u.role }))}
                        onChange={(v: string) => updateState('owner', v)}
                        placeholder="Select an owner..."
                        renderValue={(o: any) => (
                          <>
                            <span className="w-8 h-8 rounded-full border border-[#232323] bg-[#0e0e0e] flex items-center justify-center font-display font-bold text-[11px] text-white shrink-0">
                              {getInitials(o.name)}
                            </span>
                            <span className="truncate text-white font-mono text-sm">{o.name} <span className="text-[#8f8f8f]">({o.tag})</span></span>
                          </>
                        )}
                        renderOption={(o: any, sel: boolean) => (
                          <button type="button" className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors ${sel ? 'bg-white/5' : 'hover:bg-white/5'}`}>
                            <span className="w-8 h-8 rounded-full border border-[#232323] bg-[#0e0e0e] flex items-center justify-center font-display font-bold text-[11px] text-white shrink-0">
                              {getInitials(o.name)}
                            </span>
                            <span className="flex-1 text-left font-mono">
                              <span className="block text-sm text-white">{o.name} <span className="text-[#8f8f8f]">({o.tag})</span></span>
                              <span className="block text-[11px] text-[#4c4c4c]">{o.role}</span>
                            </span>
                            {sel && <Check className="w-4 h-4 text-white" />}
                          </button>
                        )}
                      />
                      <p className="text-[11px] text-[#4c4c4c] mt-2 mb-8 font-mono">Select which user owns and has access to this server.</p>
                      
                      


    <label className="flex items-center gap-2 text-sm text-[#8f8f8f] mb-2.5">
      <Radio className="w-4 h-4" /> Deployment Node
    </label>
                      <CustomDropdown
                        value={state.node}
                        options={nodes.map(n => ({ v: n.id, label: n.name + ' (' + n.ip + ')' }))}
                        onChange={(v: string) => updateState('node', v)}
                        placeholder="Select a node..."
                        renderValue={(o: any) => (
                          <>
                            <Radio className="w-4 h-4 text-white shrink-0" />
                            <span className="text-white truncate font-mono text-sm">{o.label}</span>
                          </>
                        )}
                        renderOption={(o: any, sel: boolean) => (
                          <button type="button" className={`w-full flex items-center justify-between px-3 py-2.5 font-mono text-sm transition-colors ${sel ? 'text-white bg-white/5' : 'text-[#8f8f8f] hover:bg-white/5'}`}>
                            <span>{o.label}</span>
                            {sel && <Check className="w-4 h-4 text-white" />}
                          </button>
                        )}
                      />
                      <p className="text-[11px] text-[#4c4c4c] mt-2 font-mono">Physical node this container will be deployed to.</p>
                    </>
                  )}
                </div>
              )}

              {/* STEP 4: SOFTWARE */}
              {currentStep === 3 && (
                <div className="step-content space-y-6">
                  {/* Primary Workload Inquiry */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className="flex items-center gap-2 text-sm text-[#8f8f8f]">
                        <HelpCircle className="w-4 h-4 text-white" /> What type of server are you deploying?
                      </label>
                      <span className="text-[10px] font-mono uppercase bg-white/10 px-2 py-0.5 rounded text-white tracking-widest">
                        Workload Type
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleCategoryChange('minecraft')}
                        className={`sel-card p-4 text-left transition-all ${softwareCategory === 'minecraft' ? 'selected' : ''}`}
                      >
                        <span className="tick"><Check className="w-3 h-3 stroke-[3]" /></span>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <Gamepad2 className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-display font-bold text-sm text-white flex items-center gap-2">
                              Minecraft Server
                              {softwareCategory === 'minecraft' && (
                                <span className="text-[9px] bg-theme-600 text-white px-1.5 py-0.5 rounded font-mono uppercase">
                                  Selected
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#8f8f8f] mt-1 leading-snug">
                              Game engines, modded servers & proxies with RCON and world management.
                            </p>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCategoryChange('other')}
                        className={`sel-card p-4 text-left transition-all ${softwareCategory === 'other' ? 'selected' : ''}`}
                      >
                        <span className="tick"><Check className="w-3 h-3 stroke-[3]" /></span>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <Code2 className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-display font-bold text-sm text-white flex items-center gap-2">
                              Application & Script Runtime
                              {softwareCategory === 'other' && (
                                <span className="text-[9px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                                  Selected
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#8f8f8f] mt-1 leading-snug">
                              Standalone runtimes for Discord bots, custom scripts, APIs, and background processes.
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* DISPLAY MINECRAFT ENGINES & FEATURES */}
                  {softwareCategory === 'minecraft' && (
                    <div className="space-y-6 pt-2">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <span className="font-mono text-xs text-[#4c4c4c]">04A</span>
                          <h2 className="font-display font-bold tracking-wide text-sm text-white">MINECRAFT ENGINES</h2>
                          <span className="text-[10px] font-mono uppercase bg-theme-500/20 text-theme-300 border border-theme-500/30 px-2 py-0.5 rounded tracking-wider">
                            Game Server
                          </span>
                          <span className="flex-1 h-px bg-[#232323]"></span>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                          {MINECRAFT_SOFTWARE.map(s => {
                            const Icon = s.icon;
                            return (
                              <button 
                                key={s.id} 
                                type="button" 
                                onClick={() => updateState('software', s.id)}
                                className={`sel-card soft-card p-4 flex flex-col items-center text-center ${state.software === s.id ? 'selected' : ''}`}
                              >
                                <span className="tick"><Check className="w-3 h-3 stroke-[3]" /></span>
                                <Icon className="ic w-6 h-6 mb-2.5" />
                                <span className="font-display font-semibold text-sm text-white">{s.name}</span>
                                <span className="text-[10px] text-[#4c4c4c] mt-1 leading-tight">{s.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl flex items-center justify-between text-xs text-[#8f8f8f]">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-theme-400 shrink-0" />
                          <span>Includes Minecraft RCON console, auto-EULA acceptance, world & plugin management.</span>
                        </div>
                        <span className="text-[10px] font-mono text-theme-400 bg-theme-500/10 px-2 py-0.5 rounded shrink-0">Default Port: 25565</span>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm text-[#8f8f8f] mb-2.5">
                          <GitBranch className="w-4 h-4" /> Minecraft Game Version
                        </label>
                        <CustomDropdown
                          value={state.version}
                          options={versions.map(v => ({ v, label: v }))}
                          onChange={(v: string) => updateState('version', v)}
                          placeholder="Select a version..."
                          renderValue={(o: any) => (
                            <>
                              <GitBranch className="w-4 h-4 text-white shrink-0" />
                              <span className="font-mono text-white text-sm">{o.label}</span>
                            </>
                          )}
                          renderOption={(o: any, sel: boolean) => (
                            <button type="button" className={`w-full flex items-center justify-between px-3 py-2.5 font-mono text-sm transition-colors ${sel ? 'text-white bg-white/5' : 'text-[#8f8f8f] hover:bg-white/5'}`}>
                              <span>{o.label}</span>
                              {sel && <Check className="w-4 h-4 text-white" />}
                            </button>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* DISPLAY APPLICATION & SCRIPT RUNTIMES */}
                  {softwareCategory === 'other' && (
                    <div className="space-y-6 pt-2">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <span className="font-mono text-xs text-[#4c4c4c]">04B</span>
                          <h2 className="font-display font-bold tracking-wide text-sm text-white">APPLICATION & SCRIPT RUNTIMES</h2>
                          <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded tracking-wider">
                            Standalone Runtime
                          </span>
                          <span className="flex-1 h-px bg-[#232323]"></span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {APPLICATION_SOFTWARE.map(s => {
                            const Icon = s.icon;
                            return (
                              <button 
                                key={s.id} 
                                type="button" 
                                onClick={() => updateState('software', s.id)}
                                className={`sel-card soft-card p-4 flex items-center gap-4 text-left ${state.software === s.id ? 'selected' : ''}`}
                              >
                                <span className="tick"><Check className="w-3 h-3 stroke-[3]" /></span>
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                  <Icon className="ic w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-display font-semibold text-sm text-white">{s.name}</span>
                                    <span className="text-[9px] font-mono bg-white/10 text-white/80 px-1.5 py-0.5 rounded">Standalone</span>
                                  </div>
                                  <span className="text-[11px] text-[#8f8f8f] block mt-0.5 leading-snug">{s.desc}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-3 p-3 bg-amber-500/[0.05] border border-amber-500/20 rounded-lg flex items-start gap-2.5">
                          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                            Standalone runtime selected: Minecraft game features are disabled. You can upload code files (such as <span className="text-white font-bold">index.js</span> or <span className="text-white font-bold">main.py</span>) via File Manager and start them in the Console.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm text-[#8f8f8f] mb-2.5">
                          <GitBranch className="w-4 h-4" /> Runtime Version
                        </label>
                        <CustomDropdown
                          value={state.version}
                          options={versions.map(v => ({ v, label: v }))}
                          onChange={(v: string) => updateState('version', v)}
                          placeholder="Select a version..."
                          renderValue={(o: any) => (
                            <>
                              <GitBranch className="w-4 h-4 text-white shrink-0" />
                              <span className="font-mono text-white text-sm">{o.label}</span>
                            </>
                          )}
                          renderOption={(o: any, sel: boolean) => (
                            <button type="button" className={`w-full flex items-center justify-between px-3 py-2.5 font-mono text-sm transition-colors ${sel ? 'text-white bg-white/5' : 'text-[#8f8f8f] hover:bg-white/5'}`}>
                              <span>{o.label}</span>
                              {sel && <Check className="w-4 h-4 text-white" />}
                            </button>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: REVIEW */}
              {currentStep === 4 && (
                <div className="step-content">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="font-mono text-xs text-[#4c4c4c]">05</span>
                    <h2 className="font-display font-bold tracking-wide text-sm">FINAL SPECIFICATION</h2>
                    <span className="flex-1 h-px bg-[#232323]"></span>
                  </div>
                  
                  {!deployed && deployProgress === 0 && (
                    <>
                      <div className="font-mono text-[13px] divide-y divide-[#232323] border border-[#232323] bg-[#0e0e0e]">
                        {renderReviewRow('INSTANCE', state.name || '—')}
                        {isDev && renderReviewRow('RUNTIME', state.runtimeType === 'local' ? 'Local Process (Beta)' : 'Docker')}
                        {renderReviewRow('DESCRIPTION', state.desc || '—')}
                        {renderReviewRow('PORT', String(state.port))}
                        {renderReviewRow('RAM', state.ram + ' GB')}
                        {renderReviewRow('CPU ' + (state.auto ? '(AUTO)' : '(MANUAL)'), state.cpu + ' %')}
                        {renderReviewRow('DISK', state.disk + ' GB')}
                        {renderReviewRow('IP ALIAS', state.ip || '—')}
                        {(user?.role === "admin" || user?.role === "owner") && renderReviewRow('OWNER ID', state.owner || '—')}
                        {(user?.role === "admin" || user?.role === "owner") && renderReviewRow('NODE ID', state.node || '—')}
                        {renderReviewRow('WORKLOAD TYPE', softwareCategory === 'minecraft' ? 'Minecraft Game Server' : 'Application & Script Runtime')}
                        {renderReviewRow('SOFTWARE', SOFTWARE.find(s => s.id === state.software)?.name || 'Unknown')}
                        {renderReviewRow('VERSION', state.version || 'latest')}
                        
                        <div className="px-4 py-4">
                          <div className="flex justify-between text-[10px] text-[#4c4c4c] tracking-widest mb-2 font-mono">
                            <span>EST. HOST FOOTPRINT</span>
                            <span>{Math.min(100, Math.round(state.ram / 32 * 100))}%</span>
                          </div>
                          <div className="w-full bg-[#232323] h-1.5 overflow-hidden">
                            <div className="h-full bg-white transition-all duration-500" style={{ width: `${Math.min(100, Math.round(state.ram / 32 * 100))}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {deployProgress > 0 && !deployed && (
                    <div className="mt-6 border border-[#232323] bg-[#0e0e0e] p-4">
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-sm font-mono text-[#8f8f8f] flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          {deployStage || "Provisioning container..."}
                        </span>
                        <span className="text-sm font-mono text-white">{Math.round(deployProgress)}%</span>
                      </div>
                      <div className="w-full bg-[#232323] h-1.5 overflow-hidden">
                        <div className="h-full bg-white transition-all duration-300" style={{ width: `${deployProgress}%` }}></div>
                      </div>
                    </div>
                  )}

                  {deployed && (
                    <div className="mt-6 border border-white bg-white/5 p-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 bg-white text-black flex items-center justify-center">
                        <Check className="w-6 h-6 stroke-[3]" />
                      </div>
                      <p className="font-display font-bold text-lg">Instance Deployed</p>
                      <p className="text-[#8f8f8f] text-sm mt-1 font-mono">
                        {state.name} → {state.ram}GB
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* NAV */}
            <div className="flex items-center justify-between gap-3 mt-9 pt-7 border-t border-[#232323]">
              <button 
                type="button" 
                onClick={() => { if (currentStep > 0) showStep(currentStep - 1); }}
                disabled={currentStep === 0 || deployed || deployProgress > 0}
                className="btn-ghost px-5 py-3 text-sm font-medium flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> BACK
              </button>
              
              <span className="font-mono text-[11px] tracking-widest text-[#4c4c4c] hidden sm:block">
                STEP {currentStep + 1} / {STEPS.length}
              </span>
              
              <button 
                type="button" 
                onClick={handleNext}
                disabled={deployed || deployProgress > 0 || isCheckingPort}
                className="btn-white px-7 py-3 text-sm font-display font-bold tracking-widest flex items-center gap-2"
              >
                <span>{isCheckingPort ? 'CHECKING...' : currentStep === STEPS.length - 1 ? (deployed ? 'DEPLOYED' : 'LAUNCH') : 'NEXT'}</span>
                {isCheckingPort ? null : currentStep === STEPS.length - 1 ? <Rocket className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4 rotate-180" />}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
