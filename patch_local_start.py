import re

with open("src/server/services/local.ts", "r") as f:
    content = f.read()

# Replace from `processes.set(id, child);` to the end of `startLocalServer`
pattern = r'(processes\.set\(id, child\);\n\n)(  child\.on\("spawn".*?\}\n\};\n\nexport const stopLocalServer)'
replacement = r"""\1  return new Promise<void>((resolve, reject) => {
    let handled = false;

    child.on("spawn", () => {
      localStartedAt.set(id, new Date().toISOString());
      logMessage(`Server process started with PID ${child.pid} for ${serverData.name || id} (${type})`);
      if (!handled) {
        handled = true;
        resolve();
      }
    });

    child.on("error", (err: Error) => {
      localStartedAt.delete(id);
      logMessage(`Failed to start server process: ${err.message}`);
      if (err.message.includes("ENOENT")) {
          logMessage("---- RUNTIME NOTICE ----");
          logMessage(`Required executable or binary is missing or not in PATH for runtime (${type})!`);
          logMessage("If running Minecraft with the Node.js / Local Process runtime on a Linux VPS, ensure OpenJDK 21 is installed:");
          logMessage("  sudo apt update && sudo apt install -y openjdk-21-jre-headless");
          logMessage("Alternatively, you can switch to the Docker Container runtime in Settings.");
          logMessage("------------------------");
      }
      if (!handled) {
        handled = true;
        reject(new Error(`Failed to start server process: ${err.message}`));
      }
    });

    child.on("close", (code: number | null) => {
      logMessage(`Server process exited with code ${code}`);
      processes.delete(id);
      localStartedAt.delete(id);
      activeStreams.delete(id);
      if (!handled) {
        handled = true;
        reject(new Error(`Process exited immediately with code ${code}`));
      }
    });

    child.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      if (logStream.writable) logStream.write(text);
      emitLog(text);
    });

    child.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      if (logStream.writable) logStream.write(text);
      emitLog(text);
    });
    
    // Fallback resolution
    setTimeout(() => {
      if (!handled) {
        if (!child.killed && child.pid) {
          handled = true;
          resolve();
        } else {
          handled = true;
          reject(new Error("Process did not start properly within timeout."));
        }
      }
    }, 1500);
  });
};

export const stopLocalServer"""

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open("src/server/services/local.ts", "w") as f:
    f.write(content)
