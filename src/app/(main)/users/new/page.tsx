"use client";

import { useEffect, useState } from "react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

type Role = { pk?: string; name?: string };

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 4) return { score, label: "Fair", color: "bg-amber-400" };
  if (score === 5) return { score, label: "Good", color: "bg-blue-500" };
  return { score, label: "Strong", color: "bg-emerald-500" };
}

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "At least 8 characters required.";
  if (!/[A-Z]/.test(pw)) return "Must include an uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Must include a lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Must include a number.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Must include a special character (e.g. @, #, !).";
  return null;
}

export default function NewUserPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [roleId, setRoleId] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [msg, setMsg] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await api<{ roles: Role[] }>("/api/admin/roles");
      if (res.ok && res.data?.roles) setRoles(res.data.roles);
    })();
  }, []);

  const strength = password ? passwordStrength(password) : null;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    const err = validatePassword(password);
    if (err) { setPwError(err); return; }
    setPwError(null);
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
          <div className="relative">
            <input
              required
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPwError(null); }}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm pr-10 ${pwError ? "border-red-400" : "border-slate-200"}`}
              placeholder="Min 8 chars, upper, lower, number, special"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showPw ? (
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
          {/* Strength bar */}
          {strength && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1 h-1.5">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className={`flex-1 rounded-full transition-colors ${strength.score >= n * 1.5 ? strength.color : "bg-slate-100"}`}
                  />
                ))}
              </div>
              <p className={`text-xs font-medium ${strength.score <= 2 ? "text-red-500" : strength.score <= 4 ? "text-amber-500" : "text-emerald-600"}`}>
                {strength.label}
              </p>
            </div>
          )}
          {pwError && <p className="mt-1 text-xs text-red-500">{pwError}</p>}
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
