import React from 'react';
import { UserPlus, Shield, Trash2, Key } from 'lucide-react';

interface AdminControlsProps {
  user: any;
  users: any[];
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  isCreatingUser: boolean;
  createUser: (e: React.FormEvent) => void;
  editingUserId: string | null;
  setEditingUserId: (id: string | null) => void;
  adminUserNewPassword: string;
  setAdminUserNewPassword: (v: string) => void;
  changeUserPassword: (id: string) => void;
  deleteUser: (id: string) => void;
  changeUserRole: (id: string, newRole: string) => void;
}

export default function AdminControls({
  user,
  users,
  username,
  setUsername,
  password,
  setPassword,
  role,
  setRole,
  isCreatingUser,
  createUser,
  editingUserId,
  setEditingUserId,
  adminUserNewPassword,
  setAdminUserNewPassword,
  changeUserPassword,
  deleteUser,
  changeUserRole
}: AdminControlsProps) {
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  return (
    <div className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
      <h2 className="text-xl font-bold mb-6 flex items-center text-foreground relative z-10">
        <UserPlus className="mr-3 text-theme-500 w-5 h-5" /> User Management
      </h2>
      <div className="flex flex-col gap-8 relative z-10">
        {/* Create User Form */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4 border-b border-border-subtle pb-2">Create New User</h3>
          <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input 
              required 
              value={username} 
              onChange={(e: any) => setUsername(e.target.value)} 
              type="text" 
              placeholder="Username"
              className="bg-muted border border-border focus:border-theme-600 focus:ring-1 focus:ring-theme-600/50 rounded-xl px-4 py-2.5 text-foreground transition-all outline-none"
            />
            <input 
              required 
              value={password} 
              onChange={(e: any) => setPassword(e.target.value)} 
              type="password" 
              placeholder="Password"
              className="bg-muted border border-border focus:border-theme-600 focus:ring-1 focus:ring-theme-600/50 rounded-xl px-4 py-2.5 text-foreground transition-all outline-none"
            />
            <select 
              value={role} 
              onChange={(e: any) => setRole(e.target.value)}
              className="bg-muted border border-border focus:border-theme-600 focus:ring-1 focus:ring-theme-600/50 rounded-xl px-4 py-2.5 text-foreground transition-all outline-none"
            >
              <option value="user">User</option>
              {user?.role === 'owner' && <option value="admin">Admin</option>}
            </select>
            <button 
              disabled={isCreatingUser} 
              type="submit" 
              className="bg-theme-700 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center whitespace-nowrap"
            >
              {isCreatingUser ? "Creating..." : "Create User"}
            </button>
          </form>
        </div>

        {/* User List */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4 border-b border-border-subtle pb-2">Existing Users</h3>
          <div className="bg-muted/30 border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-tl-xl">Username</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold rounded-tr-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-foreground font-medium flex items-center gap-2">
                      {u.username}
                      {u.role === 'admin' && <Shield size={14} className="text-theme-700" />}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{u.role}</td>
                    <td className="px-4 py-3 text-right">
                      {editingUserId === u.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <input 
                            type="password" 
                            placeholder="New Pass" 
                            value={adminUserNewPassword} 
                            onChange={(e: any) => setAdminUserNewPassword(e.target.value)}
                            className="bg-black/40 border border-border focus:border-theme-600 rounded-lg px-2 py-1 text-xs w-28 text-foreground outline-none"
                          />
                          <button onClick={() => changeUserPassword(u.id)} className="bg-theme-700 hover:bg-indigo-700 text-white text-xs px-2 py-1.5 rounded-lg transition-all">Save</button>
                          <button onClick={() => setEditingUserId(null)} className="bg-muted hover:bg-muted-hover text-foreground-muted text-xs px-2 py-1.5 rounded-lg border border-border transition-all">Cancel</button>
                        </div>
                      ) : confirmDeleteId === u.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-xs text-rose-400 font-medium mr-1">Delete user?</span>
                          <button 
                            onClick={() => {
                              deleteUser(u.id);
                              setConfirmDeleteId(null);
                            }}
                            className="bg-rose-600 hover:bg-rose-500 text-white text-xs px-2 py-1 rounded-lg font-bold transition-all shadow-sm active:scale-95"
                          >
                            Yes
                          </button>
                          <button 
                            onClick={() => setConfirmDeleteId(null)}
                            className="bg-muted hover:bg-muted-hover text-foreground-muted text-xs px-2 py-1 rounded-lg border border-border transition-all"
                          >
                            No
                          </button>
                        </div>

                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {user?.role === 'owner' && u.role !== 'owner' && u.username !== "admin" && (
                            <select
                              value={u.role}
                              onChange={(e) => changeUserRole(u.id, e.target.value)}
                              className="bg-muted text-xs border border-border rounded px-1 py-1 mr-2"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                          {u.role !== 'owner' && (user?.role === 'owner' || u.role !== 'admin') && (

                            <button onClick={() => { setEditingUserId(u.id); setConfirmDeleteId(null); }} className="p-1.5 text-theme-500 hover:bg-theme-600/10 rounded-lg transition-colors" title="Change Password">
                              <Key size={16} />
                            </button>
                          )}
                          {u.role !== 'owner' && (user?.role === 'owner' || u.role !== 'admin') && u.username !== "admin" && (
                            <button onClick={() => { setConfirmDeleteId(u.id); setEditingUserId(null); }} className="p-1.5 text-theme-400 hover:bg-theme-500/10 rounded-lg transition-colors" title="Delete User">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground text-sm">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
