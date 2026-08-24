content = open('src/components/dashboard/Shared.tsx').read()
old_str = '<div className="group relative block w-full sm:w-auto ${className || ""}`}">\n'
new_str = '<div className={`group relative block w-full sm:w-auto ${className || ""}`}>\n'
content = content.replace(old_str, new_str)
old_str2 = '<div className="group relative block w-full sm:w-auto ${className || ""}`}">      '
new_str2 = '<div className={`group relative block w-full sm:w-auto ${className || ""}`}>      '
content = content.replace(old_str2, new_str2)
old_str3 = '<div className="group relative block w-full sm:w-auto ${className || ""}`}">\r\n'
new_str3 = '<div className={`group relative block w-full sm:w-auto ${className || ""}`}>\r\n'
content = content.replace(old_str3, new_str3)
old_str4 = '<div className="group relative block w-full sm:w-auto ${className || ""}`}">\r'
new_str4 = '<div className={`group relative block w-full sm:w-auto ${className || ""}`}>\r'
content = content.replace(old_str4, new_str4)

# just to be safe
content = content.replace('<div className="group relative block w-full sm:w-auto ${className || ""}`}">', '<div className={`group relative block w-full sm:w-auto ${className || ""}`}>')

open('src/components/dashboard/Shared.tsx', 'w').write(content)
