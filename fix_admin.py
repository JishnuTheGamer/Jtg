import re
content = open('src/pages/SettingsPage.tsx').read()
old = """  return (
        <AdminControls user={user} users={users} username={username} setUsername={setUsername} password={password} setPassword={setPassword} role={role} setRole={setRole} isCreatingUser={isCreatingUser} createUser={createUser} editingUserId={editingUserId} setEditingUserId={setEditingUserId} adminUserNewPassword={adminUserNewPassword} setAdminUserNewPassword={setAdminUserNewPassword} changeUserPassword={changeUserPassword} deleteUser={deleteUser} />
  );"""

new = """  return (
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
  );"""

content = content.replace(old, new, 1) # Only replace the first occurrence (inside AdminControls function)
open('src/pages/SettingsPage.tsx', 'w').write(content)
