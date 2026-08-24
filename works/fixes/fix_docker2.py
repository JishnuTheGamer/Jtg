import re
content = open('src/server/services/docker.ts').read()
content = content.replace("protocol = url.protocol.replace(':', '');", "protocol = url.protocol.replace(':', '') as any;")
open('src/server/services/docker.ts', 'w').write(content)
