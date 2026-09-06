const axios = require('axios');
const jwt = require('jsonwebtoken');

(async () => {
    try {
        const sid = "56f0dbc3-9cf0-4d92-90c0-3e29ffbe0138";
        const token = jwt.sign({ id: 'dev-user', role: 'admin' }, 'jtg-panel-super-secret');
        
        console.log("Calling start for", sid);
        const res = await axios.post(`http://localhost:3000/api/servers/${sid}/start`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Response status:', res.status);
        console.log('Response data:', res.data);
    } catch (e) {
        console.error("Test script error:", e.response ? e.response.status + " " + JSON.stringify(e.response.data) : e.message);
    }
})();
