import re

content = open('src/pages/SettingsPage.tsx').read()

# I will extract the AdminControls piece into a separate component.
# AdminControls starts at: <div className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
# It ends right before: {user.role === "admin" && (  System Update

admin_component = """
function AdminControls({ 
  user, users, username, setUsername, password, setPassword, role, setRole, isCreatingUser, createUser,
  editingUserId, setEditingUserId, adminUserNewPassword, setAdminUserNewPassword, changeUserPassword, deleteUser
}: any) {
  const renderUser = (u: any) => (
    <div key={u.id} className="flex flex-col p-4 bg-muted-subtle border border-border-subtle rounded-xl hover:bg-muted transition-colors">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium text-foreground flex items-center gap-2">
            {u.username}
            {u.id === user.id && <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-500/20 text-indigo-400 px-2.5 py-0.5 rounded border border-indigo-500/20">You</span>}
            {u.isGoogleUser && <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded border border-amber-500/20">Google Auth</span>}
          </p>
          <p className={`text-xs mt-1 capitalize font-medium ${u.role === 'admin' ? 'text-purple-400' : 'text-muted-foreground'}`}>
            Role: {u.role}
          </p>
        </div>
        <div className="flex gap-2">
          {u.id !== user.id && !u.isGoogleUser && (
            <button onClick={() => {
              if (editingUserId === u.id) {
                setEditingUserId(null);
              } else {
                setEditingUserId(u.id);
                setAdminUserNewPassword("");
              }
            }} className="px-3 py-1.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors">
              {editingUserId === u.id ? "Cancel" : "Change Password"}
            </button>
          )}
          {u.id !== user.id && u.isGoogleUser && (
            <span className="px-2.5 py-1 text-[11px] font-medium text-amber-400/80 bg-amber-500/10 rounded-lg border border-amber-500/20">
              Google Account
            </span>
          )}
          {u.id !== user.id && (
            <button onClick={() => deleteUser(u.id)} className="p-1.5 text-muted-foreground bg-muted border border-transparent hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Revoke access">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      {editingUserId === u.id && (
        <div className="mt-4 pt-4 border-t border-border-subtle flex gap-3">
          <input
            type="password"
            placeholder="New Password (min 8 chars)"
            value={adminUserNewPassword}
            onChange={(e: any) => setAdminUserNewPassword(e.target.value)}
            className="flex-1 bg-muted border border-border focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-foreground outline-none"
          />
          <button
            onClick={() => changeUserPassword(u.id)}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-foreground text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );

  return (
        <div className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <h2 className="text-xl font-bold mb-8 flex items-center text-foreground relative z-10">
            <Shield className="mr-3 text-purple-400 w-5 h-5" /> Administrator Controls
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
            <div className="lg:col-span-4 lg:border-r border-border-subtle lg:pr-8">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-6">Provision Identity</h3>
              <form onSubmit={createUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Username</label>
                  <input required value={username} onChange={(e: any)=>setUsername(e.target.value)} type="text" className="w-full bg-muted border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-4 py-2.5 text-foreground transition-all shadow-inner outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Password</label>
                  <input required minLength={4} value={password} onChange={(e: any)=>setPassword(e.target.value)} type="password" className="w-full bg-muted border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-4 py-2.5 text-foreground transition-all shadow-inner outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Role Privileges</label>
                  <select value={role} onChange={(e: any)=>setRole(e.target.value)} className="w-full bg-muted border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-4 py-2.5 text-foreground transition-all shadow-inner outline-none">
                    <option value="user" className="bg-zinc-900">Standard User</option>
                    <option value="admin" className="bg-zinc-900">Administrator</option>
                  </select>
                </div>
                <button disabled={isCreatingUser} type="submit" className="w-full mt-2 bg-white text-zinc-900 hover:bg-zinc-200 font-semibold py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50">
                  {isCreatingUser ? "Creating..." : "Create Identity"}
                </button>
              </form>
            </div>

            <div className="lg:col-span-8">
               <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-6 flex items-center justify-between">
                <span>Active Identities ({users.length})</span>
              </h3>
               <div className="space-y-3">
                 {users.map(renderUser)}
               </div>
            </div>
          </div>
        </div>
  );
}
"""

content = content.replace('export default function SettingsPage() {', admin_component + '\nexport default function SettingsPage() {')

admin_regex = r'<div className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">.*?</div>\n        </div>'

content = re.sub(admin_regex, '<AdminControls user={user} users={users} username={username} setUsername={setUsername} password={password} setPassword={setPassword} role={role} setRole={setRole} isCreatingUser={isCreatingUser} createUser={createUser} editingUserId={editingUserId} setEditingUserId={setEditingUserId} adminUserNewPassword={adminUserNewPassword} setAdminUserNewPassword={setAdminUserNewPassword} changeUserPassword={changeUserPassword} deleteUser={deleteUser} />', content, flags=re.DOTALL)

# Also remove renderUser inside SettingsPage if it's still there
content = re.sub(r'const renderUser = \(u: any\) => \(.*?\n  \);\n', '', content, flags=re.DOTALL)

open('src/pages/SettingsPage.tsx', 'w').write(content)
