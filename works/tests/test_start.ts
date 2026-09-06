import { startServer } from './src/server/controllers/servers.js';
import fs from 'fs';

(async () => {
    try {
        const servers = JSON.parse(fs.readFileSync('./.data/servers.json', 'utf8'));
        if (servers.length === 0) return console.log('no servers');
        const sid = servers[0].id;
        console.log("Starting server:", sid);
        
        const req = {
            params: { id: sid },
            app: { get: () => null }
        };
        
        let resStatus = 200;
        const res = {
            status: (s: number) => { resStatus = s; return res; },
            json: (j: any) => console.log('Response:', resStatus, j)
        };
        
        await startServer(req as any, res as any);
    } catch (e) {
        console.error("Test script error:", e);
    }
})();
