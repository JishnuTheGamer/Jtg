import re

content = open('public/node.sh').read()

new_header = """#!/bin/bash
# Node Installer Script for JTG Panel
# This script sets up a remote node for the panel

PORT=6768

while [[ "$#" -gt 0 ]]; do
    case $1 in
        -p|--port) PORT="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

echo "======================================"
echo "    JTG Panel Node Setup Script       "
echo "======================================"
"""

content = re.sub(r'#!/bin/bash.*?echo "======================================"\necho "    JTG Panel Node Setup Script       "\necho "======================================"', new_header, content, flags=re.DOTALL)

content = content.replace("const PORT = 6768;", "const PORT = process.env.PORT || 6768;")

content = content.replace('echo "NODE_KEY=$NODE_KEY" > .env', 'echo "NODE_KEY=$NODE_KEY" > .env\necho "PORT=$PORT" >> .env')

content = content.replace('  Port       : 6768', '  Port       : $PORT')

open('public/node.sh', 'w').write(content)
