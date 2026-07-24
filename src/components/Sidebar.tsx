import { Link, useLocation } from "react-router-dom";
import { Server, LayoutDashboard, Plus, LogOut, X, Settings, Globe, Key } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { motion } from "framer-motion";

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { panelName, panelLogo } = useSettings();
  
  const links = [
    { name: "Dashboard", path: "/", icon: <LayoutDashboard size={18} /> },
    { name: "Servers", path: "/servers", icon: <Server size={18} /> },
  ];

  if (user?.role === "admin") {
    links.push({ name: "Create Server", path: "/servers/create", icon: <Plus size={18} /> });
    links.push({ name: "Manage Servers", path: "/admin/servers", icon: <Server size={18} /> });
    links.push({ name: "API Keys", path: "/api-keys", icon: <Key size={18} /> });
  }

  links.push({ name: "Settings", path: "/settings", icon: <Settings size={18} /> });

  return (
    <div className="w-64 h-full bg-black/40 backdrop-blur-2xl flex flex-col py-6 border-r border-white/10 relative shadow-[20px_0_40px_-20px_rgba(0,0,0,0.5)] z-20">
      {onClose && (
        <button onClick={onClose} className="md:hidden flex items-center justify-center absolute top-5 right-4 p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
          <X size={20} />
        </button>
      )}
      
      <div className="px-6 mb-10 mt-2 flex items-center gap-3">
        {panelLogo ? (
          <img src={panelLogo} alt="Logo" className="w-8 h-8 rounded-lg object-cover shadow-[0_0_15px_rgba(255,255,255,0.1)] flex-shrink-0" />
        ) : (
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_15px_rgba(99,102,241,0.5)] flex-shrink-0">
            <Server className="w-4 h-4 text-white" />
          </div>
        )}
        <h1 className="text-xl font-bold text-white tracking-tight truncate">
          {panelName}
        </h1>
      </div>

      <nav className="flex-1 w-full px-3 space-y-1">
        {links.map(link => {
          const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
          return (
            <Link 
              key={link.path} 
              to={link.path} 
              onClick={onClose}
              className="relative flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl transition-all group overflow-hidden"
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTab" 
                  className="absolute inset-0 bg-white/20 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.05)]" 
                  initial={false} 
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                {link.icon}
              </div>
              <span className={`relative z-10 font-medium text-sm transition-colors duration-200 ${isActive ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                {link.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="w-full px-4 mt-auto space-y-3">
        <div className="bg-black/60 rounded-xl p-3 flex items-center gap-3 border border-white/10 hover:border-indigo-500/30 transition-all cursor-default shadow-inner relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 border border-white/20 flex items-center justify-center font-black text-sm text-white shadow-[0_0_10px_rgba(99,102,241,0.5)] relative z-10">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="overflow-hidden flex-1 relative z-10">
            <p className="font-bold text-white truncate text-sm tracking-tight drop-shadow-sm">{user?.username}</p>
            <p className="text-[10px] text-indigo-400/80 capitalize truncate font-bold uppercase tracking-widest">{user?.role || "Admin"}</p>
          </div>
        </div>
        <button onClick={logout} className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-all group">
          <LogOut size={18} className="group-hover:scale-110 transition-transform" />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
}
