const fs = require('fs');

const file = "src/server/controllers/servers.ts";
let text = fs.readFileSync(file, 'utf8');

const target = `  if (server.containerId) {
    const stats = await getContainerStats(server.containerId, server.nodeId, server.id);
    res.json({
      ...stats,
      limitRam: server.ram ? server.ram * 1024 : 1024,
      limitCpu: server.cpu || 100,
      limitDisk: server.disk ? server.disk * 1024 : 10240,
      status: server.status
    });
  } else {
    res.json({ cpu: 0, ram: 0, disk: 0, netIn: 0, netOut: 0, startedAt: null, limitRam: server.ram ? server.ram * 1024 : 1024, limitCpu: server.cpu || 100, limitDisk: server.disk ? server.disk * 1024 : 10240, status: server.status });
  }`;

const replacement = `  if (server.containerId) {
    const stats = await getContainerStats(server.containerId, server.nodeId, server.id);
    // dynamically resolve status based on whether we have actual stats or not.
    // wait, getContainerStats returns startedAt if running.
    const isRunning = stats.startedAt !== null && stats.startedAt !== undefined;
    res.json({
      ...stats,
      limitRam: server.ram ? server.ram * 1024 : 1024,
      limitCpu: server.cpu || 100,
      limitDisk: server.disk ? server.disk * 1024 : 10240,
      status: isRunning ? "online" : "offline"
    });
  } else {
    res.json({ cpu: 0, ram: 0, disk: 0, netIn: 0, netOut: 0, startedAt: null, limitRam: server.ram ? server.ram * 1024 : 1024, limitCpu: server.cpu || 100, limitDisk: server.disk ? server.disk * 1024 : 10240, status: "offline" });
  }`;

if (text.includes(target)) {
    text = text.replace(target, replacement);
    fs.writeFileSync(file, text);
    console.log("Fixed getServerStats in servers.ts");
} else {
    console.log("Could not find target in servers.ts");
}
