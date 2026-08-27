const axios = require('axios');
const jwt = require('jsonwebtoken');

(async () => {
    try {
        const sid = "56f0dbc3-9cf0-4d92-90c0-3e29ffbe0138";
        const token = jwt.sign({ id: 'dev-user-1v6atulg8', role: 'admin' }, 'jtg-panel-super-secret');
        
        const res = await axios.get(`http://localhost:3000/api/servers/${sid}/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Response stats:', res.data);
    } catch (e) {
        console.error("Test script error:", e.message);
    }
})();
