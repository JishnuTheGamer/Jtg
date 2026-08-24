const fs = require('fs');
let content = fs.readFileSync('src/components/ServerConsole.tsx', 'utf-8');

if (!content.includes('import PlayerManager')) {
  content = content.replace('import axios from "axios";', 'import axios from "axios";\nimport PlayerManager from "./PlayerManager";');
}

if (!content.includes('const [players, setPlayers]')) {
  content = content.replace('const [stats, setStats] = useState', 'const [players, setPlayers] = useState<{name: string}[]>([]);\n  const [stats, setStats] = useState');
}

content = content.replace(
  'socket.on("log", (data: string) => {',
  `socket.on("log", (data: string) => {
      const parsedLines = data.split(/\\r?\\n/).filter(line => line.trim() !== "");
      setPlayers(prev => {
        let newPlayers = [...prev];
        let changed = false;
        parsedLines.forEach(line => {
          const cleanLine = line.replace(/\\x1B(?:\\[[0-?]*[ -/]*[@-~])/g, '');
          
          const joinMatch = cleanLine.match(/:\\s+([a-zA-Z0-9_]{3,16})\\s+joined the game/);
          if (joinMatch) {
             const name = joinMatch[1];
             if (!newPlayers.find(p => p.name === name)) {
               newPlayers.push({name});
               changed = true;
             }
          }
          
          const leaveMatch = cleanLine.match(/:\\s+([a-zA-Z0-9_]{3,16})\\s+left the game/);
          if (leaveMatch) {
             const name = leaveMatch[1];
             const filtered = newPlayers.filter(p => p.name !== name);
             if (filtered.length !== newPlayers.length) {
                newPlayers = filtered;
                changed = true;
             }
          }

          const listMatch = cleanLine.match(/players online:\\s*(.*)/i);
          if (listMatch) {
             const listStr = listMatch[1].trim();
             if (listStr) {
               const names = listStr.split(',').map(n => n.trim()).filter(Boolean);
               newPlayers = names.map(name => ({name}));
               changed = true;
             } else {
               newPlayers = [];
               changed = true;
             }
          }
        });
        return changed ? newPlayers : prev;
      });
`
);

content = content.replace(
  'useEffect(() => {\n    const fetchStats',
  `useEffect(() => {
    const t = setTimeout(() => {
       axios.post(\`/api/servers/\${serverId}/command\`, { command: "list" }).catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, [serverId]);

  useEffect(() => {
    const fetchStats`
);

if (!content.includes('<PlayerManager')) {
  // Add PlayerManager below the stats grid
  content = content.replace(
    '</div>\n      </div>\n    </div>',
    '</div>\n        <PlayerManager serverId={serverId} players={players} />\n      </div>\n    </div>'
  );
}

fs.writeFileSync('src/components/ServerConsole.tsx', content);
