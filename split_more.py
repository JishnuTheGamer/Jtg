content = open('src/pages/SettingsPage.tsx').read()

admin_start = content.find('{user.role === "admin" && (\n        <div className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">')
admin_end = content.find('</motion.div>\n  );\n}')

if admin_start != -1 and admin_end != -1:
    admin_block = content[admin_start:admin_end]
    content = content[:admin_start] + '{renderAdminControls()}\n      ' + content[admin_end:]
    func_def = f"""
  const renderAdminControls = () => (
    {admin_block.strip()}
  );
"""
    return_idx = content.rfind('  return (\n    <motion.div')
    content = content[:return_idx] + func_def + content[return_idx:]


bg_start = content.find('{user.role === "admin" && (\n        <div className="bg-muted backdrop-blur-xl border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mt-8">')
bg_end = content.find('{renderGoogleFirebase()}')

if bg_start != -1 and bg_end != -1:
    bg_block = content[bg_start:bg_end]
    content = content[:bg_start] + '{renderBackgroundConfig()}\n      ' + content[bg_end:]
    func_def = f"""
  const renderBackgroundConfig = () => (
    {bg_block.strip()}
  );
"""
    return_idx = content.rfind('  return (\n    <motion.div')
    content = content[:return_idx] + func_def + content[return_idx:]

open('src/pages/SettingsPage.tsx', 'w').write(content)
