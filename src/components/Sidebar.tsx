import { Link, useLocation } from "react-router-dom";
import { Server, LayoutDashboard, Plus, LogOut, X, Settings, Key, User, Activity, Box, Search, Bell } from "lucide-react";
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
  
  if (user?.role === "admin") {
    links.push({ name: "Deploy", path: "/servers/create", icon: <Plus size={20} /> });
    links.push({ name: "Fleet", path: "/admin/servers", icon: <Box size={20} /> });
    links.push({ name: "API Keys", path: "/api-keys", icon: <Key size={20} /> });
  }
  links.push({ name: "Settings", path: "/settings", icon: <Settings size={20} /> });

  return (
    <div className={`h-full flex flex-col bg-card/80 backdrop-blur-xl border-r border-border transition-all duration-300 z-20 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Header */}
      <div className={`h-16 flex items-center border-b border-border-subtle ${isCollapsed ? 'justify-center' : 'px-6'} flex-shrink-0 relative`}>
        {onClose && (
          <button onClick={onClose} className="md:hidden flex items-center justify-center absolute top-5 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
            <X size={20} />
          </button>
        )}
        <div className="flex items-center gap-3">
          {panelLogo ? (
            <img src={panelLogo} alt="Logo" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 shadow-sm flex-shrink-0 text-white">
              <Server className="w-4 h-4" />
            </div>
          )}
          {!isCollapsed && (
            <motion.h1 
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="text-lg font-bold text-foreground tracking-tight truncate whitespace-nowrap"
            >
              {panelName}
            </motion.h1>
          )}
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 w-full px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        {!isCollapsed && <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Menu</p>}
        {links.map(link => {
          const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
          return (
            <Link 
              key={link.path} 
              to={link.path} 
              onClick={onClose}
              title={isCollapsed ? link.name : undefined}
              className={`relative flex items-center ${isCollapsed ? 'justify-center' : 'px-3'} py-2.5 rounded-lg transition-colors group overflow-hidden`}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTabSidebar" 
                  className="absolute inset-0 bg-muted-hover rounded-lg" 
                  initial={false} 
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {isActive && !isCollapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full" />
              )}
              <div className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground group-hover:text-foreground'}`}>
                {link.icon}
              </div>
              {!isCollapsed && (
                <span className={`ml-3 relative z-10 font-medium text-sm transition-colors duration-200 ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                  {link.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      
      {/* User Profile */}
      <div className="w-full p-4 border-t border-border-subtle mt-auto bg-transparent">
        {isCollapsed ? (
          <button onClick={logout} title="Logout" className="flex items-center justify-center w-full p-2 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors">
            <LogOut size={20} />
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div className="truncate">
                <p className="font-semibold text-foreground text-sm truncate">{user?.username}</p>
                <p className="text-xs text-muted-foreground capitalize truncate">{user?.role || "Admin"}</p>
              </div>
            </div>
            <button onClick={logout} className="p-2 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors flex-shrink-0">
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
