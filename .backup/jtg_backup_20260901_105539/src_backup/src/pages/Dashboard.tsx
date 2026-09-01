import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, MapPin, ArrowUpRight, Shield, ChevronDown, ArrowRight, Server, Radio } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';



const feedA = [
    ['https://w.wallhaven.cc/full/1q/wallhaven-1qgvrg.jpg','MC_01','MINECRAFT // OVERWORLD'],
    ['https://w.wallhaven.cc/full/w5/wallhaven-w5dwyx.png','MC_02','MINECRAFT // SURVIVAL'],
    ['https://w.wallhaven.cc/full/7j/wallhaven-7jeldy.png','MC_03','MINECRAFT // CREATIVE'],
    ['https://w.wallhaven.cc/full/gw/wallhaven-gwmwr3.png','MC_04','MINECRAFT // CAVES'],
];

const feedB = [
    ['https://w.wallhaven.cc/full/og/wallhaven-og6gz9.png','MC_05','MINECRAFT // LANDSCAPE'],
    ['https://w.wallhaven.cc/full/ly/wallhaven-lyjyll.png','MC_06','MINECRAFT // SHADERS'],
    ['https://w.wallhaven.cc/full/je/wallhaven-jeye2m.png','MC_07','MINECRAFT // EXPLORE'],
    ['https://w.wallhaven.cc/full/7j/wallhaven-7je6jo.png','MC_08','MINECRAFT // MULTIPLAYER'],
];

const tickerItems = [
    { label: 'UPTIME 99.98%', color: 'text-theme-500', dot: 'bg-theme-500 shadow-[0_0_6px_var(--color-theme-500)]' },
    { label: 'NODES 3/3 ACTIVE', color: 'text-zinc-100', dot: 'bg-zinc-100 shadow-[0_0_6px_#d4d4d8]' },
    { label: 'LATENCY 11MS', color: 'text-theme-500', dot: 'bg-theme-500 shadow-[0_0_6px_var(--color-theme-500)]' },
    { label: 'PACKETS 4.2M/S', color: 'text-zinc-200', dot: 'bg-zinc-200 shadow-[0_0_6px_#d4d4d8]' },
    { label: 'DDOS SHIELD ARMED', color: 'text-theme-700', dot: 'bg-theme-700 shadow-[0_0_6px_var(--color-theme-800)]' },
    { label: 'BACKUP SYNCED 04:00 UTC', color: 'text-zinc-300', dot: 'bg-zinc-300 shadow-[0_0_6px_#d4d4d8]' },
    { label: 'US-EAST NOMINAL', color: 'text-theme-500', dot: 'bg-theme-500 shadow-[0_0_6px_var(--color-theme-500)]' },
    { label: 'EU-WEST NOMINAL', color: 'text-theme-500', dot: 'bg-theme-500 shadow-[0_0_6px_var(--color-theme-500)]' },
    { label: 'AP-SOUTH DEGRADED', color: 'text-theme-500', dot: 'bg-theme-500 shadow-[0_0_6px_var(--color-theme-400)]' },
    { label: 'FIRMWARE STABLE', color: 'text-zinc-400', dot: 'bg-zinc-400 shadow-[0_0_6px_var(--color-theme-500)]' }
];

const sparkColors = ['var(--color-theme-600)', 'var(--color-theme-500)', 'var(--color-theme-500)', 'var(--color-theme-700)', '#d4d4d8'];

const rand = (a: number, b: number) => Math.floor(a + Math.random()*(b-a));

