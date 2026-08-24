import re
content = open('src/server/services/docker.ts').read()
content = content.replace('let protocol = "http";', 'let protocol: "http" | "https" | "ssh" = "http";')
open('src/server/services/docker.ts', 'w').write(content)
