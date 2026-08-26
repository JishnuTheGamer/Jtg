const axios = require('axios');

(async () => {
    try {
        const servers = require('./.data/servers.json');
        if (servers.length === 0) return console.log('no servers');
        const sid = servers[0].id;
        
        // Wait, how do I get the auth token?
        // It's easier to just call the function directly.
    } catch (e) {
        console.error(e);
    }
})();
