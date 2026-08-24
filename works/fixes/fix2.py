content = open('src/components/dashboard/Shared.tsx').read()
content = content.replace('<div className="group relative block w-full sm:w-auto ${className || ""}">', '<div className={`group relative block w-full sm:w-auto ${className || ""}`}>')
open('src/components/dashboard/Shared.tsx', 'w').write(content)
