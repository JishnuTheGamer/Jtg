import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

interface SearchableDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Search...",
  className = "",
  disabled = false,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className={`relative ${disabled ? 'opacity-50 pointer-events-none' : ''} ${isOpen ? 'z-50' : 'z-10'}`} ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-black/40 backdrop-blur-sm border border-white/10 hover:border-white/20 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50 rounded-xl px-4 py-3 text-white transition-all shadow-sm cursor-pointer flex justify-between items-center ${className}`}
      >
        <span className="truncate pr-4">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full bg-zinc-900/95 backdrop-blur-md shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] ring-1 ring-white/10 rounded-xl overflow-hidden flex flex-col max-h-[320px]">
          <div className="p-3 border-b border-white/10 flex items-center bg-black/40 shrink-0">
            <Search className="w-5 h-5 text-indigo-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="bg-transparent border-none outline-none text-white text-base w-full font-sans placeholder-zinc-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {options.filter((o) => o.label.toLowerCase().includes(searchQuery.toLowerCase()) || o.value.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className="p-4 text-zinc-500 text-sm text-center bg-black/20 rounded-lg">No results found</div>
            ) : (
              options
                .filter((o) => o.label.toLowerCase().includes(searchQuery.toLowerCase()) || o.value.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((o) => (
                  <div
                    key={o.value}
                    onClick={() => {
                      onChange(o.value);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className={`px-3 py-2.5 rounded-lg cursor-pointer flex items-center justify-between text-sm transition-colors mb-0.5 last:mb-0 ${
                      value === o.value
                        ? "bg-indigo-500 text-white"
                        : "text-zinc-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="truncate">{o.label}</span>
                    {value === o.value && <Check className="w-4 h-4 text-white shrink-0 ml-2" />}
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
