content = open('src/components/dashboard/Shared.tsx').read()
old = 'className="group relative block w-full sm:w-auto ${className || ""}`}"'
new = 'className={`group relative block w-full sm:w-auto ${className || ""}`}'
content = content.replace(old, new)

old2 = 'className="group relative block w-full sm:w-auto ${className || ""}`}>'
new2 = 'className={`group relative block w-full sm:w-auto ${className || ""}`}>'
content = content.replace(old2, new2)

open('src/components/dashboard/Shared.tsx', 'w').write(content)
