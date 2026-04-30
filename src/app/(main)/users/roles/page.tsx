"use client";

import { useEffect, useState } from "react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";
import { Shield } from "lucide-react";

type Role = { pk?: string; name?: string; permissions?: string[] };

export default function RolesListPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  async function refresh() {
    const res = await api<{ roles: Role[] }>("/api/admin/roles");
    if (res.ok && res.data?.roles) setRoles(res.data.roles);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createRole(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await api("/api/admin/roles", { method: "POST", body: JSON.stringify({ name, permissions: [] }) });
    if (!res.ok) {
      setMsg(res.error || "Error");
      return;
    }
    setMsg("Role created.");
    setName("");
    refresh();
  }

  return (
    <PageScaffold title="Roles list" subtitle="Permission groups for users">
      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={createRole} className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 card-shadow p-5 space-y-3 h-fit">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <Shield className="w-4 h-4 text-teal-600" />
            New role
          </div>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Role name"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <button type="submit" className="w-full py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold">
            Add role
          </button>
          {msg ? <p className="text-xs text-emerald-700">{msg}</p> : null}
        </form>
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden card-shadow">
          {roles.length === 0 ? (
            <p className="p-8 text-center text-slate-500 text-sm">No roles yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {roles.map((r, i) => (
                <li key={r.pk || i} className="px-4 py-3 flex justify-between gap-4">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-slate-500 font-mono">{(r.permissions ?? []).join(", ") || "no permissions"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageScaffold>
  );
}
