import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Search, Check, GitBranch, Sparkles, Folder, FolderOpen } from "lucide-react";

export interface CategorizedVersionDropdownProps {
  value: string;
  onChange: (value: string) => void;
  versions: string[];
  software?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

interface VersionCategory {
  id: string;
  label: string;
  badge?: string;
  isLatest?: boolean;
  versions: string[];
}

export default function CategorizedVersionDropdown({
  value,
  onChange,
  versions = [],
  software = "paper",
  disabled = false,
  className = "",
  placeholder = "Select Version..."
}: CategorizedVersionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isMinecraft = useMemo(() => {
    const s = (software || "").toLowerCase();
    return !["nodejs", "node", "python", "python3"].includes(s);
  }, [software]);

  // Group versions into structured slots / categories as requested
  const categories: VersionCategory[] = useMemo(() => {
    if (!isMinecraft || versions.length === 0) {
      return [];
    }

    const cat26: string[] = [];
    const cat21: string[] = [];
    const cat20: string[] = [];
    const cat19: string[] = [];
    const cat18: string[] = [];
    const cat17: string[] = [];
    const cat16: string[] = [];
    const cat15: string[] = [];
    const cat14: string[] = [];
    const cat13: string[] = [];
    const cat12: string[] = [];
    const legacy: string[] = []; // 1.7 to 1.11 combined single category as requested

    // Filter out bare "latest" if real versions exist
    const cleanVersions = versions.filter(v => v !== "latest");

    cleanVersions.forEach(v => {
      if (v.startsWith("26.")) {
        cat26.push(v);
      } else if (v.startsWith("1.21")) {
        cat21.push(v);
      } else if (v.startsWith("1.20")) {
        cat20.push(v);
      } else if (v.startsWith("1.19")) {
        cat19.push(v);
      } else if (v.startsWith("1.18")) {
        cat18.push(v);
      } else if (v.startsWith("1.17")) {
        cat17.push(v);
      } else if (v.startsWith("1.16")) {
        cat16.push(v);
      } else if (v.startsWith("1.15")) {
        cat15.push(v);
      } else if (v.startsWith("1.14")) {
        cat14.push(v);
      } else if (v.startsWith("1.13")) {
        cat13.push(v);
      } else if (v.startsWith("1.12")) {
        cat12.push(v);
      } else if (
        v.startsWith("1.11") ||
        v.startsWith("1.10") ||
        v.startsWith("1.9") ||
        v.startsWith("1.8") ||
        v.startsWith("1.7")
      ) {
        legacy.push(v);
      } else {
        // Fallback into 26 or legacy
        if (v.startsWith("26")) cat26.push(v);
        else legacy.push(v);
      }
    });

    const result: VersionCategory[] = [];

    if (cat26.length > 0) {
      result.push({
        id: "26",
        label: "26.x (Latest Paper Version)",
        badge: "Latest • Java 25+",
        isLatest: true,
        versions: cat26
      });
    }
    if (cat21.length > 0) {
      result.push({
        id: "1.21",
        label: "1.21.x Category",
        badge: "Java 21",
        versions: cat21
      });
    }
    if (cat20.length > 0) {
      result.push({
        id: "1.20",
        label: "1.20.x Category",
        badge: "Java 17/21",
        versions: cat20
      });
    }
    if (cat19.length > 0) {
      result.push({
        id: "1.19",
        label: "1.19.x Category",
        badge: "Java 17",
        versions: cat19
      });
    }
    if (cat18.length > 0) {
      result.push({
        id: "1.18",
        label: "1.18.x Category",
        badge: "Java 17",
        versions: cat18
      });
    }
    if (cat17.length > 0) {
      result.push({
        id: "1.17",
        label: "1.17.x Category",
        badge: "Java 16",
        versions: cat17
      });
    }
    if (cat16.length > 0) {
      result.push({
        id: "1.16",
        label: "1.16.x Category",
        badge: "Java 8/11",
        versions: cat16
      });
    }
    if (cat15.length > 0) {
      result.push({
        id: "1.15",
        label: "1.15.x Category",
        badge: "Java 8",
        versions: cat15
      });
    }
    if (cat14.length > 0) {
      result.push({
        id: "1.14",
        label: "1.14.x Category",
        badge: "Java 8",
        versions: cat14
      });
    }
    if (cat13.length > 0) {
      result.push({
        id: "1.13",
        label: "1.13.x Category",
        badge: "Java 8",
        versions: cat13
      });
    }
    if (cat12.length > 0) {
      result.push({
        id: "1.12",
        label: "1.12.x Category",
        badge: "Java 8",
        versions: cat12
      });
    }
    if (legacy.length > 0) {
      result.push({
        id: "legacy",
        label: "1.7 – 1.11 (Legacy)",
        badge: "Java 8",
        versions: legacy
      });
    }

    return result;
  }, [versions, isMinecraft]);

  // Find which category contains the active value and expand it by default
  useEffect(() => {
    if (isOpen) {
      if (value) {
        const found = categories.find(c => c.versions.includes(value));
        if (found) {
          setExpandedCategory(found.id);
          return;
        }
      }
      // If none selected, default expand the 26.x category
      if (categories.length > 0) {
        setExpandedCategory(categories[0].id);
      }
    }
  }, [isOpen, value, categories]);

  // Handle category toggle
  const toggleCategory = (catId: string) => {
    setExpandedCategory(prev => (prev === catId ? null : catId));
  };

  // Helper for displaying current version badge
  const renderCurrentDisplay = () => {
    if (!value) {
      return <span className="text-zinc-500 font-mono text-sm">{placeholder}</span>;
    }

    if (value.startsWith("26.")) {
      return (
        <span className="flex items-center gap-2 min-w-0">
          <GitBranch className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-mono text-white text-sm font-bold truncate">{value}</span>
          <span className="text-[10px] font-sans font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full shrink-0">
            Latest Paper Version
          </span>
        </span>
      );
    }

    if (value.startsWith("1.21")) {
      return (
        <span className="flex items-center gap-2 min-w-0">
          <GitBranch className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-mono text-white text-sm font-bold truncate">{value}</span>
          <span className="text-[10px] font-sans font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
            1.21.x
          </span>
        </span>
      );
    }

    return (
      <span className="flex items-center gap-2 min-w-0">
        <GitBranch className="w-4 h-4 text-zinc-400 shrink-0" />
        <span className="font-mono text-white text-sm truncate">{value}</span>
      </span>
    );
  };

  // If search query is active, filter all versions
  const isSearching = searchQuery.trim().length > 0;
  const searchLower = searchQuery.toLowerCase().trim();

  return (
    <div className={`relative ${disabled ? "opacity-50 pointer-events-none" : ""} ${isOpen ? "z-50" : "z-10"}`} ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-3 bg-[#0d0d0d] border border-[#262626] hover:border-[#404040] focus:border-amber-500/60 rounded-xl px-4 py-3 text-left transition-all outline-none ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {renderCurrentDisplay()}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full bg-[#111111] border border-[#2b2b2b] shadow-[0_15px_50px_rgba(0,0,0,0.85)] rounded-xl overflow-hidden flex flex-col max-h-[380px]">
          {/* Search Header */}
          <div className="p-2.5 border-b border-[#242424] flex items-center bg-[#090909] shrink-0">
            <Search className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search version (e.g. 26.3, 1.20, 1.16)..."
              className="bg-transparent border-none outline-none text-white text-sm w-full font-mono placeholder-zinc-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs text-zinc-500 hover:text-white px-1.5 py-0.5 rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto p-1.5 custom-scrollbar space-y-1">
            {/* Non-Minecraft or Searching mode without groups */}
            {!isMinecraft ? (
              // Simple list for nodejs / python
              versions
                .filter(v => v.toLowerCase().includes(searchLower))
                .map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      onChange(v);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 font-mono text-sm rounded-lg transition-colors ${
                      value === v ? "bg-amber-500/20 text-amber-300 font-bold" : "text-zinc-300 hover:bg-white/5"
                    }`}
                  >
                    <span>{v}</span>
                    {value === v && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                ))
            ) : isSearching ? (
              // Search active: direct matched list with category tags
              (() => {
                const matched = versions.filter(v => v !== "latest" && v.toLowerCase().includes(searchLower));
                if (matched.length === 0) {
                  return <div className="p-4 text-zinc-500 text-xs text-center font-mono">No matching versions found</div>;
                }
                return matched.map(v => {
                  const is26 = v.startsWith("26.");
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        onChange(v);
                        setIsOpen(false);
                        setSearchQuery("");
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 font-mono text-sm rounded-lg transition-colors ${
                        value === v ? "bg-amber-500/20 text-amber-300 font-bold" : "text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{v}</span>
                        {is26 && (
                          <span className="text-[10px] font-sans font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                            Latest Paper
                          </span>
                        )}
                      </div>
                      {value === v && <Check className="w-4 h-4 text-amber-400" />}
                    </button>
                  );
                });
              })()
            ) : (
              // Slot by slot categorized display
              categories.map(cat => {
                const isExpanded = expandedCategory === cat.id;
                const containsSelected = cat.versions.includes(value);

                return (
                  <div key={cat.id} className="rounded-lg overflow-hidden border border-[#202020] bg-[#141414]">
                    {/* Category Header Slot */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                        cat.isLatest
                          ? "bg-amber-500/10 hover:bg-amber-500/15"
                          : containsSelected
                          ? "bg-white/[0.04] hover:bg-white/[0.07]"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className={`w-4 h-4 shrink-0 ${cat.isLatest ? "text-amber-400" : "text-zinc-400"}`} />
                        ) : (
                          <ChevronRight className={`w-4 h-4 shrink-0 ${cat.isLatest ? "text-amber-400" : "text-zinc-400"}`} />
                        )}
                        <span className={`font-mono text-xs font-bold truncate ${cat.isLatest ? "text-amber-300" : "text-zinc-200"}`}>
                          {cat.label}
                        </span>
                        {cat.badge && (
                          <span
                            className={`text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                              cat.isLatest
                                ? "bg-amber-500/25 text-amber-300 border border-amber-500/40"
                                : "bg-white/10 text-zinc-400"
                            }`}
                          >
                            {cat.badge}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {containsSelected && (
                          <span className="text-[10px] font-sans font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Active
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-zinc-500">
                          {cat.versions.length}
                        </span>
                      </div>
                    </button>

                    {/* Sub-versions list inside category */}
                    {isExpanded && (
                      <div className="border-t border-[#1f1f1f] bg-[#0c0c0c] py-1 px-1 space-y-0.5">
                        {cat.versions.map(v => {
                          const isSel = value === v;
                          const isTop26 = v === "26.3";
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => {
                                onChange(v);
                                setIsOpen(false);
                                setSearchQuery("");
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-mono text-xs transition-colors pl-6 ${
                                isSel
                                  ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30"
                                  : "text-zinc-300 hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span>{v}</span>
                                {isTop26 && (
                                  <span className="text-[9px] font-sans font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                                    Latest
                                  </span>
                                )}
                              </div>
                              {isSel && <Check className="w-3.5 h-3.5 text-amber-400" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
