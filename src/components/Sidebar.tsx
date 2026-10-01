import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Server, 
  LayoutDashboard, 
  Plus, 
  LogOut, 
  X, 
  Settings, 
  Key, 
  User, 
  Activity, 
  Box, 
  Menu,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { motion } from "framer-motion";

interface SidebarProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  color: {
    text: string;
    bg: string;
    border: string;
    glow: string;
  };
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({ onClose, isCollapsed, toggleCollapse }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { panelName, panelLogo } = useSettings();

  const pName = panelName || "JTG PANEL";
  const nameParts = pName.split(" ");
  const firstWord = nameParts[0].toUpperCase();
  const restWords = nameParts.slice(1).join(" ").toUpperCase() || "PANEL";

  const isOwnerOrAdmin = user?.role === "admin" || user?.role === "owner";

  // Categorized Navigation Sections with Vibrant Accents
  const sections: NavSection[] = [
    {
      title: "Navigation",
      items: [
        {
          name: "Overview",
          path: "/",
          icon: <LayoutDashboard size={18} />,
          color: {
            text: "text-cyan-400",
            bg: "bg-cyan-500/10",
            border: "border-cyan-400",
            glow: "shadow-[0_0_12px_rgba(6,182,212,0.3)]",
          },
        },
        {
          name: "Servers",
          path: "/servers",
          icon: <Server size={18} />,
          color: {
            text: "text-emerald-400",
            bg: "bg-emerald-500/10",
            border: "border-emerald-400",
            glow: "shadow-[0_0_12px_rgba(16,185,129,0.3)]",
          },
        },
        {
          name: "Nodes",
          path: "/nodes",
          icon: <Activity size={18} />,
          color: {
            text: "text-sky-400",
            bg: "bg-sky-500/10",
            border: "border-sky-400",
            glow: "shadow-[0_0_12px_rgba(14,165,233,0.3)]",
          },
        },
      ],
    },
    ...(isOwnerOrAdmin
      ? [
          {
            title: "Fleet & Control",
            items: [
              {
                name: "Deploy Server",
                path: "/servers/create",
                icon: <Plus size={18} />,
                badge: "NEW",
                badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
                color: {
                  text: "text-violet-400",
                  bg: "bg-violet-500/10",
                  border: "border-violet-400",
                  glow: "shadow-[0_0_12px_rgba(139,92,246,0.3)]",
                },
              },
              {
                name: "Fleet Overview",
                path: "/admin/servers",
                icon: <Box size={18} />,
                color: {
                  text: "text-amber-400",
                  bg: "bg-amber-500/10",
                  border: "border-amber-400",
                  glow: "shadow-[0_0_12px_rgba(245,158,11,0.3)]",
                },
              },
              {
                name: "API Keys",
                path: "/api-keys",
                icon: <Key size={18} />,
                color: {
                  text: "text-yellow-400",
                  bg: "bg-yellow-500/10",
                  border: "border-yellow-400",
                  glow: "shadow-[0_0_12px_rgba(234,179,8,0.3)]",
                },
              },
              {
                name: "Admin Settings",
                path: "/admin/settings",
                icon: <Settings size={18} />,
                color: {
                  text: "text-teal-400",
                  bg: "bg-teal-500/10",
                  border: "border-teal-400",
                  glow: "shadow-[0_0_12px_rgba(20,184,166,0.3)]",
                },
              },
            ],
          },
        ]
      : []),
    {
      title: "Account",
      items: [
        {
          name: "My Account",
          path: "/account",
          icon: <User size={18} />,
          color: {
            text: "text-purple-400",
            bg: "bg-purple-500/10",
            border: "border-purple-400",
            glow: "shadow-[0_0_12px_rgba(168,85,247,0.3)]",
          },
        },
      ],
    },
  ];

  return (
    <aside 
      className={`h-full flex flex-col bg-zinc-950/95 backdrop-blur-xl text-white font-body border-r border-zinc-800/80 transition-all duration-300 z-30 select-none ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-zinc-800/70 flex-shrink-0 bg-zinc-900/30">
        {!isCollapsed ? (
          <Link to="/" className="flex items-center gap-2.5 min-w-0 group" onClick={onClose}>
            {panelLogo ? (
              <img src={panelLogo} alt="Logo" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center font-display font-bold text-black text-sm flex-shrink-0 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                J
              </div>
            )}
            <div className="truncate">
              <div className="font-display font-bold text-sm tracking-wide uppercase text-white truncate flex items-center gap-1.5">
                <span>{firstWord}</span>
                <span className="text-zinc-400 font-medium">{restWords}</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[9px] text-zinc-400 tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>ONLINE</span>
              </div>
            </div>
          </Link>
        ) : (
          <Link to="/" className="mx-auto" onClick={onClose} title={`${firstWord} ${restWords}`}>
            {panelLogo ? (
              <img src={panelLogo} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-cyan-400 flex items-center justify-center font-display font-bold text-black text-sm shadow-md shadow-emerald-500/20">
                J
              </div>
            )}
          </Link>
        )}

        {/* Mobile Close Button */}
        {onClose && (
          <button 
            onClick={onClose} 
            className="md:hidden p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-md transition-colors"
            title="Close menu"
          >
            <X size={18} />
          </button>
        )}

        {/* Desktop Collapse Toggle */}
        <button 
          onClick={toggleCollapse}
          className="hidden md:flex p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-md transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Quick Deploy CTA when not collapsed */}
      {!isCollapsed && isOwnerOrAdmin && (
        <div className="px-3 pt-3 pb-1">
          <Link
            to="/servers/create"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-600/90 via-teal-600/90 to-cyan-600/90 hover:from-emerald-500 hover:to-cyan-500 text-white font-mono text-xs font-semibold tracking-wider shadow-sm shadow-emerald-600/20 hover:shadow-emerald-500/30 transition-all duration-200 group"
          >
            <Plus size={15} className="group-hover:rotate-90 transition-transform duration-200" />
            <span>DEPLOY SERVER</span>
          </Link>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 w-full px-2.5 py-3 space-y-4 overflow-y-auto custom-scrollbar">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed && (
              <p className="px-2.5 pb-1 font-mono text-[9px] font-semibold text-zinc-400 tracking-widest uppercase">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = 
                location.pathname === item.path || 
                (item.path !== "/" && location.pathname.startsWith(item.path));

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  title={isCollapsed ? item.name : undefined}
                  className={`relative flex items-center ${
                    isCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"
                  } rounded-lg transition-all duration-200 group ${
                    isActive
                      ? `${item.color.bg} text-white font-semibold ${item.color.glow}`
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
                  }`}
                >
                  {/* Left accent bar on active link */}
                  {isActive && !isCollapsed && (
                    <motion.div 
                      layoutId="sidebarActivePill" 
                      className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r ${item.color.border.replace("border-", "bg-")}`}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}

                  {/* Icon with intentional vibrant color */}
                  <div 
                    className={`flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? item.color.text : "text-zinc-400 group-hover:text-zinc-200"
                    }`}
                  >
                    {item.icon}
                  </div>

                  {/* Label */}
                  {!isCollapsed && (
                    <span className="ml-3 font-mono text-xs tracking-wide truncate flex-1">
                      {item.name}
                    </span>
                  )}

                  {/* Optional Badge */}
                  {!isCollapsed && item.badge && (
                    <span 
                      className={`ml-auto font-mono text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${
                        item.badgeColor || "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Profile & Status */}
      <div className="w-full p-3 border-t border-zinc-800/70 mt-auto bg-zinc-900/40">
        {!isCollapsed ? (
          <div className="space-y-2.5">
            {/* Version & Status */}
            <div className="flex items-center justify-between px-1 font-mono text-[10px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="tracking-wider">v3.0.0 PROD</span>
              </span>
              <span className="text-zinc-400 tracking-widest uppercase">STABLE</span>
            </div>

            {/* User Profile Pill */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/70 border border-zinc-800/70 hover:border-zinc-700/80 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center font-display font-bold text-xs text-white flex-shrink-0 shadow-sm shadow-emerald-500/20">
                  {user?.username?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="truncate">
                  <p className="font-mono text-xs font-semibold text-white truncate">
                    {user?.username || "Admin"}
                  </p>
                  <p className="font-mono text-[9px] text-zinc-400 uppercase tracking-widest truncate">
                    {user?.role || "Owner"}
                  </p>
                </div>
              </div>

              <button 
                onClick={logout} 
                className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors flex-shrink-0"
                title="Logout"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center font-display font-bold text-xs text-white"
              title={`${user?.username || "User"} (${user?.role || "Admin"})`}
            >
              {user?.username?.[0]?.toUpperCase() || "U"}
            </div>
            <button 
              onClick={logout} 
              title="Logout" 
              className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
