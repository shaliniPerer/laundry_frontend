"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center py-8 px-4"
      style={{ background: "linear-gradient(135deg, #e8f4f5 0%, #d4eaec 50%, #c8e4e6 100%)" }}
    >
      {/* Main card */}
      <div className="w-full max-w-5xl flex rounded-2xl overflow-hidden shadow-2xl" style={{ minHeight: 700 }}>

        {/* ── LEFT PANEL ── */}
        <div
          className="hidden md:flex flex-col w-[58%] p-8"
          style={{ background: "linear-gradient(160deg, #4a8e91 0%, #3a7679 35%, #2b5f63 70%, #1e4a4d 100%)" }}
        >
          

          {/* Heading */}
          <h1 className="text-3xl font-bold text-white leading-tight mb-3">
            Cimpos Laundry Management System
          </h1>
          <p className="text-white/75 text-sm leading-relaxed mb-6">
            A complete business management platform for laundries to handle POS billing, orders,
            customers, payments, expenses, reports, and SMS updates in one secure dashboard.
          </p>

          {/* Feature cards */}
          <div className="flex flex-col gap-3 flex-1">
            {/* Full-width card */}
            <FeatureCard letter="S" title="Not just a laundry name">
              Cimpos is the software provider. Each laundry signs in to its own business dashboard.
            </FeatureCard>

            {/* 2-col row */}
            <div className="grid grid-cols-2 gap-3">
              <FeatureCard letter="P" title="POS billing & order management">
                Create invoices, manage order pickup, handover, processing, finished, and delivered stages.
              </FeatureCard>
              <FeatureCard letter="M" title="Automatic customer SMS updates">
                Send messages when an order is accepted, finished, ready, or collected by the customer.
              </FeatureCard>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FeatureCard letter="C" title="Customer filtering & insights">
                Find top customers by sales, invoice count, monthly activity, and payment history.
              </FeatureCard>
              <FeatureCard letter="T" title="Clear payment tracking">
                Track cash, card, and online transfer payments separately without mixing daily totals.
              </FeatureCard>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FeatureCard letter="I" title="Services, items & pricing">
                Add Dry Cleaning, Wash & Dry, Dry Only, Wash Only, Press Only, and item-level prices.
              </FeatureCard>
              <FeatureCard letter="R" title="Reports, expenses & user roles">
                View invoice, item sales, payment, expense, additional charge reports, and manage user roles.
              </FeatureCard>
            </div>

          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="w-full md:w-[42%] bg-white flex flex-col">
          <div className="flex-1 flex flex-col justify-center px-10 py-10">

            {/* Logo */}
            <div className="flex justify-center mb-8">
              <img src="/logo_bg.png" alt="Logo" className="h-16 w-auto object-contain" />
            </div>

            {/* Business account section */}
            <div className="flex items-center gap-4 mb-7">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl shrink-0 text-white text-2xl font-black shadow-md"
                style={{ background: "linear-gradient(135deg, #4a9ea1 0%, #2b5f63 100%)" }}>
                C
              </div>
              <div>
                <p className="text-[10px] text-teal-600 uppercase tracking-widest font-semibold mb-0.5">
                  Demo Laundry Account
                </p>
                <h2 className="text-2xl font-bold text-slate-900 leading-tight">Cimpos Laundry</h2>
                <p className="text-sm text-slate-500 mt-0.5">Sign in to continue to your dashboard</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-teal-500/40 focus-within:border-teal-500 transition">
                  <span className="px-3 text-slate-400 text-sm">@</span>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 py-2.5 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-white"
                    placeholder="you@company.com"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-teal-500/40 focus-within:border-teal-500 transition">
                  <span className="px-3 text-slate-400 text-sm">*</span>
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-white"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="px-3 text-sm text-slate-500 hover:text-slate-700 transition"
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="pt-1">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 accent-teal-600"
                  />
                  Remember me
                </label>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-semibold text-white text-sm transition-colors disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #4a9ea1 0%, #3a8285 100%)" }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {/* Support info */}
            <div className="mt-6 space-y-2">
              <p className="text-sm text-slate-500">Forgot your password? Contact Cimpos Support.</p>
              <a
                href="tel:+94703534456"
                className="flex items-center px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition"
              >
                Phone/WhatsApp: +94 70 353 4456
              </a>
              <a
                href="mailto:support@cimpos.lk"
                className="flex items-center px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition"
              >
                support@cimpos.lk
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Page footer */}
      <p className="mt-6 text-xs text-slate-500 text-center">
        Cimpos is a division of{" "}
        <a href="https://clickinmo.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-teal-600 transition-colors">
          Click Inmo (Pvt) Ltd
        </a>
        .&nbsp;&nbsp;Version 1.0.0&nbsp;&nbsp;&nbsp;© 2026 Cimpos. All rights reserved.
      </p>
    </div>
  );
}

function FeatureCard({
  letter,
  title,
  children,
}: {
  letter: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: "rgba(255,255,255,0.10)" }}
    >
      <div className="flex items-start gap-2 mb-1">
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold text-white shrink-0 mt-0.5"
          style={{ background: "rgba(255,255,255,0.20)" }}
        >
          {letter}
        </span>
        <span className="text-white text-sm font-semibold leading-snug">{title}</span>
      </div>
      <p className="text-white/65 text-xs leading-relaxed pl-7">{children}</p>
    </div>
  );
}
