const axios = require('axios');
const fs = require('fs');

(async () => {
    try {
        const servers = JSON.parse(fs.readFileSync('./.data/servers.json', 'utf8'));
        if (servers.length === 0) return console.log('no servers');
        const sid = servers[0].id;
        console.log("Starting server:", sid);
        
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id: 'dev-user-zf2j94px2', role: 'admin' }, 'jtg-panel-super-secret');
        
        const res = await axios.post(`http://localhost:3000/api/servers/${sid}/start`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Response:', res.status, res.data);
    } catch (e) {
        console.error("Test script error:", e.response?.data || e.message);
    }
})();
