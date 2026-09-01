import { createLocalServer, startLocalServer } from "./src/server/services/local.js";
import { panelEvents } from "./src/server/events.js";

async function run() {
  panelEvents.on("log", (id, msg) => console.log(`[LOG] ${id}: ${msg}`));
  const s = { id: "test1", port: 9005, type: "nodejs" };
  await createLocalServer(s);
  await startLocalServer("test1", s);
  
  setTimeout(() => {
    process.exit(0);
  }, 2000);
}
run();
