"use client";

import { useEffect, useState } from "react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

type Role = { pk?: string; name?: string };

export default function NewUserPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const res = await api<{ roles: Role[] }>("/api/admin/roles");
      if (res.ok && res.data?.roles) setRoles(res.data.roles);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await api("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ name, email, phone: phone || undefined, password, roleId: roleId || undefined }),
    });
    if (!res.ok) {
      setMsg(res.error || "Error");
      return;
    }
    setMsg("User created.");
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRoleId("");
  }

  return (
    <PageScaffold title="New user" subtitle="Staff accounts">
      <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 card-shadow p-6 max-w-md space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Password</label>
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Role <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
          <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            <option value="">— Select role —</option>
            {roles.map((r) => (
              <option key={r.pk} value={r.pk?.replace("ROLE#", "")}>{r.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-sm">
          Create user
        </button>
        {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}
      </form>
    </PageScaffold>
  );
}
