import re

def rep(filename, old, new):
    c = open(filename).read()
    open(filename, 'w').write(c.replace(old, new))

rep('src/server/controllers/servers.ts', 'containerId: null,', 'containerId: null as string | null,')
rep('src/server/controllers/servers.ts', '(s) =>', '(s: any) =>')

# Auth controller
rep('src/server/controllers/auth.ts', 'req, res', '_req, res')
rep('src/server/controllers/auth.ts', '(name)', '(_name)')
rep('src/server/controllers/auth.ts', 'req: Request,', '_req: Request,')

# Routes
rep('src/server/routes/api-keys.ts', 'req, res', '_req, res')
rep('src/server/routes/api.ts', 'req: Request', '_req: Request')
rep('src/server/routes/nodes.ts', 'req, res', '_req, res')

c = open('src/server/routes/servers.ts').read()
c = c.replace('err,', '_err,').replace('err)', '_err)').replace('stdout, stderr', '_stdout, _stderr')
c = c.replace('logStderr', '_logStderr')
open('src/server/routes/servers.ts', 'w').write(c)

rep('src/server/routes/system.ts', 'req, res', '_req, res')
rep('src/server/routes/system.ts', 'error)', '_error)')

rep('src/server/services/docker.ts', 'chunk =>', '_chunk =>')

c = open('src/server/services/sftp.ts').read()
c = c.replace('reject)', '_reject)')
c = c.replace('userDir,', '_userDir,')
c = c.replace('filename, flags, attrs', '_filename, _flags, _attrs')
c = c.replace('handle)', '_handle)')
c = c.replace('path)', '_path)')
c = c.replace('err)', '_err)')
open('src/server/services/sftp.ts', 'w').write(c)

