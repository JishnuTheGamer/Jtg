const express = require('express');
const app = express();
app.get('/api/servers/:id/backups/:filename', (req, res) => {
  res.json({ matched: true, filename: req.params.filename });
});
app.use((req, res) => res.status(404).json({ matched: false }));

const request = require('http').request({
  port: 3001,
  path: '/api/servers/123/backups/backup-2026-08-23T10%3A06%3A24.123Z.zip'
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => { console.log(data); process.exit(0); });
});

app.listen(3001, () => request.end());
