const { spawn } = require('child_process');
const child = spawn('nonexistent-binary', ['-v']);
child.on('error', err => console.log('error emitted', err.message));
console.log('spawned, returning');
