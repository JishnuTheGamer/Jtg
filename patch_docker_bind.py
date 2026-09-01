import re

with open("src/server/services/docker.ts", "r") as f:
    content = f.read()

pattern = r"  const serverDir = path\.join\(process\.cwd\(\), \"\.data\", \"servers\", serverData\.id\);\n  const containerBindPath = isLocal \? serverDir : `/opt/jtg-panel-node/servers/\$\{serverData\.id\}`;"
replacement = r"""  const serverDir = path.join(process.cwd(), ".data", "servers", serverData.id);
  const hostDataDir = process.env.JTG_HOST_DATA_PATH || path.join(process.cwd(), ".data");
  const hostServerDir = path.join(hostDataDir, "servers", serverData.id);
  const containerBindPath = isLocal ? hostServerDir : `/opt/jtg-panel-node/servers/${serverData.id}`;"""

content = re.sub(pattern, replacement, content)

with open("src/server/services/docker.ts", "w") as f:
    f.write(content)
