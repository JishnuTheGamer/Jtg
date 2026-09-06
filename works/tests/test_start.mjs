import { startServer } from './dist/server.cjs';
import fs from 'fs';

(async () => {
    const servers = JSON.parse(fs.readFileSync('./.data/servers.json', 'utf8'));
    if (servers.length === 0) return console.log('no servers');
    const sid = servers[0].id;
    console.log("Starting server:", sid);
    
    // Mock req, res
    const req = {
        params: { id: sid },
        app: { get: () => null }
    };
    
    let resStatus = 200;
    const res = {
        status: (s) => { resStatus = s; return res; },
        json: (j) => console.log('Response:', resStatus, j)
    };
    
    // wait, startServer is exported from where?
    // the bundle might not export it directly if it's in a route.
    // Let's import the unbundled TS instead using tsx
})();
