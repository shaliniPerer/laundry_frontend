"use client";

import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

const INSTRUCTIONS = [
  { col: "Item Name", req: true, desc: "Name of the item" },
  { col: "Service", req: false, desc: "Must match an existing brand/service" },
  { col: "Laundry Type", req: true, desc: "Must match an existing category" },
  { col: "Unit", req: true, desc: "e.g. Pieces, Kg, Pair, Set" },
  { col: "Price", req: true, desc: "Service price" },
];

const EXAMPLE_HEADERS = INSTRUCTIONS.map((i) => i.col).join(",");
const EXAMPLE_ROW = "Sample Item,Wash & Fold,Shirts,Pieces,120.00";

export default function ImportItemsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [importing, setImporting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setMsg({ type: "err", text: "Please select a CSV file." }); return; }
    setMsg(null);
    setImporting(true);
    const text = await file.text();
    const lines = text.trim().split("\n").filter(Boolean);
    if (lines.length < 2) { setMsg({ type: "err", text: "CSV has no data rows." }); setImporting(false); return; }
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",");
      return {
        name: cols[0]?.trim(),
        brandName: cols[1]?.trim(),
        categoryName: cols[2]?.trim(),
        unit: cols[3]?.trim(),
        price: Number(cols[4]) || 0,
      };
    });
    let success = 0;
    for (const row of rows) {
      if (!row.name) continue;
      const res = await api("/api/items", { method: "POST", body: JSON.stringify(row) });
      if (res.ok) success++;
    }
    setImporting(false);
    setMsg({ type: "ok", text: `Imported ${success} of ${rows.length} item(s) successfully.` });
  }

  function downloadExample() {
    const blob = new Blob([[EXAMPLE_HEADERS, EXAMPLE_ROW].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "items_example.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageScaffold title="Import Items" subtitle="Bulk import items from CSV">
      <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-6">
        <p className="text-sm font-semibold text-slate-700">Please Enter Valid Data</p>
        <form onSubmit={submit} className="max-w-lg space-y-4">
          <div className="flex items-start">
            <label className="w-36 text-right pr-4 text-sm text-slate-600 shrink-0 pt-1.5">Import Items<span className="text-red-500">*</span></label>
            <div className="flex-1 space-y-1">
              <input ref={fileRef} type="file" accept=".csv" className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm text-slate-500 bg-white file:mr-2 file:text-xs file:bg-teal-500 file:text-white file:border-0 file:rounded file:px-2 file:py-1 cursor-pointer" />
              <p className="text-xs text-slate-400">File must be in CSV format.</p>
            </div>
          </div>
          {msg && <div className={`px-3 py-2 rounded text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>{msg.text}</div>}
          <div className="flex justify-center gap-4 pt-2">
            <button type="submit" disabled={importing} className="w-44 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded text-sm disabled:opacity-60 transition-colors">{importing ? "Importing…" : "Import"}</button>
            <button type="button" onClick={() => router.push("/items/list")} className="w-44 py-2.5 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded text-sm transition-colors">Close</button>
          </div>
        </form>

        {/* Import Instructions */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Import Instructions</h3>
          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white text-xs">
                  {["#", "Column Name", "Value", "Description"].map((h) => (
                    <th key={h} className="px-3 py-2.5 font-semibold text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INSTRUCTIONS.map((row, i) => (
                  <tr key={row.col} className={`border-t border-slate-100 ${i % 2 === 1 ? "bg-slate-50" : ""}`}>
                    <td className="px-3 py-2 text-slate-500 text-xs w-8">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{row.col}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${row.req ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{row.req ? "Required" : "Optional"}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <button onClick={downloadExample} type="button" className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold px-4 py-2 rounded transition-colors">
              <Download className="w-4 h-4" /> Download Example Format
            </button>
          </div>
        </div>
      </div>
    </PageScaffold>
  );
}
