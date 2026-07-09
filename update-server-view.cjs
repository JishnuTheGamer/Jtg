const fs = require('fs');

let view = fs.readFileSync('src/pages/ServerView.tsx', 'utf8');

view = view.replace(
  'import ServerBackups from "../components/ServerBackups";',
  'import ServerBackups from "../components/ServerBackups";\nimport PluginManager from "../components/PluginManager";\nimport { Puzzle } from "lucide-react";'
);

const tabsCodeOld = `  const tabs = [
    { name: "Terminal", path: \`/servers/\${id}\`, exactPath: "", icon: <Terminal size={18} /> },
    { name: "Properties", path: \`/servers/\${id}/properties\`, exactPath: "properties", icon: <Sliders size={18} /> },
    { name: "Filesystem", path: \`/servers/\${id}/files\`, exactPath: "files", icon: <Folder size={18} /> },
    { name: "Settings", path: \`/servers/\${id}/settings\`, exactPath: "settings", icon: <Settings size={18} /> },
    { name: "Backup", path: \`/servers/\${id}/backup\`, exactPath: "backup", icon: <Archive size={18} /> },
  ];`;

const tabsCodeNew = `  const tabs = [
    { name: "Terminal", path: \`/servers/\${id}\`, exactPath: "", icon: <Terminal size={18} /> },
    { name: "Properties", path: \`/servers/\${id}/properties\`, exactPath: "properties", icon: <Sliders size={18} /> },
    { name: "Filesystem", path: \`/servers/\${id}/files\`, exactPath: "files", icon: <Folder size={18} /> },
  ];

  if (server?.type === "PAPER") {
    tabs.push({ name: "Plugins", path: \`/servers/\${id}/plugins\`, exactPath: "plugins", icon: <Puzzle size={18} /> });
  }

  tabs.push(
    { name: "Settings", path: \`/servers/\${id}/settings\`, exactPath: "settings", icon: <Settings size={18} /> },
    { name: "Backup", path: \`/servers/\${id}/backup\`, exactPath: "backup", icon: <Archive size={18} /> }
  );`;

view = view.replace(tabsCodeOld, tabsCodeNew);

const routesCodeOld = `           <Routes>
             <Route path="/" element={<ServerConsole serverId={id!} server={server} />} />
             <Route path="/properties" element={<ServerProperties serverId={id!} />} />
             <Route path="/files" element={<FileManager serverId={id!} />} />
             <Route path="/settings" element={<ServerSettings serverId={id!} server={server} />} />
             <Route path="/backup" element={<ServerBackups serverId={id!} />} />
           </Routes>`;

const routesCodeNew = `           <Routes>
             <Route path="/" element={<ServerConsole serverId={id!} server={server} />} />
             <Route path="/properties" element={<ServerProperties serverId={id!} />} />
             <Route path="/files" element={<FileManager serverId={id!} />} />
             <Route path="/settings" element={<ServerSettings serverId={id!} server={server} />} />
             <Route path="/backup" element={<ServerBackups serverId={id!} />} />
             <Route path="/plugins" element={<PluginManager serverId={id!} />} />
           </Routes>`;

view = view.replace(routesCodeOld, routesCodeNew);

fs.writeFileSync('src/pages/ServerView.tsx', view);
