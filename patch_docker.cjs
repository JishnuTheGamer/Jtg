const fs = require('fs');
const path = require('path');
const p = path.resolve('src/server/services/docker.ts');
let code = fs.readFileSync(p, 'utf8');

// Replace activeStreams[containerId].write(command + "\n");
code = code.replace(/activeStreams\[containerId\]\.write\(command \+ "\\n"\);/g, `try { activeStreams[containerId].write(command + "\\n"); } catch (e) { /* ignore EPIPE */ }`);

// Replace stream.write(command + "\n");
code = code.replace(/stream\.write\(command \+ "\\n"\);/g, `try { stream.write(command + "\\n"); } catch (e) { /* ignore EPIPE */ }`);

// Add stream.on('error') in attachContainerSocket
code = code.replace(/stream\.on\('end', \(\) => \{/g, `stream.on('error', (err: any) => { /* ignore EPIPE */ });\n      stream.on('end', () => {`);

// Add stream.on('error') in sendContainerCommand
code = code.replace(/stream\.on\('data', \(chunk: any\) => \{/g, `stream.on('error', (err: any) => { /* ignore EPIPE */ });\n      stream.on('data', (chunk: any) => {`);

fs.writeFileSync(p, code, 'utf8');
