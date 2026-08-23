const fs = require('fs');
const path = require('path');

const files = [
  'src/components/FileManager.tsx',
  'src/components/NotificationsDropdown.tsx',
  'src/components/ServerBackups.tsx',
  'src/components/ServerSettings.tsx',
  'src/components/SystemUpdateListener.tsx',
  'src/context/AuthContext.tsx',
  'src/context/SettingsContext.tsx',
  'src/pages/AdminSettingsPage.tsx',
  'src/App.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let needsStorage = content.includes('localStorage');
  let needsSession = content.includes('sessionStorage');
  
  if (needsStorage || needsSession) {
    content = content.replace(/localStorage/g, 'safeStorage');
    content = content.replace(/sessionStorage/g, 'safeSessionStorage');
    
    // figure out depth
    const depth = file.split('/').length - 2;
    const prefix = depth === 0 ? './' : '../'.repeat(depth);
    const importStmt = `\nimport { safeStorage, safeSessionStorage } from "${prefix}utils/storage";\n`;
    
    // insert import after first line or after react import
    content = content.replace(/(import.*?;?\n)/, `$1${importStmt}`);
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
