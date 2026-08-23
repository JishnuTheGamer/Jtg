const http = require('http');
http.get('http://localhost:3000/api/servers/nonexistent/backups/test.zip', (res) => {
  console.log("Status:", res.statusCode);
  console.log("Headers:", res.headers);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log("Body:", data));
});
