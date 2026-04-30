"use client";

import { useState } from "react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";
import { Download } from "lucide-react";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function OtherReportsPage() {
  const [from, setFrom] = useState(todayISO);
  const [to, setTo] = useState(todayISO);
  const [summary, setSummary] = useState<unknown>(null);

  async function load() {
    const res = await api(`/api/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    if (res.ok) setSummary(res.data);
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(summary ?? {}, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${from}-${to}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageScaffold title="Other reports" subtitle="Summary export — extend with PDF/CSV as needed">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3 items-end bg-white rounded-2xl border border-slate-200 card-shadow p-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <button type="button" onClick={load} className="px-5 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold">
            Load summary
          </button>
          <button
            type="button"
            onClick={downloadJson}
            disabled={!summary}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download JSON
          </button>
        </div>
        {summary ? (
          <pre className="bg-slate-900 text-teal-100 rounded-2xl p-4 text-xs overflow-x-auto card-shadow border border-slate-700">
            {JSON.stringify(summary, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-slate-500">Load a summary to preview and download.</p>
        )}
      </div>
    </PageScaffold>
  );
}
