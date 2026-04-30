"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

const COUNTRIES = [
  "Sri Lanka", "India", "United Kingdom", "United States",
  "Australia", "Canada", "Singapore", "Malaysia", "Other",
];

const SL_STATES = [
  "Western", "Central", "Southern", "Northern", "Eastern",
  "North Western", "North Central", "Uva", "Sabaragamuwa",
];

const inputCls = "flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400";

export default function NewSupplierPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", mobile: "", email: "", phone: "",
    gstNumber: "", taxNumber: "", previousDue: "",
    country: "Sri Lanka", state: "", city: "", postcode: "", address: "",
  });
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    const res = await api("/api/suppliers", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        previousDue: form.previousDue ? Number(form.previousDue) : undefined,
        status: "active",
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setMsg({ type: "err", text: res.error || "Failed to save supplier" });
      return;
    }
    setMsg({ type: "ok", text: "Supplier saved successfully." });
    setForm({ name: "", mobile: "", email: "", phone: "", gstNumber: "", taxNumber: "", previousDue: "", country: "Sri Lanka", state: "", city: "", postcode: "", address: "" });
  }

  return (
    <PageScaffold title="Suppliers" subtitle="Add/Update Supplier">
      <div className="bg-white border border-slate-200 rounded-sm p-6">
        <form onSubmit={submit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-3">
            {/* ── Left column ── */}
            <div className="space-y-3">
              <div className="flex items-center">
                <label className="w-32 text-right pr-4 text-sm text-slate-600 shrink-0">
                  Supplier Name<span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex items-center">
                <label className="w-32 text-right pr-4 text-sm text-slate-600 shrink-0">Mobile</label>
                <input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} className={inputCls} />
              </div>
              <div className="flex items-center">
                <label className="w-32 text-right pr-4 text-sm text-slate-600 shrink-0">Email</label>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
              </div>
              <div className="flex items-center">
                <label className="w-32 text-right pr-4 text-sm text-slate-600 shrink-0">Phone</label>
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
              </div>
              <div className="flex items-center">
                <label className="w-32 text-right pr-4 text-sm text-slate-600 shrink-0">GST Number</label>
                <input value={form.gstNumber} onChange={(e) => set("gstNumber", e.target.value)} className={inputCls} />
              </div>
              <div className="flex items-center">
                <label className="w-32 text-right pr-4 text-sm text-slate-600 shrink-0">TAX Number</label>
                <input value={form.taxNumber} onChange={(e) => set("taxNumber", e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* ── Right column ── */}
            <div className="space-y-3">
              <div className="flex items-center">
                <label className="w-28 text-right pr-4 text-sm text-slate-600 shrink-0">Opening Balance</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.previousDue}
                  onChange={(e) => set("previousDue", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex items-center">
                <label className="w-28 text-right pr-4 text-sm text-slate-600 shrink-0">Country</label>
                <div className="relative flex-1">
                  <select
                    value={form.country}
                    onChange={(e) => set("country", e.target.value)}
                    className="w-full appearance-none border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white pr-7"
                  >
                    {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">▼</span>
                </div>
              </div>
              <div className="flex items-center">
                <label className="w-28 text-right pr-4 text-sm text-slate-600 shrink-0">State</label>
                <div className="relative flex-1">
                  <select
                    value={form.state}
                    onChange={(e) => set("state", e.target.value)}
                    className="w-full appearance-none border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white pr-7"
                  >
                    <option value="">-Select-</option>
                    {SL_STATES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">▼</span>
                </div>
              </div>
              <div className="flex items-center">
                <label className="w-28 text-right pr-4 text-sm text-slate-600 shrink-0">City</label>
                <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls} />
              </div>
              <div className="flex items-center">
                <label className="w-28 text-right pr-4 text-sm text-slate-600 shrink-0">Postcode</label>
                <input value={form.postcode} onChange={(e) => set("postcode", e.target.value)} className={inputCls} />
              </div>
              <div className="flex items-start">
                <label className="w-28 text-right pr-4 text-sm text-slate-600 shrink-0 pt-2">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  rows={3}
                  className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 resize-y"
                />
              </div>
            </div>
          </div>

          {msg && (
            <div
              className={`mt-4 px-3 py-2 rounded text-sm ${
                msg.type === "ok"
                  ? "bg-green-50 text-green-700 border border-green-100"
                  : "bg-red-50 text-red-700 border border-red-100"
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="flex justify-center gap-4 mt-6">
            <button
              type="submit"
              disabled={saving}
              className="w-44 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded text-sm disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/suppliers/list")}
              className="w-44 py-2.5 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </PageScaffold>
  );
}
