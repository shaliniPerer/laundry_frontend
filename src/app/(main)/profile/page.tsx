"use client";

import { useEffect, useState } from "react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";
import { UserCircle, Save, KeyRound, Eye, EyeOff } from "lucide-react";

type Profile = { id: string; email: string; name: string; roleId?: string };

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    api<Profile>("/api/auth/me").then((r) => {
      if (r.ok && r.data) {
        setProfile(r.data);
        setName(r.data.name);
        setEmail(r.data.email);
      }
    });
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setProfileMsg({ type: "err", text: "Name is required." }); return; }
    setSavingProfile(true);
    setProfileMsg(null);
    const res = await api("/api/auth/me", {
      method: "PATCH",
      body: JSON.stringify({ name: name.trim(), email: email.trim() || undefined }),
    });
    setSavingProfile(false);
    if (res.ok) {
      setProfile((p) => p ? { ...p, name: name.trim(), email: email.trim() || p.email } : p);
      setProfileMsg({ type: "ok", text: "Profile updated successfully." });
    } else {
      setProfileMsg({ type: "err", text: res.error ?? "Failed to update profile." });
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPw || !newPw || !confirmPw) { setPwMsg({ type: "err", text: "All fields are required." }); return; }
    if (newPw !== confirmPw) { setPwMsg({ type: "err", text: "New passwords do not match." }); return; }
    if (newPw.length < 6) { setPwMsg({ type: "err", text: "Password must be at least 6 characters." }); return; }
    setSavingPw(true);
    setPwMsg(null);
    const res = await api("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    setSavingPw(false);
    if (res.ok) {
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setPwMsg({ type: "ok", text: "Password changed successfully." });
    } else {
      setPwMsg({ type: "err", text: res.error ?? "Failed to change password." });
    }
  }

  return (
    <PageScaffold title="Profile Settings" subtitle="Manage your account details and password">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Avatar + role card */}
        <div
          className="rounded-xl border p-6 flex items-center gap-5"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "rgba(13,148,136,0.12)" }}
          >
            <UserCircle className="w-12 h-12" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{profile?.name ?? "—"}</p>
            <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{profile?.email}</p>
            {profile?.roleId && (
              <span
                className="inline-block mt-2 text-xs px-2.5 py-0.5 rounded-full font-semibold"
                style={{ background: "rgba(13,148,136,0.12)", color: "var(--accent)" }}
              >
                {profile.roleId}
              </span>
            )}
          </div>
        </div>

        {/* Edit profile form */}
        <div
          className="rounded-xl border p-6"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
            <UserCircle className="w-4 h-4" style={{ color: "var(--accent)" }} />
            Edit Profile
          </h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>Display Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-500 transition"
                style={{ background: "var(--surface2)", color: "var(--foreground)", borderColor: "var(--border)" }}
                placeholder="Your name"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>Email / Username</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-500 transition"
                style={{ background: "var(--surface2)", color: "var(--foreground)", borderColor: "var(--border)" }}
                placeholder="email@example.com"
              />
            </div>
            {profileMsg && (
              <p className={`text-sm rounded-lg px-3 py-2 ${profileMsg.type === "ok" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                {profileMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-colors"
              style={{ background: "var(--accent)" }}
            >
              <Save className="w-4 h-4" />
              {savingProfile ? "Saving…" : "Save Profile"}
            </button>
          </form>
        </div>

        {/* Change password form */}
        <div
          className="rounded-xl border p-6"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
            <KeyRound className="w-4 h-4" style={{ color: "var(--accent)" }} />
            Change Password
          </h2>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-500 transition"
                  style={{ background: "var(--surface2)", color: "var(--foreground)", borderColor: "var(--border)" }}
                  placeholder="Current password"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>New Password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-500 transition"
                  style={{ background: "var(--surface2)", color: "var(--foreground)", borderColor: "var(--border)" }}
                  placeholder="At least 6 characters"
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-500 transition"
                style={{ background: "var(--surface2)", color: "var(--foreground)", borderColor: "var(--border)" }}
                placeholder="Repeat new password"
              />
            </div>
            {pwMsg && (
              <p className={`text-sm rounded-lg px-3 py-2 ${pwMsg.type === "ok" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                {pwMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={savingPw}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-colors"
              style={{ background: "var(--accent)" }}
            >
              <KeyRound className="w-4 h-4" />
              {savingPw ? "Changing…" : "Change Password"}
            </button>
          </form>
        </div>

      </div>
    </PageScaffold>
  );
}
