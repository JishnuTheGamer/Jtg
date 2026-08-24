content = open('src/components/dashboard/Shared.tsx').read()
content = content.replace('className="group relative block w-full sm:w-auto ${className || ""}"', 'className={`group relative block w-full sm:w-auto ${className || ""}`}')
open('src/components/dashboard/Shared.tsx', 'w').write(content)
