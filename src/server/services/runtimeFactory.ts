import { GameServerRuntimeProvider } from "./runtimeProvider.js";
import { WingsRuntimeProvider } from "./wings.js";
import { MockRuntimeProvider } from "./mockProvider.js";

// Optional fallback to local docker
// import { LocalDockerRuntimeProvider } from "./localDocker.js";

export function getRuntimeProvider(type: string): GameServerRuntimeProvider {
  if (type === "wings") return new WingsRuntimeProvider();
  if (type === "mock") return new MockRuntimeProvider();
  // if (type === "local") return new LocalDockerRuntimeProvider();
  
  // Default to wings for production architecture
  return new WingsRuntimeProvider();
}
