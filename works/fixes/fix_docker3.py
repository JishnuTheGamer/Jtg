import re
content = open('src/server/services/docker.ts').read()
content = content.replace("protocol = url.protocol.replace(':', '') as any;", "protocol = (url.protocol.replace(':', '') === 'https' ? 'https' : 'http');")
open('src/server/services/docker.ts', 'w').write(content)