function spark(seed: number, strokeColor = "var(--color-theme-500)") {
    let pts=[], v=18+(seed%5)*3;
    for(let i=0;i<24;i++){
        v = Math.max(4, Math.min(32, v + (Math.random()-0.48)*9));
        pts.push(`${(i*(120/23)).toFixed(1)},${(36-v).toFixed(1)}`);
    }
    const fillPts = `0,35 ${pts.join(' ')} 120,35`;
    const gradId = `spark-grad-${seed}`;
    return (
        <svg viewBox="0 0 120 36" className="w-full h-9 overflow-visible" preserveAspectRatio="none">
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                </linearGradient>
            </defs>
            <polygon points={fillPts} fill={`url(#${gradId})`} />
            <line x1="0" y1="35" x2="120" y2="35" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            <polyline points={pts.join(' ')} fill="none" stroke={strokeColor} strokeWidth="1.75" className="spark"/>
        </svg>
    );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { servers: rawServers } = useDashboardData();
  const realServers = Array.isArray(rawServers) ? rawServers : [];
  const { panelName } = useSettings();
  const pName = panelName || 'JTG PANEL';
  const nameParts = pName.split(' ');
  const firstWord = nameParts[0].toUpperCase();
  const restWords = nameParts.slice(1).join(' ').toUpperCase() || 'PANEL';




  useEffect(() => {



    return () => {
    };
  }, []);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('active');
                io.unobserve(e.target);
            }
        });
    }, { root: mainEl, threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [realServers]);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;
    const handleScroll = () => {
        const p = mainEl.scrollTop / (mainEl.scrollHeight - mainEl.clientHeight);
        const el = document.getElementById('scroll-progress');
        if (el) el.style.transform = `scaleX(${Math.min(p, 1)})`;
    };
    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, []);

  // Format real servers
  const mappedServers = useMemo(() => realServers.map((s, i) => {
    return {
        rank: String(i + 1).padStart(2, '0'),
        rawId: s.id,
        name: s.name,
        id: s.id.substring(0, 8).toUpperCase(),
        region: 'LOCAL',
        load: Math.round(s.cpu || rand(10, 80)),
        mem: Math.round(s.memory || rand(20, 90)),
        uptime: '99.99',
        status: (s.status || 'OFFLINE').toUpperCase(),
        owner: s.owner
    };
  }), [realServers]);

  // Top servers: User's own servers
  const myServers = useMemo(() => {
    if (!user) return mappedServers;
    return mappedServers.filter(s => {
      if (!s.owner) return true;
      return s.owner === user.id || s.owner === user.username || s.owner === user.email;
    });
  }, [mappedServers, user]);

  // Operator servers: Servers belonging to other operators/users or shared
  const operatorServers = useMemo(() => {
    if (!user) return [];
    return mappedServers.filter(s => {
      return s.owner && s.owner !== user.id && s.owner !== user.username && s.owner !== user.email;
    });
  }, [mappedServers, user]);

  const uniqueOwners = useMemo(() => {
    const map = new Map<string, {init:string, name:string, role:string, clr:string, ping:string, on:boolean, serverCount:number, primaryServerId?:string}>();
    realServers.forEach(s => {
      const owner = s.owner || 'ADMIN';
      if (!map.has(owner)) {
        map.set(owner, {
          init: owner.substring(0, 2).toUpperCase(),
          name: owner.toUpperCase(),
          role: 'SERVER OPERATOR',
          clr: 'L2',
          ping: 'NOW',
          on: s.status === 'online',
          serverCount: 1,
          primaryServerId: s.id
        });
      } else {
        const item = map.get(owner)!;
        item.serverCount += 1;
        if (s.status === 'online') {
            item.on = true;
        }
      }
    });
    return Array.from(map.values());
  }, [realServers]);

  return (
    <div className="text-white font-body min-h-full relative selection:bg-theme-600 selection:text-white">
      <style dangerouslySetInnerHTML={{__html: `
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:#09090b; }
        ::-webkit-scrollbar-thumb { background:#27272a; border-radius:3px; }
        ::-webkit-scrollbar-thumb:hover { background:#d4d4d8; }

        .bg-grid {
            position:absolute; inset:0; z-index:0; pointer-events:none;
            background-image:
                linear-gradient(rgba(var(--theme-rgb-600),.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(var(--theme-rgb-600),.04) 1px, transparent 1px);
            background-size:56px 56px;
            -webkit-mask-image:radial-gradient(ellipse 95% 75% at 50% 0%, #000 35%, transparent 85%);
                    mask-image:radial-gradient(ellipse 95% 75% at 50% 0%, #000 35%, transparent 85%);
        }
        .scanline {
            position:absolute; left:0; right:0; height:140px; top:-140px; z-index:1; pointer-events:none;
            background:linear-gradient(to bottom, transparent, rgba(var(--theme-rgb-600),.04), transparent);
            animation:scan 9s linear infinite;
        }
        @keyframes scan { to { top:100vh; } }
        .noise {
            position:absolute; inset:0; z-index:60; pointer-events:none; opacity:.025;
            background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        #scroll-progress {
            position:fixed; top:0; left:0; height:3px; width:100%; z-index:100;
            background:linear-gradient(90deg, var(--color-theme-800), var(--color-theme-500), var(--color-theme-600));
            transform-origin:left; transform:scaleX(0);
            box-shadow:0 0 14px rgba(var(--theme-rgb-600),.8);
        }
        .outline-text { -webkit-text-stroke:1.5px #d4d4d8; color:transparent; }
        .outline-num  { -webkit-text-stroke:1px rgba(var(--theme-rgb-600),0.6); color:transparent; transition:all .3s; }
        .group:hover .outline-num { -webkit-text-stroke-color:#d4d4d8; filter:drop-shadow(0 0 8px rgba(var(--theme-rgb-600),0.5)); }
        .outline-faint { -webkit-text-stroke:1px rgba(255,255,255,0.08); color:transparent; }
        
        .reveal { opacity:0; transform:translateY(36px); transition:opacity .9s cubic-bezier(.16,1,.3,1), transform .9s cubic-bezier(.16,1,.3,1); }
        .reveal.active { opacity:1; transform:translateY(0); }
        
        .ticker-track, .marquee { display:flex; width:max-content; }
        .ticker-track { animation:mq 32s linear infinite; }
        .marquee      { gap:24px; animation:mq 48s linear infinite; }
        .marquee.rev  { animation-direction:reverse; animation-duration:58s; }
        .ticker-track:hover, .marquee:hover { animation-play-state:paused; }
        @keyframes mq { to { transform:translateX(-50%); } }

        .cursor-blink { animation:blink 1s steps(1) infinite; }
        @keyframes blink { 50% { opacity:0; } }

        .pulse-dot { animation:pd 2.4s infinite; }
        @keyframes pd {
            0%,100% { box-shadow:0 0 0 0 rgba(var(--theme-rgb-500),.5); }
            50%     { box-shadow:0 0 0 8px rgba(var(--theme-rgb-500),0); }
        }

        .spark { stroke-dasharray:280; stroke-dashoffset:280; }
        .active .spark { animation:draw 1.8s cubic-bezier(.16,1,.3,1) .35s forwards; }
        @keyframes draw { to { stroke-dashoffset:0; } }

        .loadbar { width:0; transition:width 1.4s cubic-bezier(.16,1,.3,1) .45s; }
        .active .loadbar { width:var(--w); }

        .tbar { transition:width 1.6s cubic-bezier(.16,1,.3,1); }

        .btn-sweep { position:relative; overflow:hidden; }
        .btn-sweep::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg, var(--color-theme-600), var(--color-theme-800)); transform:translateY(101%); transition:transform .35s cubic-bezier(.16,1,.3,1); }
        .btn-sweep:hover::before { transform:translateY(0); }
        .btn-sweep :is(span, svg) { position:relative; z-index:1; transition:color .35s; }

        .bw-img { filter:grayscale(0.6) contrast(1.1) brightness(.85); transition:filter .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1); }
        .group:hover .bw-img { filter:grayscale(0) contrast(1) brightness(1.05); transform:scale(1.05); }

        .corner { position:absolute; width:12px; height:12px; }
        .c-tl { top:-1px; left:-1px; border-top:2px solid #d4d4d8; border-left:2px solid #d4d4d8; }
        .c-tr { top:-1px; right:-1px; border-top:2px solid #d4d4d8; border-right:2px solid #d4d4d8; }
        .c-bl { bottom:-1px; left:-1px; border-bottom:2px solid #d4d4d8; border-left:2px solid #d4d4d8; }
        .c-br { bottom:-1px; right:-1px; border-bottom:2px solid #d4d4d8; border-right:2px solid #d4d4d8; }
      `}} />

      <div className="noise" />
      <div className="bg-grid" />
      <div className="scanline" />
      <div id="scroll-progress" />

      <div className="relative z-10">
        
        {/* TICKER */}
        <div className="border-b border-theme-600/20 bg-zinc-950/70 backdrop-blur-md overflow-hidden flex">
            <div className="ticker-track">
                {[...tickerItems, ...tickerItems].map((x, i) => (
                    <span key={i} className="flex items-center gap-2.5 px-5 py-2.5 font-mono text-[11px] tracking-widest whitespace-nowrap border-r border-theme-600/10">
                        <span className={`w-1.5 h-1.5 rounded-full ${x.dot}`}></span> 
                        <span className={`font-semibold ${x.color}`}>{x.label}</span>
                    </span>
                ))}
            </div>
        </div>

        {/* HEADER */}
        <header className="max-w-7xl mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-8">
            <div className="grid lg:grid-cols-12 gap-12 items-start">

                <div className="lg:col-span-12 reveal active max-w-4xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-theme-600/10 border border-theme-600/30 text-theme-500 font-mono text-xs tracking-wider mb-6 shadow-[0_0_15px_rgba(var(--theme-rgb-600),0.2)]">
                        <Terminal className="w-3.5 h-3.5 text-zinc-100" />
                        <span>SYSTEM.CORE — <span className="text-theme-500 font-bold">ACCESS GRANTED</span></span>
                    </div>

                    <h1 className="font-display font-bold leading-[0.85] tracking-tight text-[clamp(4.5rem,11vw,8.5rem)] uppercase">
                        <span className="block bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">{firstWord}</span>
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-theme-500 via-zinc-100 to-theme-500 drop-shadow-[0_0_35px_rgba(var(--theme-rgb-600),0.25)]">{restWords}</span>
                    </h1>

                    <p className="mt-8 text-zinc-300 font-light text-base md:text-lg max-w-xl leading-relaxed mb-10">
                        Unified command surface for your global node network.
                        Telemetry, operators and visual feed — enhanced with live cloud intelligence.
                    </p>
                </div>
            </div>
        </header>

        {/* 01 TOP SERVERS */}
        <section id="servers" className="border-t border-theme-600/20 py-20 bg-zinc-950/40">
            <div className="max-w-7xl mx-auto px-5 md:px-8">
                <div className="flex items-end justify-between mb-6 reveal">
                    <div className="flex items-center gap-4">
                        <span className="font-mono text-sm text-theme-500 bg-theme-600/10 px-2.5 py-1 rounded-md border border-theme-600/30 font-bold">01</span>
                        <h2 className="font-display font-bold tracking-tight text-3xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-theme-200 flex items-center gap-3">
                            <Server className="w-8 h-8 text-theme-500" /> MY SERVERS
                        </h2>
                    </div>
                    <span className="hidden md:flex items-center gap-2 font-mono text-[11px] text-theme-500 font-semibold tracking-widest border border-theme-600/30 bg-theme-600/10 px-3 py-1.5 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                        <span className="w-2 h-2 bg-theme-500 rounded-full pulse-dot"></span> RANKED BY LOAD
                    </span>
                </div>
                <div className="h-px bg-gradient-to-r from-theme-600/40 via-zinc-500/40 to-transparent mb-4"></div>

                <div className="space-y-3">
                    {myServers.length > 0 ? myServers.map((s, i) => {
                        const ok = s.status === 'online' || s.status === 'ONLINE';
                        const sparkClr = sparkColors[i % sparkColors.length];
                        return (
                            <article 
                                key={i} 
                                onClick={() => navigate(`/servers/${s.rawId}`)}
                                className={`reveal group grid grid-cols-12 items-center gap-x-4 gap-y-4 rounded-xl p-5 cursor-pointer transition-all duration-300 border qx-glass ${
                                    ok 
                                    ? 'hover:bg-zinc-900/70 border-theme-600/30 hover:border-theme-500/60 shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:shadow-[0_0_30px_rgba(16,185,129,0.25)]' 
                                    : 'hover:bg-zinc-900/50 border-theme-600/20 hover:border-theme-600/40'
                                }`} 
                                style={{transitionDelay: `${i*100}ms`}}
                            >
                                <div className="col-span-2 md:col-span-1 font-display font-bold text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-br from-theme-500 via-zinc-300 to-zinc-400 group-hover:from-zinc-300 group-hover:to-theme-500 leading-none">
                                    {s.rank}
                                </div>
                                <div className="col-span-10 md:col-span-4">
                                    <h3 className="font-display font-bold text-xl md:text-2xl tracking-tight text-white group-hover:text-zinc-300 group-hover:translate-x-1.5 transition-all duration-300 flex items-center gap-2">
                                        {s.name}
                                    </h3>
                                    <p className="font-mono text-[11px] text-zinc-100/70 tracking-wider mt-1.5 flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 text-zinc-100" />
                                        <span>{s.id}</span>
                                        <span className="text-zinc-500">//</span>
                                        <span className="bg-theme-600/10 text-theme-300 px-2 py-0.5 rounded border border-theme-600/20">{s.region}</span>
                                    </p>
                                </div>
                                <div className="col-span-6 md:col-span-3">
                                    {spark(i*7+3, sparkClr)}
                                </div>
                                <div className="col-span-6 md:col-span-2">
                                    <div className="flex justify-between font-mono text-[10px] tracking-widest mb-1.5">
                                        <span className="text-zinc-400">LOAD</span>
                                        <span className={s.load > 70 ? 'text-theme-400 font-bold' : s.load > 40 ? 'text-theme-500 font-bold' : 'text-zinc-100 font-bold'}>
                                            {s.load}%
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`loadbar h-full rounded-full ${
                                                s.load > 70 
                                                ? 'bg-gradient-to-r from-theme-600 to-theme-400' 
                                                : s.load > 40 
                                                ? 'bg-gradient-to-r from-theme-600 to-theme-400' 
                                                : 'bg-gradient-to-r from-theme-600 to-zinc-100'
                                            }`} 
                                            style={{ '--w': `${s.load}%` } as React.CSSProperties}
                                        ></div>
                                    </div>
                                </div>
                                <div className="col-span-12 md:col-span-2 flex items-center md:justify-end gap-4">
                                    <div className="text-left md:text-right">
                                        <p className="font-mono text-[10px] text-zinc-400 tracking-widest">UPTIME {s.uptime}%</p>
                                        <p className={`flex items-center gap-2 font-mono text-[11px] font-bold tracking-widest mt-1 ${ok ? 'text-theme-500' : 'text-theme-400'}`}>
                                            <span className={`w-2 h-2 ${ok ? 'bg-theme-500 pulse-dot shadow-[0_0_8px_var(--color-theme-500)]' : 'bg-theme-600'} rounded-full`}></span>
                                            {s.status}
                                        </p>
                                    </div>
                                    <div className="w-8 h-8 rounded-lg bg-theme-600/10 border border-theme-600/20 flex items-center justify-center group-hover:bg-zinc-500/20 group-hover:border-zinc-100/40 transition-colors">
                                        <ArrowUpRight className="w-4 h-4 text-zinc-100 group-hover:text-theme-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
                                    </div>
                                </div>
                            </article>
                        );
                    }) : (
                        <div className="py-12 text-center border border-dashed border-theme-600/20 rounded-xl qx-glass">
                            <p className="font-mono text-theme-300 tracking-widest">NO SERVERS CREATED YET</p>
                        </div>
                    )}
                </div>
            </div>
        </section>

        {/* 02 OPERATORS / OTHER SERVERS */}
        {(user?.role === 'admin' || user?.role === 'owner') && (
        <section id="users" className="border-t border-theme-800/20 py-20 bg-zinc-950/60">
            <div className="max-w-7xl mx-auto px-5 md:px-8">
                <div className="flex items-center justify-between mb-6 reveal">
                    <div className="flex items-center gap-4">
                        <span className="font-mono text-sm text-theme-700 bg-theme-800/10 px-2.5 py-1 rounded-md border border-theme-800/30 font-bold">02</span>
                        <h2 className="font-display font-bold tracking-tight text-3xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-white via-theme-100 to-theme-300 flex items-center gap-3">
                            <Shield className="w-8 h-8 text-theme-700" /> OTHER SERVERS
                        </h2>
                    </div>
                    <span className="hidden md:flex items-center gap-2 font-mono text-[11px] text-theme-600 font-semibold tracking-widest border border-theme-800/30 bg-theme-800/10 px-3 py-1.5 rounded-full">
                        CLEARED OPERATOR FLEET
                    </span>
                </div>
                <div className="h-px bg-gradient-to-r from-theme-800/40 via-theme-600/40 to-transparent mb-4"></div>

                <div className="space-y-3">
                    {operatorServers.length > 0 ? (
                        operatorServers.map((s, i) => {
                            const ok = s.status === 'online' || s.status === 'ONLINE';
                            return (
                                <article 
                                    key={i} 
                                    onClick={() => navigate(`/servers/${s.rawId}`)}
                                    className={`reveal group grid grid-cols-12 items-center gap-x-4 gap-y-4 rounded-xl p-5 cursor-pointer transition-all duration-300 border qx-glass ${
                                        ok 
                                        ? 'hover:bg-zinc-900/70 border-theme-800/30 hover:border-theme-700/60 shadow-[0_0_20px_rgba(168,85,247,0.1)]' 
                                        : 'hover:bg-zinc-900/50 border-theme-800/10'
                                    }`} 
                                    style={{transitionDelay:`${i*90}ms`}}
                                >
                                    <div className="col-span-2 md:col-span-1 font-display font-bold text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-br from-theme-700 to-theme-300 group-hover:from-zinc-300 group-hover:to-theme-600 leading-none">
                                        {s.rank}
                                    </div>
                                    <div className="col-span-10 md:col-span-4">
                                        <h3 className="font-display font-bold text-xl tracking-tight text-white group-hover:text-theme-600 group-hover:translate-x-1.5 transition-all duration-300">{s.name}</h3>
                                        <p className="font-mono text-[11px] text-theme-600/70 tracking-wider mt-1 flex items-center gap-2">
                                            <Shield className="w-3.5 h-3.5 text-theme-700" />
                                            <span>OPERATOR: <span className="text-theme-200 font-bold">{s.owner?.toUpperCase() || 'EXTERNAL'}</span></span>
                                            <span className="text-zinc-500">//</span>
                                            <span>{s.id}</span>
                                        </p>
                                    </div>
                                    <div className="col-span-6 md:col-span-3">
                                        {spark(i*5+2, 'var(--color-theme-700)')}
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                        <div className="flex justify-between font-mono text-[10px] tracking-widest mb-1.5">
                                            <span className="text-zinc-400">LOAD</span>
                                            <span className="text-theme-600 font-bold">{s.load}%</span>
                                        </div>
                                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                            <div className="loadbar h-full bg-gradient-to-r from-theme-800 to-theme-500 rounded-full" style={{ '--w': `${s.load}%` } as React.CSSProperties}></div>
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-2 flex items-center md:justify-end gap-4">
                                        <div className="text-left md:text-right">
                                            <p className="font-mono text-[10px] text-zinc-400 tracking-widest">UPTIME {s.uptime}%</p>
                                            <p className={`flex items-center gap-2 font-mono text-[11px] font-bold tracking-widest mt-1 ${ok ? 'text-theme-500' : 'text-zinc-400'}`}>
                                                <span className={`w-2 h-2 ${ok ? 'bg-theme-500 pulse-dot' : 'bg-zinc-600'} rounded-full`}></span>
                                                {s.status}
                                            </p>
                                        </div>
                                        <div className="w-8 h-8 rounded-lg bg-theme-800/10 border border-theme-800/20 flex items-center justify-center group-hover:bg-theme-800/20 group-hover:border-theme-700/40 transition-colors">
                                            <ArrowUpRight className="w-4 h-4 text-theme-600 group-hover:text-white transition-all duration-300" />
                                        </div>
                                    </div>
                                </article>
                            );
                        })
                    ) : uniqueOwners.length > 0 ? (
                        uniqueOwners.map((u, i) => (
                            <div 
                                key={i} 
                                onClick={() => u.primaryServerId && navigate(`/servers/${u.primaryServerId}`)}
                                className={`reveal group grid grid-cols-12 items-center gap-x-4 gap-y-3 rounded-xl p-4 border border-theme-800/20 qx-glass hover:bg-zinc-900/70 ${u.primaryServerId ? 'hover:border-theme-700/50 cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.15)]' : ''} transition-all duration-300`} 
                                style={{transitionDelay:`${i*90}ms`}}
                            >
                                <div className="col-span-2 md:col-span-1 flex md:justify-center">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-theme-800/20 to-theme-600/20 border border-theme-800/40 text-theme-600 flex items-center justify-center font-display font-bold text-sm shadow-inner group-hover:border-theme-700 transition-colors">
                                        {u.init}
                                    </div>
                                </div>
                                <div className="col-span-7 md:col-span-4">
                                    <p className="font-display font-bold tracking-tight text-lg text-white group-hover:text-theme-600 group-hover:translate-x-1 transition-all">{u.name}</p>
                                    <p className="font-mono text-[10px] text-theme-600/70 tracking-widest mt-0.5">{u.role} • {u.serverCount} SERVER(S)</p>
                                </div>
                                <div className="col-span-3 md:col-span-2 md:text-center">
                                    <span className="inline-block font-mono text-[10px] tracking-widest border border-theme-800/30 bg-theme-800/10 rounded-md px-2.5 py-1 text-theme-600 font-semibold">CLR-{u.clr}</span>
                                </div>
                                <div className="hidden md:block md:col-span-2 text-center font-mono text-[11px] text-zinc-400 tracking-widest">{u.ping}</div>
                                <div className="col-span-12 md:col-span-3 flex items-center justify-end gap-3">
                                    <span className={`flex items-center gap-2 font-mono text-[11px] font-bold tracking-widest ${u.on?'text-theme-500':'text-zinc-400'}`}>
                                        <span className={`w-2 h-2 rounded-full ${u.on?'bg-theme-500 pulse-dot':'bg-zinc-600'}`}></span>
                                        {u.on?'ONLINE':'OFFLINE'}
                                    </span>
                                    {u.primaryServerId && <ArrowUpRight className="w-4 h-4 text-theme-700 group-hover:text-white transition-colors" />}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center border border-dashed border-theme-800/20 rounded-xl qx-glass">
                            <p className="font-mono text-theme-600 tracking-widest">NO EXTERNAL OPERATORS FOUND</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
        )}


        
        {/* 03 VISUAL FEED */}
        <section id="feed" className="border-t border-zinc-500/20 py-20 bg-zinc-950/80 overflow-hidden">
            <div className="max-w-7xl mx-auto px-5 md:px-8 mb-10 reveal active">
                <div className="flex items-center gap-4">
                    <span className="font-mono text-sm text-zinc-100 bg-zinc-500/10 px-2.5 py-1 rounded-md border border-zinc-500/30 font-bold">03</span>
                    <h2 className="font-display font-bold tracking-tight text-3xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-theme-200">
                        VISUAL FEED
                    </h2>
                </div>
                <p className="text-zinc-300/70 font-light mt-3 max-w-md">Physical layer — datacenter & server telemetry imagery streamed live from active availability zones.</p>
            </div>

            <div className="space-y-6">
                <div className="overflow-hidden">
                    <div className="marquee">
                        {[...feedA, ...feedA].map(([img, idx, cap], i) => (
                            <figure key={i} className="group relative flex-shrink-0 w-[78vw] md:w-[500px] aspect-[16/10] overflow-hidden rounded-2xl border border-zinc-500/20 qx-glass shadow-xl hover:border-zinc-100/60 transition-all duration-300">
                                <img src={img} alt={cap} loading="lazy"
                                     className="bw-img absolute inset-0 w-full h-full object-cover" />
                                <span className="absolute top-3 left-3 font-mono text-[10px] tracking-widest text-white bg-gradient-to-r from-theme-700 to-zinc-600 px-2.5 py-1 rounded-md shadow-md z-10 font-bold">{idx}</span>
                                <figcaption className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                                    <p className="font-mono text-[11px] tracking-widest text-zinc-300 font-bold">{cap}</p>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </div>
                <div className="overflow-hidden">
                    <div className="marquee rev">
                        {[...feedB, ...feedB].map(([img, idx, cap], i) => (
                            <figure key={i} className="group relative flex-shrink-0 w-[78vw] md:w-[500px] aspect-[16/10] overflow-hidden rounded-2xl border border-theme-600/20 qx-glass shadow-xl hover:border-theme-500/60 transition-all duration-300">
                                <img src={img} alt={cap} loading="lazy"
                                     className="bw-img absolute inset-0 w-full h-full object-cover" />
                                <span className="absolute top-3 left-3 font-mono text-[10px] tracking-widest text-white bg-gradient-to-r from-theme-700 to-zinc-600 px-2.5 py-1 rounded-md shadow-md z-10 font-bold">{idx}</span>
                                <figcaption className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                                    <p className="font-mono text-[11px] tracking-widest text-zinc-300 font-bold">{cap}</p>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </div>
            </div>
        </section>
        {/* FOOTER */}

        <footer className="border-t border-theme-600/20 bg-zinc-950">
            <div className="overflow-hidden select-none" aria-hidden="true">
                <p className="outline-faint font-display font-bold text-[19vw] leading-[0.78] text-center -mb-[3.5vw] uppercase text-zinc-800/20">{firstWord}</p>
            </div>
            <div className="border-t border-theme-600/20">
                <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <span className="font-mono text-[10px] text-zinc-400 tracking-[0.25em]">© 2026 {pName.toUpperCase()} — INFRASTRUCTURE COMMAND</span>
                    <div className="flex items-center gap-6 font-mono text-[10px] text-zinc-100/70 tracking-widest">
                        <a href="#feed" className="hover:text-theme-400 transition-colors">FEED</a>
                        <a href="#servers" className="hover:text-zinc-300 transition-colors">SERVERS</a>
                        {(user?.role === 'admin' || user?.role === 'owner') && <a href="#users" className="hover:text-theme-600 transition-colors">OTHER SERVERS</a>}
                        
                    </div>
                </div>
            </div>
        </footer>
      </div>
    </div>
  );
}
