import { Link, useLocation } from "react-router-dom";
import { Activity, Box, ChevronRight, Database, Key, LayoutDashboard, LogOut, Menu, Plus, Server, Settings, User, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { motion } from "framer-motion";

type SidebarLink = { name: string; group: string; path: string; icon: React.ReactNode };

export function Sidebar({ onClose, isCollapsed, toggleCollapse }: { onClose?: () => void; isCollapsed?: boolean; toggleCollapse?: () => void }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { panelName, panelLogo } = useSettings();
  const links: SidebarLink[] = [
    { name: "Overview", group: "Control", path: "/", icon: <LayoutDashboard size={18} /> },
    { name: "Servers", group: "Control", path: "/servers", icon: <Server size={18} /> },
    { name: "Nodes", group: "Infrastructure", path: "/nodes", icon: <Activity size={18} /> },
  ];
  if (user?.role === "admin" || user?.role === "owner") {
    links.push(
      { name: "Deploy Server", group: "Infrastructure", path: "/servers/create", icon: <Plus size={18} /> },
      { name: "Fleet", group: "Administration", path: "/admin/servers", icon: <Box size={18} /> },
      { name: "Database", group: "Administration", path: "/database", icon: <Database size={18} /> },
      { name: "API Keys", group: "Administration", path: "/api-keys", icon: <Key size={18} /> },
      { name: "Panel Settings", group: "Administration", path: "/admin/settings", icon: <Settings size={18} /> },
    );
  }
  links.push({ name: "Account", group: "Account", path: "/account", icon: <User size={18} /> });
  const groups = Array.from(new Set(links.map((link) => link.group)));

  return (
    <aside className={`hyper-sidebar h-full flex flex-col text-white font-body transition-all duration-300 ${isCollapsed ? "w-20" : "w-64"}`}>
      <div className="h-[78px] px-5 flex items-center border-b border-white/[0.08] flex-shrink-0 relative">
        {!isCollapsed && <Link to="/" className="flex items-center gap-3 min-w-0">
          {panelLogo ? <img src={panelLogo} alt="Panel logo" className="h-8 w-8 object-contain rounded-lg" /> : <div className="hyper-mark"><span /></div>}
          <div className="min-w-0"><p className="font-display text-sm font-bold tracking-[0.18em] truncate">{panelName || "HYPER"}</p><p className="text-[9px] text-cyan-300/60 font-mono tracking-[0.22em] uppercase">Game Panel</p></div>
        </Link>}
        {onClose && <button onClick={onClose} className="md:hidden absolute top-5 right-4 p-2 text-white/45 hover:text-white rounded-lg"><X size={20} /></button>}
        <button onClick={toggleCollapse} className="p-2 text-white/45 hover:text-cyan-300 hover:bg-white/[0.06] rounded-lg transition-colors hidden md:flex ml-auto" title="Toggle sidebar"><Menu size={20} /></button>
      </div>
      <nav className="flex-1 w-full px-3 py-5 space-y-5 overflow-y-auto custom-scrollbar">
        {groups.map((group) => <div key={group}>
          {!isCollapsed && <p className="px-3 mb-2 text-[9px] font-mono font-semibold text-white/35 tracking-[0.2em] uppercase">{group}</p>}
          <div className="space-y-1">
            {links.filter((link) => link.group === group).map((link) => {
              const isActive = location.pathname === link.path || (link.path !== "/" && location.pathname.startsWith(link.path));
              return <Link key={link.path} to={link.path} onClick={onClose} title={isCollapsed ? link.name : undefined} className={`hyper-nav-item relative flex items-center ${isCollapsed ? "justify-center" : "px-3"} py-2.5 rounded-lg transition-colors group overflow-hidden`}>
                {isActive && <motion.div layoutId="activeTabSidebar" className="absolute inset-0 hyper-nav-active" initial={false} transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
                {isActive && !isCollapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-cyan-300 rounded-full" />}
                <div className={`relative z-10 transition-colors ${isActive ? "text-cyan-200" : "text-white/45 group-hover:text-white"}`}>{link.icon}</div>
                {!isCollapsed && <><span className={`ml-3 flex-1 relative z-10 font-mono text-[11px] tracking-wide ${isActive ? "text-white font-semibold" : "text-white/55 group-hover:text-white"}`}>{link.name}</span><ChevronRight size={13} className={`relative z-10 transition-transform ${isActive ? "text-cyan-300" : "text-white/20 -translate-x-1 group-hover:translate-x-0"}`} /></>}
              </Link>;
            })}
          </div>
        </div>)}
      </nav>
      <div className="w-full p-3 border-t border-white/[0.08] mt-auto bg-black/20">
        {isCollapsed ? <button onClick={logout} title="Logout" className="flex items-center justify-center w-full p-2 text-white/45 hover:text-white"><LogOut size={20} /></button> : <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-3 overflow-hidden"><div className="w-9 h-9 bg-cyan-300/15 border border-cyan-300/25 text-cyan-100 flex items-center justify-center font-display font-bold text-sm flex-shrink-0 rounded-lg">{user?.username?.[0]?.toUpperCase() || "U"}</div><div className="truncate"><p className="font-mono text-xs font-semibold text-white truncate uppercase">{user?.username}</p><p className="font-mono text-[10px] text-white/35 tracking-widest capitalize truncate">{user?.role || "Admin"}</p></div></div>
          <button onClick={logout} className="p-2 text-white/35 hover:text-white"><LogOut size={16} /></button>
        </div>}
      </div>
    </aside>
  );
}
