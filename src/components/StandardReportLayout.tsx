"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ChevronDown } from "lucide-react";
import { PageScaffold } from "@/components/PageScaffold";
import { DateInput } from "@/components/DateInput";

export type ReportColumn = { key: string; label: string; right?: boolean };

export type ReportFilter = {
  key: string;
  label: string;
  type?: "date" | "text" | "select";
  placeholder?: string;
  options?: string[];
  fetchOptions?: () => Promise<string[]>;
  defaultValue?: string;
};

type ReportRow = Record<string, string | number | undefined>;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function StandardReportLayout({
  title,
  filters,
  columns,
  fetchData,
}: {
  title: string;
  filters: ReportFilter[];
  columns: ReportColumn[];
  fetchData: (form: Record<string, string>) => Promise<ReportRow[]>;
}) {
  const router = useRouter();

  const initForm: Record<string, string> = {};
  for (const f of filters) {
    if (f.defaultValue !== undefined) {
      initForm[f.key] = f.defaultValue;
    } else {
      initForm[f.key] = f.type === "date" ? todayISO() : (f.options?.[0] ?? "");
    }
  }

  const [form, setForm] = useState<Record<string, string>>(initForm);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);
  const [dynOptions, setDynOptions] = useState<Record<string, string[]>>({});

  // Load dynamic options for filters that have fetchOptions
  useEffect(() => {
    for (const f of filters) {
      if (f.fetchOptions) {
        f.fetchOptions().then((opts) => {
          const sorted = opts.filter(Boolean).sort();
          if (f.type === "select") {
            const withAll = ["-All-", ...sorted];
            setDynOptions((prev) => ({ ...prev, [f.key]: withAll }));
            setForm((prev) => ({ ...prev, [f.key]: prev[f.key] || "-All-" }));
          } else {
            // text with fetchOptions — populate datalist only, don't override form value
            setDynOptions((prev) => ({ ...prev, [f.key]: sorted }));
          }
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleShow(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await fetchData(form);
    setRows(result);
    setShown(true);
    setLoading(false);
  }

  function downloadCSV() {
    const header = columns.map((c) => c.label).join(",");
    const rowsText = rows.map((r) => columns.map((c) => `"${String(r[c.key] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([[header, rowsText].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadExcel() {
    const header = columns.map((c) => `<th>${c.label}</th>`).join("");
    const body = rows.map((_, i) =>
      `<tr><td>${i + 1}</td>${columns.map((c) => `<td>${rows[i][c.key] ?? ""}</td>`).join("")}</tr>`
    ).join("");
    const html = `<html><head><meta charset="UTF-8"></head><body><table><thead><tr><th>#</th>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=UTF-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_").toLowerCase()}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPDF() {
    const header = columns.map((c) => `<th style="border:1px solid #999;padding:6px 10px;background:#1d4ed8;color:#fff;white-space:nowrap;font-size:11px">${c.label}</th>`).join("");
    const body = rows.map((_, i) =>
      `<tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"}">${[String(i + 1), ...columns.map((c) => String(rows[i][c.key] ?? ""))].map((v) => `<td style="border:1px solid #ddd;padding:4px 8px;font-size:11px">${v}</td>`).join("")}</tr>`
    ).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
      <style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;margin:16px}h2{margin:0 0 12px;font-size:14px}table{border-collapse:collapse;width:100%}@media print{body{margin:8px}}</style>
      </head><body><h2>${title}</h2>
      <table><thead><tr><th style="border:1px solid #999;padding:6px 10px;background:#1d4ed8;color:#fff;font-size:11px">#</th>${header}</tr></thead><tbody>${body}</tbody></table>
      </body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  }

  function copyToClipboard() {
    const header = columns.map((c) => c.label).join("\t");
    const body = rows.map((r) => columns.map((c) => r[c.key] ?? "").join("\t")).join("\n");
    navigator.clipboard.writeText([header, body].join("\n"));
  }

  function renderField(f: ReportFilter) {
    const inputCls = "flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400";
    if (f.type === "date") {
      return (
        <div className="flex items-center border border-slate-300 rounded overflow-hidden flex-1">
          <span className="px-2.5 py-1.5 bg-slate-50 border-r border-slate-300">
            <Calendar className="w-4 h-4 text-slate-400" />
          </span>
          <DateInput
            value={form[f.key]}
            onChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
            wrapperClassName="flex-1"
            className="w-full px-2 py-1.5 text-sm outline-none bg-transparent"
          />
        </div>
      );
    }
    if (f.type === "select") {
      const opts = dynOptions[f.key] ?? f.options ?? [];
      return (
        <div className="relative flex-1">
          <select
            value={form[f.key]}
            onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
            className={`${inputCls} bg-white appearance-none pr-8`}
          >
            {opts.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      );
    }
    const textSuggestions = f.fetchOptions ? (dynOptions[f.key] ?? []) : [];
    const listId = textSuggestions.length > 0 ? `dl-${f.key}` : undefined;
    return (
      <div className="relative flex-1">
        <input
          value={form[f.key]}
          onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
          placeholder={f.placeholder}
          list={listId}
          className={`${inputCls} ${f.placeholder ? "pr-8" : ""}`}
        />
        {f.placeholder && (
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        )}
        {listId && (
          <datalist id={listId}>
            {textSuggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        )}
      </div>
    );
  }

  // Pair filters for 2-column layout (left, right)
  const pairs: [ReportFilter, ReportFilter | null][] = [];
  for (let i = 0; i < filters.length; i += 2) {
    pairs.push([filters[i], filters[i + 1] ?? null]);
  }

  return (
    <PageScaffold title={title} subtitle="">
      <div className="bg-white border border-slate-200 rounded-sm p-6 mb-4">
        <p className="text-sm font-semibold text-slate-700 mb-5">Please Enter Valid Information</p>
        <form onSubmit={handleShow}>
          <div className="space-y-3 max-w-5xl">
            {pairs.map(([left, right], idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-x-12">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                  <label className="text-sm text-slate-600 sm:w-36 sm:text-right sm:pr-4 sm:shrink-0">{left.label}</label>
                  {renderField(left)}
                </div>
                {right ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                    <label className="text-sm text-slate-600 sm:w-36 sm:text-right sm:pr-4 sm:shrink-0">{right.label}</label>
                    {renderField(right)}
                  </div>
                ) : <div className="hidden sm:block" />}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-44 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded text-sm disabled:opacity-60 transition-colors"
            >
              {loading ? "Loading…" : "Show"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="w-44 py-2.5 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm">
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">Records Table</h3>
          <div className="flex items-center gap-1.5">
            <button
              onClick={copyToClipboard}
              className="bg-slate-600 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1 transition-colors"
              title="Copy to clipboard"
            >Copy</button>
            <button
              onClick={downloadCSV}
              className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1 transition-colors"
            >CSV</button>
            <button
              onClick={downloadExcel}
              className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1 transition-colors"
            >Excel</button>
            <button
              onClick={downloadPDF}
              className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1 transition-colors"
            >PDF</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white text-xs">
                <th className="px-3 py-2.5 font-semibold text-left w-12">#</th>
                {columns.map((c) => (
                  <th key={c.key} className={`px-3 py-2.5 font-semibold ${c.right ? "text-right" : "text-left"}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!shown ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-16 text-center text-slate-400 text-sm">
                    Click &quot;Show&quot; to load results
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-16 text-center text-slate-400 text-sm">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-16 text-center text-slate-400 text-sm">
                    No records found
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i} className={`border-t border-slate-100 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                    <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                    {columns.map((c) => (
                      <td key={c.key} className={`px-3 py-2 text-slate-700 ${c.right ? "text-right" : ""}`}>
                        {row[c.key] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageScaffold>
  );
}
