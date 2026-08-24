content = open('src/pages/SettingsPage.tsx').read()

start_idx = content.find('{user.role === "admin" && (\n        isDevPort3000 ? (')
end_idx = content.find('{user.role === "admin" && (\n        <div className="bg-muted backdrop-blur-xl border border-border-subtle')

if start_idx == -1 or end_idx == -1:
    print("Could not find blocks", start_idx, end_idx)
    exit(1)

block = content[start_idx:end_idx]

# Replace block with {renderGoogleFirebase()}
new_content = content[:start_idx] + '{renderGoogleFirebase()}\n      ' + content[end_idx:]

# Put renderGoogleFirebase definition before return (
func_def = f"""
  const renderGoogleFirebase = () => (
    {block.strip()}
  );

"""

return_idx = new_content.rfind('  return (\n    <motion.div')
new_content = new_content[:return_idx] + func_def + new_content[return_idx:]

open('src/pages/SettingsPage.tsx', 'w').write(new_content)
