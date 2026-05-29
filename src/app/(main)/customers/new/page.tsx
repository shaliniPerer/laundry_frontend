"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageScaffold } from "@/components/PageScaffold";
import { DateInput } from "@/components/DateInput";
import { api } from "@/lib/api";

const inputCls =
  "w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400";
const labelCls = "block text-xs font-medium text-slate-600 mb-1";

type CustomerForm = {
  salutation: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  address: string;
  dob: string;
};

const initialForm: CustomerForm = {
  salutation: "Mr",
  firstName: "",
  lastName: "",
  mobile: "",
  email: "",
  address: "",
  dob: "",
};

export default function NewCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState<CustomerForm>(initialForm);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);

    const name = [form.salutation, form.firstName, form.lastName].filter(Boolean).join(" ");

    const res = await api("/api/customers", {
      method: "POST",
      body: JSON.stringify({
        salutation: form.salutation,
        firstName: form.firstName,
        lastName: form.lastName,
        name,
        mobile: form.mobile || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        dob: form.dob || undefined,
        status: "active",
      }),
    });

    setSaving(false);
    if (!res.ok) {
      setMsg({ type: "err", text: res.error || "Failed to save customer" });
      return;
    }

    setMsg({ type: "ok", text: "Customer saved successfully." });
    setForm(initialForm);
  }

  return (
    <PageScaffold title="Customers" subtitle="Add/Update Customer">
      <form onSubmit={submit}>
        <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-5">
          <p className="text-sm font-semibold text-slate-700">Please Enter Valid Data</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Salutation + First Name on same row */}
            <div>
              <label className={labelCls}>
                First Name<span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={form.salutation}
                  onChange={(e) => setField("salutation", e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400 bg-white"
                >
                  <option>Mr</option>
                  <option>Miss</option>
                </select>
                <input
                  required
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Last Name</label>
              <input
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Mobile Number</label>
              <input
                value={form.mobile}
                onChange={(e) => setField("mobile", e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Birthday</label>
              <DateInput
                value={form.dob}
                onChange={(v) => setField("dob", v)}
                className={inputCls}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelCls}>Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                rows={3}
                className={`${inputCls} resize-y`}
              />
            </div>
          </div>

          {msg && (
            <div
              className={`px-3 py-2 rounded text-sm ${
                msg.type === "ok"
                  ? "bg-green-50 text-green-700 border border-green-100"
                  : "bg-red-50 text-red-700 border border-red-100"
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="flex justify-center gap-4 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-44 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded text-sm disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/customers/list")}
              className="w-44 py-2.5 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </form>
    </PageScaffold>
  );
}
