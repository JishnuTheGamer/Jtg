const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs-extra');
const path = require('path');

(async () => {
    try {
        const dataDir = path.join(process.cwd(), ".data");
        await fs.ensureDir(dataDir);
        
        // Ensure server fixture exists
        const sid = "56f0dbc3-9cf0-4d92-90c0-3e29ffbe0138";
        const serversFile = path.join(dataDir, "servers.json");
        let servers = (await fs.pathExists(serversFile)) ? await fs.readJson(serversFile) : [];
        if (!servers.find(s => s.id === sid)) {
            servers.push({
                id: sid,
                name: "test-server",
                owner: "temp-admin",
                ram: 1,
                cpu: 100,
                disk: 5,
                port: 25565,
                ipAlias: "",
                nodeId: "local",
                type: "PAPER",
                version: "latest",
                status: "offline",
                containerId: "mock-container-id-" + sid
            });
            await fs.writeJson(serversFile, servers, { spaces: 2 });
        }

        const token = jwt.sign({ id: 'temp-admin', role: 'admin' }, 'jtg-panel-super-secret');
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        
        console.log("Starting server...");
        let res = await axios.post(`http://localhost:3000/api/servers/${sid}/start`, {}, headers);
        console.log("Start res:", res.data);
        
        console.log("Getting stats...");
        res = await axios.get(`http://localhost:3000/api/servers/${sid}/stats`, headers);
        console.log("Stats (running):", res.data);
        
        console.log("Stopping server...");
        res = await axios.post(`http://localhost:3000/api/servers/${sid}/stop`, {}, headers);
        console.log("Stop res:", res.data);
        
        console.log("Getting stats...");
        res = await axios.get(`http://localhost:3000/api/servers/${sid}/stats`, headers);
        console.log("Stats (stopped):", res.data);
    } catch (e) {
        console.error("Test script error:", e.response?.data || e.message);
    }
})();
