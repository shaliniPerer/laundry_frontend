"use client";

import { useEffect, useState } from "react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

type Row = { id?: string; name?: string; email?: string; phone?: string; roleId?: string; userNumber?: string };
type Role = { pk?: string; name?: string };

export default function UsersListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});
  const [roles, setRoles] = useState<Role[]>([]);

  // Edit modal state
  const [editUser, setEditUser] = useState<Row | null>(null);
  const [editName, setEditName] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editShowPw, setEditShowPw] = useState(false);
  const [editMsg, setEditMsg] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirm state
  const [deleteUser, setDeleteUser] = useState<Row | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function loadData() {
    const [usersRes, rolesRes] = await Promise.all([
      api<{ users: Row[] }>("/api/admin/users"),
      api<{ roles: Role[] }>("/api/admin/roles"),
    ]);
    if (usersRes.ok && usersRes.data?.users) {
      // Only show staff users (those created via the new-user form)
      setRows(usersRes.data.users);
    }
    if (rolesRes.ok && rolesRes.data?.roles) {
      setRoles(rolesRes.data.roles);
      const map: Record<string, string> = {};
      for (const r of rolesRes.data.roles) {
        if (r.pk) {
          map[r.pk] = r.name ?? r.pk;
          map[r.pk.replace("ROLE#", "")] = r.name ?? r.pk;
        }
      }
      setRoleMap(map);
    }
  }

  useEffect(() => { loadData(); }, []);

  function openEdit(r: Row) {
    setEditUser(r);
    setEditName(r.name ?? "");
    setEditRoleId(r.roleId ?? "");
    setEditPassword("");
    setEditShowPw(false);
    setEditMsg("");
  }

  async function submitEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editUser?.id) return;
    setEditLoading(true);
    setEditMsg("");
    const body: Record<string, string> = { name: editName, roleId: editRoleId };
    if (editPassword) body.password = editPassword;
    const res = await api(`/api/admin/users/${editUser.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    setEditLoading(false);
    if (!res.ok) { setEditMsg(res.error || "Error"); return; }
    setEditUser(null);
    loadData();
  }

  async function confirmDelete() {
    if (!deleteUser?.id) return;
    setDeleteLoading(true);
    await api(`/api/admin/users/${deleteUser.id}`, { method: "DELETE" });
    setDeleteLoading(false);
    setDeleteUser(null);
    loadData();
  }

  return (
    <PageScaffold title="Users list" subtitle="Accounts that can sign in">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden card-shadow">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-slate-500 text-sm">No users.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-left text-white text-xs uppercase">
                <th className="px-4 py-3 font-medium">User ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id || i} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{r.userNumber || `USER${String(i + 1).padStart(3, "0")}`}</td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3">{r.phone || "—"}</td>
                  <td className="px-4 py-3">{r.roleId ? (roleMap[r.roleId] || r.roleId) : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(r)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteUser(r)}
                        className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Edit user — {editUser.email}</h2>
            <form onSubmit={submitEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Name</label>
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Role</label>
                <select
                  value={editRoleId}
                  onChange={(e) => setEditRoleId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="">— No role —</option>
                  {roles.map((r) => (
                    <option key={r.pk} value={r.pk?.replace("ROLE#", "")}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  New password <span className="text-slate-400 normal-case font-normal">(leave blank to keep current)</span>
                </label>
                <div className="relative">
                  <input
                    type={editShowPw ? "text" : "password"}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm pr-10"
                    placeholder="New password"
                  />
                  <button
                    type="button"
                    onClick={() => setEditShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {editShowPw ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7c1.07 0 2.1.18 3.06.51M15 12a3 3 0 01-3 3m6.364-3.636A9 9 0 0121 12c0 3-4 7-9 7" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {editMsg && <p className="text-sm text-red-600">{editMsg}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-50"
                >
                  {editLoading ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-semibold text-slate-800 mb-2">Delete user?</h2>
            <p className="text-sm text-slate-500 mb-6">
              This will permanently delete <span className="font-medium text-slate-700">{deleteUser.name}</span> ({deleteUser.email}). This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm disabled:opacity-50"
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setDeleteUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </PageScaffold>
  );
}
