import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Menu, ChevronRight } from "lucide-react";
import { useLocation, matchPath, Link } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import GlobalSearchModal from "./GlobalSearchModal";
import NotificationsDropdown from "./NotificationsDropdown";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { panelName, panelLogo } = useSettings();

  const pName = panelName || 'JTG PANEL';
  const nameParts = pName.split(' ');
  const firstWord = nameParts[0].toUpperCase();
  const restWords = nameParts.slice(1).join(' ').toUpperCase() || 'PANEL';



  useEffect(() => {
    const handleToggle = () => {
      if (window.innerWidth < 768) {
        setMobileOpen(prev => !prev);
      } else {
        setIsCollapsed(prev => !prev);
      }
    };
    window.addEventListener('toggle-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

  const isServerView = matchPath("/servers/:id/*", location.pathname) && !matchPath("/servers/create", location.pathname);
  const isCreateServer = matchPath("/servers/create", location.pathname);
  const isAdminSettings = matchPath("/admin/settings", location.pathname);

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/') return 'Overview';
    if (path === '/servers') return 'Servers';
    if (path === '/servers/create') return 'Deploy Server';
    if (path.startsWith('/servers/')) return 'Server Management';
    if (path === '/admin/servers') return 'Fleet';
    if (path === '/account') return 'Account';
    if (path === '/api-keys') return 'API Keys';
    return '';
  };

  if (isServerView || isCreateServer || isAdminSettings) {
    return (
      <div className="flex h-[100dvh] w-full bg-transparent text-foreground font-sans overflow-hidden selection:bg-theme-600/30">
        <main className="flex-1 w-full h-full relative z-10 overflow-auto">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className={`flex h-[100dvh] w-full bg-transparent text-foreground font-sans overflow-hidden selection:bg-theme-600/30`}>
      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 transform flex-shrink-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar onClose={() => setMobileOpen(false)} isCollapsed={isCollapsed} toggleCollapse={() => setIsCollapsed(!isCollapsed)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative bg-transparent">
        
        {/* NAV */}
        <header className="sticky top-0 z-40 border-b border-line bg-ink backdrop-blur-md flex-shrink-0">
            <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
                        className="md:hidden p-2 -ml-2 text-dim hover:text-white hover:bg-line/50 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                        title="Toggle Sidebar Menu"
                        aria-label="Toggle Sidebar Menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    {/* Show logo in top bar for all screens */}
                    <Link to="/" className="flex items-center gap-3 group">
                        {panelLogo ? (
                            <img src={panelLogo} alt="Logo" className="w-7 h-7 object-contain" />
                        ) : (
                            <div className="w-7 h-7 bg-white flex items-center justify-center group-hover:rotate-45 transition-transform duration-500">
                                <div className="w-3.5 h-3.5 bg-black"></div>
                            </div>
                        )}
                        <span className="font-display font-bold text-lg tracking-wide uppercase text-white">{firstWord} <span className="text-dim font-medium">{restWords}</span></span>
                    </Link>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 ml-auto">
                    {/* ALL SYSTEMS GO status badge (no timer) */}
                    <div className="hidden md:flex items-center gap-2 font-mono text-[10px] text-dim tracking-widest mr-4 px-3 py-1.5 rounded bg-panel/50 border border-line">
                        <span className="w-1.5 h-1.5 bg-theme-500 rounded-full pulse-dot"></span> ALL SYSTEMS GO
                    </div>
                    <GlobalSearchModal />
                    <NotificationsDropdown />
                </div>
            </div>
        </header>

        {/* Main Content */}
        <main className={`flex-1 w-full h-full relative z-0 overflow-x-hidden overflow-y-auto pb-safe custom-scrollbar`}>
          {location.pathname === "/" ? children : (
            <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
