const fs = require('fs');
const content = fs.readFileSync('src/pages/AdminSettingsPage.tsx', 'utf8');
const lines = content.split('\n');

const injection = `
  const scrollToTab = (id: string) => {
    setActiveTab(id);
    setMobileOpen(false);
    const element = document.getElementById(id);
    const container = document.getElementById("settings-scroll-container");
    if (element && container) {
       element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveTab(entry.target.id);
          }
        });
      },
      { root: document.getElementById("settings-scroll-container"), rootMargin: "-10% 0px -60% 0px", threshold: 0 }
    );
    
    adminTabs.forEach((tab) => {
      const el = document.getElementById(tab.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
`;

lines.splice(30, 0, injection);
fs.writeFileSync('src/pages/AdminSettingsPage.tsx', lines.join('\n'));
