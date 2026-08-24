import re

def rep(filename, old, new):
    c = open(filename).read()
    open(filename, 'w').write(c.replace(old, new))

rep('src/server/controllers/servers.ts', 'export interface Server {', 'export interface Server {\n  containerId?: string | null;')

# Note: actually I should check what is in export interface Server. 
