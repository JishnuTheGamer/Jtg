import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Server, LayoutDashboard, Plus, Settings, Key, User, Activity, X, ChevronRight, Terminal, ArrowRight, CornerDownLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface SearchServer {
  id: string;
  name: string;
  software?: string;
  port?: number;
  status?: string;
  ipAlias?: string;
}

interface QuickLink {
  id: string;
  title: string;
  subtitle: string;
  category: "Navigation" | "Server" | "Action";
  icon: React.ReactNode;
  path: string;
}

const STATIC_NAV_LINKS: QuickLink[] = [
  {
    id: "nav-overview",
    title: "Overview",
    subtitle: "Dashboard metrics & system status",
    category: "Navigation",
    icon: <LayoutDashboard className="w-4 h-4 text-theme-500" />,
    path: "/"
  },
  {
    id: "nav-servers",
    title: "All Servers",
    subtitle: "View & manage active instances",
    category: "Navigation",
    icon: <Server className="w-4 h-4 text-zinc-400" />,
    path: "/servers"
  },
  {
    id: "nav-create",
    title: "Deploy Server",
    subtitle: "Create new Minecraft or game server",
    category: "Action",
    icon: <Plus className="w-4 h-4 text-theme-500" />,
    path: "/servers/create"
  },
  {
    id: "nav-fleet",
    title: "Fleet Management",
    subtitle: "Admin controls & node overview",
    category: "Navigation",
    icon: <Activity className="w-4 h-4 text-theme-500" />,
    path: "/admin/servers"
  },
  {
    id: "nav-settings",
    title: "Account",
    subtitle: "Customization, users, & themes",
    category: "Navigation",
    icon: <User className="w-4 h-4 text-theme-700" />,
    path: "/account"
  },
  {
    id: "nav-apikeys",
    title: "API Keys",
    subtitle: "Manage external API access tokens",
    category: "Navigation",
    icon: <Key className="w-4 h-4 text-pink-400" />,
    path: "/api-keys"
  }
];

export default function GlobalSearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [servers, setServers] = useState<SearchServer[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Fetch servers when modal opens
  const fetchServers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get("/api/servers");
      if (Array.isArray(res.data)) {
        setServers(res.data);
      }
    } catch (e) {
      console.error("Failed to fetch search servers", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchServers();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen, fetchServers]);

  // Filter items
  const cleanQuery = query.trim().toLowerCase();

  const filteredServers: QuickLink[] = servers
    .filter((s) => {
      if (!cleanQuery) return true;
      return (
        s.name.toLowerCase().includes(cleanQuery) ||
        s.id.toLowerCase().includes(cleanQuery) ||
        (s.software && s.software.toLowerCase().includes(cleanQuery)) ||
        (s.ipAlias && s.ipAlias.toLowerCase().includes(cleanQuery)) ||
        (s.port && s.port.toString().includes(cleanQuery))
      );
    })
    .map((s) => ({
      id: `server-${s.id}`,
      title: s.name,
      subtitle: `Software: ${s.software || "Paper"} • Port: ${s.port || 25565}`,
      category: "Server" as const,
      icon: <Server className="w-4 h-4 text-theme-500" />,
      path: `/servers/${s.id}`
    }));

  const filteredNavLinks = STATIC_NAV_LINKS.filter((item) => {
    if (!cleanQuery) return true;
    return (
      item.title.toLowerCase().includes(cleanQuery) ||
      item.subtitle.toLowerCase().includes(cleanQuery)
    );
  });

  const allResults = [...filteredNavLinks, ...filteredServers];

  // Arrow key navigation
  useEffect(() => {
    const handleNavigationKeys = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, allResults.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allResults.length) % Math.max(1, allResults.length));
      } else if (e.key === "Enter" && allResults[selectedIndex]) {
        e.preventDefault();
        handleSelect(allResults[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleNavigationKeys);
    return () => window.removeEventListener("keydown", handleNavigationKeys);
  }, [isOpen, allResults, selectedIndex]);

  const handleSelect = (item: QuickLink) => {
    setIsOpen(false);
    navigate(item.path);
  };

  return (
    <>
      {/* Search Icon Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-dim hover:text-white hover:bg-white/[0.05] rounded transition-colors"
        title="Search (Ctrl+K)"
      >
        <Search size={20} />
      </button>

      {/* Full Modal Command Palette Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
          <div 
            className="fixed inset-0" 
            onClick={() => setIsOpen(false)} 
          />

          <div className="relative w-full max-w-2xl bg-card/95 border border-border/80 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150">
            {/* Input Bar */}
            <div className="relative flex items-center border-b border-border/60 px-4 py-3 bg-card">
              <Search className="w-5 h-5 text-theme-500 shrink-0 mr-3" />
              <input 
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search servers, settings, navigation..."
                className="w-full bg-transparent text-sm sm:text-base text-foreground outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button 
                  onClick={() => setQuery("")}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-md mr-1"
                >
                  <X size={16} />
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                ESC
              </button>
            </div>

            {/* Results List */}
            <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar max-h-[420px]">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Searching servers and system...
                </div>
              ) : allResults.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No matching results found</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Try searching for server name, "deploy", or "settings"
                  </p>
                </div>
              ) : (
                allResults.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-theme-600/20 text-foreground border border-theme-600/40 shadow-sm" 
                          : "hover:bg-muted/50 border border-transparent text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg bg-card/80 border border-border/50 shrink-0 ${isSelected ? "text-theme-500" : ""}`}>
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                              {item.title}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border uppercase tracking-wider ${
                              item.category === "Server" 
                                ? "bg-theme-600/10 text-theme-500 border-theme-600/20"
                                : item.category === "Action"
                                ? "bg-theme-600/10 text-theme-500 border-theme-600/20"
                                : "bg-muted text-muted-foreground border-border/50"
                            }`}>
                              {item.category}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground/80 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {isSelected && (
                          <span className="hidden sm:flex items-center gap-1 text-[11px] text-theme-300 font-medium bg-theme-600/20 px-2 py-0.5 rounded-md">
                            Open <CornerDownLeft size={11} />
                          </span>
                        )}
                        <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? "text-theme-500 translate-x-0.5" : "text-muted-foreground/40"}`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with shortcuts */}
            <div className="px-4 py-2.5 bg-muted/40 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-card border border-border/60 rounded text-[10px]">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-card border border-border/60 rounded text-[10px]">↓</kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-card border border-border/60 rounded text-[10px]">↵</kbd>
                  to select
                </span>
              </div>
              <div>
                <kbd className="px-1.5 py-0.5 bg-card border border-border/60 rounded text-[10px]">ESC</kbd>
                to close
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
