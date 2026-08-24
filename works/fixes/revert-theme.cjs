const fs = require('fs');

// 1. Update index.css
const cssPath = 'src/index.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

const newRoot = `:root {
  --bg-background: #030305;
  --bg-card: #0a0a0d;
  
  --text-foreground: #ffffff;
  --text-foreground-muted: #e4e4e7;
  --text-muted-foreground: #a1a1aa;
  
  --border-border: rgba(255, 255, 255, 0.1);
  --border-border-subtle: rgba(255, 255, 255, 0.05);
  --border-border-strong: rgba(255, 255, 255, 0.2);
  
  --bg-muted: rgba(255, 255, 255, 0.05);
  --bg-muted-hover: rgba(255, 255, 255, 0.1);
  --bg-muted-subtle: rgba(255, 255, 255, 0.02);

  --btn-primary-bg: #ffffff;
  --btn-primary-text: #000000;
}`;

// Remove old roots
cssContent = cssContent.replace(/:root\s*{[^}]*}/g, '');
cssContent = cssContent.replace(/:root\[data-theme="dark"\]\s*{[^}]*}/g, '');
cssContent = cssContent.replace(/@theme\s*{/g, newRoot + '\n\n@theme {');
fs.writeFileSync(cssPath, cssContent);
console.log('Updated index.css');

// 2. Remove Theme selector from SettingsPage
const settingsPath = 'src/pages/SettingsPage.tsx';
let settingsContent = fs.readFileSync(settingsPath, 'utf8');
const themeUIStart = '<div className="w-full mt-6">';
const themeUIEnd = '</div>\n            </div>';
if (settingsContent.includes(themeUIStart)) {
    const startIndex = settingsContent.indexOf(themeUIStart);
    // Find the ending tag matching
    const slice = settingsContent.substring(startIndex);
    // Rough match based on knowing the structure
    const toRemoveRegex = /<div className="w-full mt-6">\s*<label className="block text-sm font-medium text-muted-foreground mb-3">Panel Theme<\/label>[\s\S]*?<\/span>\s*<\/button>\s*<\/div>\s*<\/div>/;
    settingsContent = settingsContent.replace(toRemoveRegex, '');
    fs.writeFileSync(settingsPath, settingsContent);
    console.log('Removed Theme UI from SettingsPage');
}

// 3. Fix SettingsContext theme
const ctxPath = 'src/context/SettingsContext.tsx';
let ctxContent = fs.readFileSync(ctxPath, 'utf8');
ctxContent = ctxContent.replace(/document.documentElement.setAttribute\("data-theme", .*\);/g, 'document.documentElement.setAttribute("data-theme", "dark");');
fs.writeFileSync(ctxPath, ctxContent);
console.log('Updated SettingsContext');

