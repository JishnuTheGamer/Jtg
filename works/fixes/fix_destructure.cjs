const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');
content = content.replace(
  'const { stats, servers: realServers, refetch } = useDashboardData();',
  'const { stats, statsHistory, servers: realServers, refetch } = useDashboardData();'
);
fs.writeFileSync('src/pages/Dashboard.tsx', content);
