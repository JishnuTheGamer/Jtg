const fs = require('fs');

// Revert App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf-8');
appCode = appCode.replace(/import DeveloperPanel from "\.\/pages\/DeveloperPanel";\n?/g, '');
appCode = appCode.replace(/[ \t]*\{\/\* @ts-ignore \*\/\}\n[ \t]*\{\(import\.meta as any\)\.env\.VITE_ENABLE_DEVELOPER_PANEL === "true" && \(\n[ \t]*<Route path="\/developer" element=\{<DeveloperPanel \/>\} \/>\n[ \t]*\)\}\n?/g, '');
fs.writeFileSync('src/App.tsx', appCode);

// Revert Sidebar.tsx
let sidebarCode = fs.readFileSync('src/components/Sidebar.tsx', 'utf-8');
sidebarCode = sidebarCode.replace(/[ \t]*if \(\(import\.meta as any\)\.env\.VITE_ENABLE_DEVELOPER_PANEL === "true"\) \{\n[ \t]*links\.push\(\{ name: "Developer", path: "\/developer", icon: <Box size=\{20\} \/> \}\);\n[ \t]*\}\n?/g, '');
fs.writeFileSync('src/components/Sidebar.tsx', sidebarCode);

console.log("Reverted dev panel changes from App.tsx and Sidebar.tsx");
