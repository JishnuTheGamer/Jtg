const axios = require('axios');
axios.get("https://api.spiget.org/v2/resources/free?size=2&sort=-downloads").then(res => console.log(res.data)).catch(err => console.log(err.message));
