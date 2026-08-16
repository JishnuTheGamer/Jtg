import React, { useState } from 'react';
import { UserPlus, Shield, Trash2, Key, Crown, User, ArrowUpDown, Lock } from 'lucide-react';

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
  changeUserRole?: (id: string, newRole: string) => void;
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const isOwner = user?.role === "owner";
  const isAdmin = user?.role === "admin";

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    if (!changeUserRole || !isOwner) return;
    setUpdatingRoleId(targetUserId);
    try {
      await changeUserRole(targetUserId, newRole);
    } finally {
      setUpdatingRoleId(null);
    }
  };

  return (
    <div className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
        <div>
          <h2 className="text-xl font-bold flex items-center text-foreground">
            <UserPlus className="mr-3 text-theme-500 w-5 h-5" /> User & Role Management
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {isOwner 
              ? "Full Owner permissions: Create Admins & Members, manage user roles, and configure credentials."
              : "Admin permissions: Create and manage member users. Role modifications and Owner deletion are restricted."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-semibold">
              <Crown size={14} className="text-amber-400 fill-amber-400/20" /> Owner Account
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-theme-600/10 border border-theme-600/30 text-theme-500 rounded-full text-xs font-semibold">
              <Shield size={14} className="text-theme-500" /> Admin Account
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-8 relative z-10">
        {/* Create User Form */}
        <div className="bg-muted/20 border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 border-b border-border-subtle pb-2 flex items-center justify-between">
            <span>Create New User</span>
            {isAdmin && !isOwner && (
              <span className="text-[11px] font-normal text-muted-foreground">
                Admins can create normal member users
              </span>
            )}
          </h3>
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
              placeholder="Password (min 8 chars)"
              className="bg-muted border border-border focus:border-theme-600 focus:ring-1 focus:ring-theme-600/50 rounded-xl px-4 py-2.5 text-foreground transition-all outline-none"
            />
            
            {isOwner ? (
              <select 
                value={role} 
                onChange={(e: any) => setRole(e.target.value)}
                className="bg-muted border border-border focus:border-theme-600 focus:ring-1 focus:ring-theme-600/50 rounded-xl px-4 py-2.5 text-foreground transition-all outline-none"
              >
                <option value="user">User (Member)</option>
                <option value="admin">Admin</option>
              </select>
            ) : (
              <div className="flex items-center px-4 py-2.5 bg-muted/60 border border-border rounded-xl text-foreground text-sm font-medium gap-2">
                <User size={16} className="text-muted-foreground" />
                <span>Role: Member (User)</span>
              </div>
            )}

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
          <div className="flex items-center justify-between mb-4 border-b border-border-subtle pb-2">
            <h3 className="text-sm font-semibold text-foreground">Registered Users & Roles</h3>
            <span className="text-xs text-muted-foreground">{users.length} total user{users.length === 1 ? '' : 's'}</span>
          </div>

          <div className="bg-muted/30 border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-tl-xl">User</th>
                  <th className="px-4 py-3 font-semibold">Assigned Role</th>
                  <th className="px-4 py-3 font-semibold text-center">Role Control</th>
                  <th className="px-4 py-3 font-semibold rounded-tr-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {users.map((u: any) => {
                  const targetRole = u.role?.toLowerCase() || 'user';
                  const isTargetOwner = targetRole === 'owner';
                  const isTargetAdmin = targetRole === 'admin';
                  const isTargetSelf = u.id === user?.id || u.username === user?.username;

                  // RBAC delete permission:
                  // - Cannot delete owner
                  // - Admin can ONLY delete normal users (u.role === 'user')
                  // - Owner can delete admin and user (not self)
                  const canDelete = !isTargetOwner && !isTargetSelf && (isOwner || (isAdmin && !isTargetAdmin));

                  // RBAC password reset permission:
                  // - Admin cannot change owner or other admins
                  const canChangePassword = isOwner || isTargetSelf || (isAdmin && !isTargetOwner && !isTargetAdmin);

                  return (
                    <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border">
                            {isTargetOwner ? (
                              <Crown size={16} className="text-amber-400" />
                            ) : isTargetAdmin ? (
                              <Shield size={16} className="text-theme-500" />
                            ) : (
                              <User size={16} className="text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold">{u.username}</span>
                              {isTargetSelf && (
                                <span className="text-[10px] bg-theme-600/20 text-theme-400 px-1.5 py-0.5 rounded font-bold">YOU</span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground block">
                              {u.isGoogleUser ? "Google Auth" : "Password Auth"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {isTargetOwner ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-bold">
                            <Crown size={13} className="fill-amber-400/20" /> Owner
                          </span>
                        ) : isTargetAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-theme-600/10 border border-theme-600/30 text-theme-500 rounded-lg text-xs font-bold">
                            <Shield size={13} /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted border border-border text-muted-foreground rounded-lg text-xs font-medium">
                            <User size={13} /> Member
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {isOwner && !isTargetOwner ? (
                          <div className="inline-flex items-center gap-1 bg-muted/80 p-1 rounded-xl border border-border">
                            <button
                              disabled={updatingRoleId === u.id || targetRole === "user"}
                              onClick={() => handleRoleChange(u.id, "user")}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                targetRole === "user"
                                  ? "bg-theme-600 text-white shadow-sm"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                            >
                              Member
                            </button>
                            <button
                              disabled={updatingRoleId === u.id || targetRole === "admin"}
                              onClick={() => handleRoleChange(u.id, "admin")}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                targetRole === "admin"
                                  ? "bg-theme-600 text-white shadow-sm"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                            >
                              Admin
                            </button>
                          </div>
                        ) : isTargetOwner ? (
                          <span className="text-xs text-amber-400/80 font-medium inline-flex items-center gap-1">
                            <Lock size={12} /> Protected Primary
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium inline-flex items-center gap-1">
                            <Lock size={12} /> Owner Locked
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {editingUserId === u.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <input 
                              type="password" 
                              placeholder="New Pass (min 8)" 
                              value={adminUserNewPassword} 
                              onChange={(e: any) => setAdminUserNewPassword(e.target.value)}
                              className="bg-black/40 border border-border focus:border-theme-600 rounded-lg px-2 py-1 text-xs w-32 text-foreground outline-none"
                            />
                            <button onClick={() => changeUserPassword(u.id)} className="bg-theme-700 hover:bg-indigo-700 text-white text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all">Save</button>
                            <button onClick={() => setEditingUserId(null)} className="bg-muted hover:bg-muted-hover text-foreground-muted text-xs px-2 py-1.5 rounded-lg border border-border transition-all">Cancel</button>
                          </div>
                        ) : confirmDeleteId === u.id ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-xs text-rose-400 font-medium mr-1">Delete {u.username}?</span>
                            <button 
                              onClick={() => {
                                deleteUser(u.id);
                                setConfirmDeleteId(null);
                              }}
                              className="bg-rose-600 hover:bg-rose-500 text-white text-xs px-2.5 py-1 rounded-lg font-bold transition-all shadow-sm active:scale-95"
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
                            {canChangePassword && (
                              <button 
                                onClick={() => { setEditingUserId(u.id); setConfirmDeleteId(null); }} 
                                className="p-1.5 text-theme-500 hover:bg-theme-600/10 rounded-lg transition-colors" 
                                title="Change Password"
                              >
                                <Key size={16} />
                              </button>
                            )}

                            {canDelete ? (
                              <button 
                                onClick={() => { setConfirmDeleteId(u.id); setEditingUserId(null); }} 
                                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" 
                                title="Delete User"
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : isTargetOwner ? (
                              <span className="p-1.5 text-amber-500/40" title="Owner cannot be deleted">
                                <Lock size={16} />
                              </span>
                            ) : isTargetAdmin && isAdmin ? (
                              <span className="p-1.5 text-muted-foreground/40" title="Admins cannot delete other Admins">
                                <Lock size={16} />
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground text-sm">
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
