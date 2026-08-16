import { Link, useLocation } from "react-router-dom";
import { Server, LayoutDashboard, Plus, LogOut, X, Settings, Key, User, Activity, Box, Search, Bell, Menu } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";

export function Sidebar({ onClose, isCollapsed, toggleCollapse }: { onClose?: () => void, isCollapsed?: boolean, toggleCollapse?: () => void }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { panelName, panelLogo } = useSettings();
  
  const links = [
    { name: "Overview", path: "/", icon: <LayoutDashboard size={20} /> },
    { name: "Nodes", path: "/nodes", icon: <Activity size={20} /> },
    { name: "Servers", path: "/servers", icon: <Server size={20} /> },
  ];
  
  if (user?.role === "admin" || user?.role === "owner") {
    links.push({ name: "Deploy", path: "/servers/create", icon: <Plus size={20} /> });
    links.push({ name: "Fleet", path: "/admin/servers", icon: <Box size={20} /> });
    links.push({ name: "API Keys", path: "/api-keys", icon: <Key size={20} /> });
    links.push({ name: "Admin Settings", path: "/admin/settings", icon: <Settings size={20} /> });
  }
  links.push({ name: "Account", path: "/account", icon: <User size={20} /> });

  return (
    <div className={`h-full flex flex-col bg-ink backdrop-blur-md text-white font-body border-r border-line transition-all duration-300 z-20 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Header (Toggle only) */}
      <div className={`h-16 flex items-center border-b border-line justify-center flex-shrink-0 relative`}>
        {onClose && (
          <button onClick={onClose} className="md:hidden flex items-center justify-center absolute top-5 right-4 p-2 text-dim hover:text-white hover:bg-line/50 rounded-lg transition-colors">
            <X size={20} />
          </button>
        )}
        <button 
          onClick={toggleCollapse}
          className="p-2 text-dim hover:text-white hover:bg-white/[0.05] rounded transition-colors hidden md:flex"
          title="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 w-full px-3 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        {!isCollapsed && <p className="px-3 mb-4 font-mono text-[10px] text-faint tracking-widest uppercase">Menu</p>}
        {links.map(link => {
          const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
          return (
            <Link 
              key={link.path} 
              to={link.path} 
              onClick={onClose}
              title={isCollapsed ? link.name : undefined}
              className={`relative flex items-center ${isCollapsed ? 'justify-center' : 'px-3'} py-3 rounded transition-colors group overflow-hidden`}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTabSidebar" 
                  className="absolute inset-0 bg-white/[0.05]" 
                  initial={false} 
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {isActive && !isCollapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-white" />
              )}
              <div className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-white' : 'text-dim group-hover:text-white'}`}>
                {link.icon}
              </div>
              {!isCollapsed && (
                <span className={`ml-3 relative z-10 font-mono text-xs tracking-wider transition-colors duration-200 ${isActive ? 'text-white font-semibold' : 'text-dim group-hover:text-white'}`}>
                  {link.name.toUpperCase()}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      

      
      {/* User Profile */}
      <div className="w-full p-4 border-t border-line mt-auto bg-panel">
        {isCollapsed ? (
          <button onClick={logout} title="Logout" className="flex items-center justify-center w-full p-2 text-dim hover:bg-white/[0.05] hover:text-white transition-colors">
            <LogOut size={20} />
          </button>
        ) : (
          <div className="flex items-center justify-between group cursor-pointer hover:bg-white/[0.02] p-2 -mx-2 rounded transition-colors">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 bg-white text-black flex items-center justify-center font-display font-bold text-sm flex-shrink-0">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="truncate">
                <p className="font-mono text-xs font-semibold text-white truncate uppercase">{user?.username}</p>
                <p className="font-mono text-[10px] text-faint tracking-widest capitalize truncate">{user?.role || "Admin"}</p>
              </div>
            </div>
            <button onClick={logout} className="p-2 text-faint hover:text-white transition-colors flex-shrink-0">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
