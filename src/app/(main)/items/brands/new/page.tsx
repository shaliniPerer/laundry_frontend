"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

export default function NewBrandPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    const res = await api("/api/items/brands", { method: "POST", body: JSON.stringify({ name, description }) });
    setSaving(false);
    if (!res.ok) { setMsg({ type: "err", text: res.error || "Failed to save brand" }); return; }
    setMsg({ type: "ok", text: "Brand saved successfully." });
    setName("");
    setDescription("");
  }

  return (
    <PageScaffold title="Brand" subtitle="Add/Update Brand">
      <div className="bg-white border border-slate-200 rounded-sm p-6">
        <p className="text-sm font-semibold text-slate-700 mb-5">Please Enter Valid Data</p>
        <form onSubmit={submit} className="max-w-lg space-y-4">
          <div className="flex items-center">
            <label className="w-36 text-right pr-4 text-sm text-slate-600 shrink-0">Laundry Type<span className="text-red-500">*</span></label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
          </div>
          <div className="flex items-start">
            <label className="w-36 text-right pr-4 text-sm text-slate-600 shrink-0 pt-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 resize-y" />
          </div>
          {msg && <div className={`px-3 py-2 rounded text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>{msg.text}</div>}
          <div className="flex justify-center gap-4 pt-2">
            <button type="submit" disabled={saving} className="w-44 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded text-sm disabled:opacity-60 transition-colors">{saving ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => router.push("/items/brands/list")} className="w-44 py-2.5 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded text-sm transition-colors">Close</button>
          </div>
        </form>
      </div>
    </PageScaffold>
  );
}
