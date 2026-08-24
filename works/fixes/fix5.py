import re
content = open('src/components/dashboard/Shared.tsx').read()
content = re.sub(r'className="group relative block w-full sm:w-auto \$\{className \|\| ""\}(\`|\})?(\}|>)?">', r'className={`group relative block w-full sm:w-auto ${className || ""}`}>', content)
content = re.sub(r'className="group relative block w-full sm:w-auto \$\{className \|\| ""\}"', r'className={`group relative block w-full sm:w-auto ${className || ""}`}', content)
content = re.sub(r'className="group relative block w-full sm:w-auto \$\{className \|\| ""\}`\}>"', r'className={`group relative block w-full sm:w-auto ${className || ""}`}', content)
open('src/components/dashboard/Shared.tsx', 'w').write(content)
