"use client";

import { useState } from "react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

export default function NewUserPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await api("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      setMsg(res.error || "Error");
      return;
    }
    setMsg("User created.");
    setEmail("");
    setPassword("");
    setName("");
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
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Password</label>
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        </div>
        <button type="submit" className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-sm">
          Create user
        </button>
        {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}
      </form>
    </PageScaffold>
  );
}
