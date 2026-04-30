"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

const COLUMNS = [
  { name: "Customer Name", required: true },
  { name: "Mobile", required: false },
  { name: "Email", required: false },
  { name: "Phone", required: false },
  { name: "Country Name", required: false },
  { name: "City", required: false },
  { name: "Address", required: false },
  { name: "Opening Balance", required: false },
];

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
}

export default function ImportCustomersPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [importing, setImporting] = useState(false);

  function downloadExample() {
    const header = COLUMNS.map((c) => c.name).join(",");
    const example = "John Doe,0771234567,john@example.com,0771234567,Sri Lanka,Colombo,123 Main St,500";
    const blob = new Blob([[header, example].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "customers_example.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setMsg({ type: "err", text: "Please choose a CSV file." }); return; }
    setImporting(true);
    setMsg(null);
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length === 0) {
      setMsg({ type: "err", text: "No valid rows found in CSV file." });
      setImporting(false);
      return;
    }
    const rows = parsed
      .map((row) => ({
        name: row["Customer Name"] || row["name"] || "",
        mobile: row["Mobile"] || row["mobile"] || "",
        email: row["Email"] || row["email"] || "",
        phone: row["Phone"] || row["phone"] || "",
        country: row["Country Name"] || "",
        city: row["City"] || row["city"] || "",
        address: row["Address"] || row["address"] || "",
        previousDue: row["Opening Balance"] ? Number(row["Opening Balance"]) : undefined,
        status: "active",
      }))
      .filter((r) => r.name);

    const res = await api<{ imported: number }>("/api/customers/import", {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
    setImporting(false);
    if (!res.ok) { setMsg({ type: "err", text: res.error || "Import failed." }); return; }
    setMsg({ type: "ok", text: `Successfully imported ${res.data?.imported ?? 0} customers.` });
    if (fileRef.current) fileRef.current.value = "";
    setFileName("");
  }

  return (
    <PageScaffold title="Import Customers" subtitle="Add/Update Customer">
      {/* Upload form */}
      <div className="bg-white border border-slate-200 rounded-sm p-6 mb-6">
        <p className="text-sm font-semibold text-slate-700 mb-5">Please Enter Valid Data</p>
        <form onSubmit={handleImport}>
          <div className="flex items-start gap-4 mb-6">
            <label className="text-sm text-slate-600 shrink-0 pt-1.5 w-36 text-right">
              Import Customers<span className="text-red-500">*</span>
            </label>
            <div className="space-y-1.5">
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
                className="text-sm file:mr-3 file:py-1.5 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              />
              <p className="text-xs text-red-500">Note: File must be in CSV format.</p>
              {fileName && <p className="text-xs text-slate-500">Selected: {fileName}</p>}
            </div>
          </div>

          {msg && (
            <div
              className={`mb-4 px-3 py-2 rounded text-sm ${
                msg.type === "ok"
                  ? "bg-green-50 text-green-700 border border-green-100"
                  : "bg-red-50 text-red-700 border border-red-100"
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={importing}
              className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-8 py-2.5 rounded disabled:opacity-60 transition-colors"
            >
              {importing ? "Importing…" : "⊕ Import"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/customers/list")}
              className="bg-amber-400 hover:bg-amber-500 text-white text-sm font-bold px-8 py-2.5 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </form>
      </div>

      {/* Import instructions */}
      <div className="bg-white border border-slate-200 rounded-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">Import Instructions</h3>
          <button
            onClick={downloadExample}
            className="bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-semibold px-4 py-2 rounded transition-colors"
          >
            Download Example Format
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-600 text-white text-xs">
              <th className="px-4 py-2.5 font-semibold text-left w-16">#</th>
              <th className="px-4 py-2.5 font-semibold text-left">Column Name</th>
              <th className="px-4 py-2.5 font-semibold text-left">Value</th>
            </tr>
          </thead>
          <tbody>
            {COLUMNS.map((col, i) => (
              <tr key={col.name} className={`border-t border-slate-100 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                <td className="px-4 py-2.5 text-slate-500">{i + 1}</td>
                <td className="px-4 py-2.5 text-slate-700">{col.name}</td>
                <td className="px-4 py-2.5">
                  {col.required ? (
                    <span className="bg-green-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded">
                      Required
                    </span>
                  ) : (
                    <span className="bg-slate-200 text-slate-600 text-xs font-semibold px-2.5 py-0.5 rounded">
                      Optional
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageScaffold>
  );
}
