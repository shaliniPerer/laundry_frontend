"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Eye, EyeOff, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { api, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@laundry.local");
  const [password, setPassword] = useState("admin123");
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot-password state
  const [showForgot, setShowForgot] = useState(false);
  const [fpEmail, setFpEmail] = useState("");
  const [fpNew, setFpNew] = useState("");
  const [fpConfirm, setFpConfirm] = useState("");
  const [fpMsg, setFpMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpShowNew, setFpShowNew] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await api<{ token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok || !res.data || !("token" in res.data)) {
      setError(res.error || "Login failed");
      return;
    }
    setToken((res.data as { token: string }).token);
    router.replace("/dashboard");
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    setFpMsg(null);
    if (!fpEmail || !fpNew || !fpConfirm) { setFpMsg({ type: "err", text: "All fields are required." }); return; }
    if (fpNew !== fpConfirm) { setFpMsg({ type: "err", text: "Passwords do not match." }); return; }
    if (fpNew.length < 6) { setFpMsg({ type: "err", text: "Password must be at least 6 characters." }); return; }
    setFpLoading(true);
    const res = await api("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: fpEmail, newPassword: fpNew }),
    });
    setFpLoading(false);
    if (res.ok) {
      setFpMsg({ type: "ok", text: "Password reset successfully. You can now sign in." });
      setTimeout(() => { setShowForgot(false); setEmail(fpEmail); setFpEmail(""); setFpNew(""); setFpConfirm(""); setFpMsg(null); }, 2000);
    } else {
      setFpMsg({ type: "err", text: res.error ?? "Reset failed." });
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden md:block md:w-1/2 relative overflow-hidden">
        <Image src="/login-bg.jpg" alt="Laundry service" fill className="object-cover object-left" priority />
      </div>

      {/* Right panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white px-10 py-16">
        <div className="w-full max-w-sm">

          {!showForgot ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign In to your Account</h1>
              <p className="text-slate-500 mb-8">Welcome back! please enter your detail</p>

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="Username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition"
                    required autoComplete="email"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition"
                    required autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 accent-teal-600" />
                    Remember me
                  </label>
                  <button type="button" onClick={() => { setShowForgot(true); setFpEmail(email); setFpMsg(null); }}
                    className="text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors">
                    Forgot Password?
                  </button>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg shadow-teal-900/20 disabled:opacity-60">
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { setShowForgot(false); setFpMsg(null); }}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </button>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h1>
              <p className="text-slate-500 mb-8">Enter your email and choose a new password.</p>

              <form onSubmit={onForgot} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={fpEmail}
                    onChange={(e) => setFpEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={fpShowNew ? "text" : "password"}
                    placeholder="New password (min 6 chars)"
                    value={fpNew}
                    onChange={(e) => setFpNew(e.target.value)}
                    className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition"
                    required
                  />
                  <button type="button" onClick={() => setFpShowNew(!fpShowNew)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {fpShowNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={fpConfirm}
                    onChange={(e) => setFpConfirm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition"
                    required
                  />
                </div>

                {fpMsg && (
                  <p className={`text-sm rounded-lg px-3 py-2 border ${fpMsg.type === "ok" ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
                    {fpMsg.text}
                  </p>
                )}

                <button type="submit" disabled={fpLoading}
                  className="w-full py-3.5 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg shadow-teal-900/20 disabled:opacity-60">
                  {fpLoading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


