"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, X } from "lucide-react";
import { PageScaffold } from "@/components/PageScaffold";
import { DropdownMenu } from "@/components/DropdownMenu";
import { api } from "@/lib/api";
import { DateInput } from "@/components/DateInput";

type Expense = {
  pk: string;
  date: string;
  categoryId?: string;
  categoryName?: string;
  referenceNo?: string;
  expenseFor?: string;
  amount: number;
  note?: string;
  createdBy?: string;
  attachment?: {
    fileName: string;
    mimeType: string;
    size: number;
    url: string;
  };
};
type Category = { pk: string; name: string };
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function fmtDate(d: string) {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return d;
}

function attachmentHref(url?: string) {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_BASE}${url}`;
}

export default function ExpenseListPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [_openActionId, setOpenActionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editExp, setEditExp] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState<Partial<Expense>>({});
  const [editSaving, setEditSaving] = useState(false);

  const EXPENSE_COLS = ["Date", "Category", "Reference No.", "Expense for", "Amount", "Note", "Attachment", "Created by"];
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [showColPicker, setShowColPicker] = useState(false);
  const colPickerRef = useRef<HTMLDivElement>(null);
  const vis = (col: string) => !hiddenCols.has(col);
  function toggleCol(col: string) {
    setHiddenCols(prev => { const next = new Set(prev); next.has(col) ? next.delete(col) : next.add(col); return next; });
  }

  const load = useCallback(async () => {
    setLoading(true);
    const [expRes, catRes] = await Promise.all([
      api<{ expenses: Expense[] }>("/api/expenses"),
      api<{ categories: Category[] }>("/api/expenses/categories/list"),
    ]);
    setLoading(false);
    if (expRes.ok && expRes.data?.expenses) setExpenses(expRes.data.expenses.filter((e) => e.pk?.startsWith("EXPENSE#")));
    if (catRes.ok && catRes.data?.categories) setCategories(catRes.data.categories.filter((c) => c.pk?.startsWith("EXPENSE_CAT#")));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    function handleClickOutside(ev: MouseEvent) {
      if (colPickerRef.current && !colPickerRef.current.contains(ev.target as Node)) setShowColPicker(false);
    }
    if (showColPicker) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColPicker]);

  useEffect(() => {
    function handler() { setOpenActionId(null); }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.pk, c.name])), [categories]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return expenses.filter((e) => {
      return !q ||
        (e.expenseFor || "").toLowerCase().includes(q) ||
        (e.note || "").toLowerCase().includes(q) ||
        (e.referenceNo || "").toLowerCase().includes(q) ||
        (catMap[e.categoryId || ""] || e.categoryName || "").toLowerCase().includes(q);
    });
  }, [expenses, search, catMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalAmount = filtered.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
  const allPageSelected = paginated.length > 0 && paginated.every(e => selectedIds.has(e.pk));
  function toggleAll() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) paginated.forEach(e => next.delete(e.pk));
      else paginated.forEach(e => next.add(e.pk));
      return next;
    });
  }
  function toggleId(pk: string) {
    setSelectedIds(prev => { const next = new Set(prev); next.has(pk) ? next.delete(pk) : next.add(pk); return next; });
  }
  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} selected expense(s)? This cannot be undone.`)) return;
    for (const pk of selectedIds) await api(`/api/expenses/${pk.replace("EXPENSE#", "")}`, { method: "DELETE" });
    setSelectedIds(new Set());
    load();
  }

  async function deleteExp(e: Expense) {
    if (!confirm("Delete this expense?")) return;
    const id = e.pk.replace("EXPENSE#", "");
    await api(`/api/expenses/${id}`, { method: "DELETE" });
    setExpenses((prev) => prev.filter((x) => x.pk !== e.pk));
    setOpenActionId(null);
  }

  function openEdit(e: Expense) {
    setEditExp(e);
    setEditForm({ ...e });
    setOpenActionId(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editExp) return;
    setEditSaving(true);
    const id = editExp.pk.replace("EXPENSE#", "");
    const selectedCat = categories.find((c) => c.pk === editForm.categoryId);
    const res = await api(`/api/expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ ...editForm, categoryName: selectedCat?.name }),
    });
    setEditSaving(false);
    if (!res.ok) return;
    setExpenses((prev) => prev.map((x) => (x.pk === editExp.pk ? { ...x, ...editForm, categoryName: selectedCat?.name } : x)));
    setEditExp(null);
  }

  function downloadCSV() {
    const header = "Date,Category,Reference No.,Expense for,Amount,Note,Attachment,Created by";
    const rows = filtered.map((e) => [
      fmtDate(e.date),
      `"${catMap[e.categoryId || ""] || e.categoryName || ""}"`,
      `"${e.referenceNo || ""}"`,
      `"${e.expenseFor || ""}"`,
      Number(e.amount ?? 0).toFixed(2),
      `"${e.note || ""}"`,
      `"${e.attachment?.fileName || ""}"`,
      e.createdBy || "",
    ].join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "expenses.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function xmlEsc(s: string) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  function downloadExcel() {
    const cols = EXPENSE_COLS.filter(vis);
    let xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Expenses"><Table>`;
    xml += `<Row>${cols.map(c => `<Cell><Data ss:Type="String">${xmlEsc(c)}</Data></Cell>`).join("")}</Row>`;
    filtered.forEach(e => {
      xml += `<Row>`;
      if (vis("Date")) xml += `<Cell><Data ss:Type="String">${xmlEsc(fmtDate(e.date))}</Data></Cell>`;
      if (vis("Category")) xml += `<Cell><Data ss:Type="String">${xmlEsc(catMap[e.categoryId||""]||e.categoryName||"")}</Data></Cell>`;
      if (vis("Reference No.")) xml += `<Cell><Data ss:Type="String">${xmlEsc(e.referenceNo||"")}</Data></Cell>`;
      if (vis("Expense for")) xml += `<Cell><Data ss:Type="String">${xmlEsc(e.expenseFor||"")}</Data></Cell>`;
      if (vis("Amount")) xml += `<Cell><Data ss:Type="Number">${Number(e.amount??0).toFixed(2)}</Data></Cell>`;
      if (vis("Note")) xml += `<Cell><Data ss:Type="String">${xmlEsc(e.note||"")}</Data></Cell>`;
      if (vis("Attachment")) xml += `<Cell><Data ss:Type="String">${xmlEsc(e.attachment?.fileName||"")}</Data></Cell>`;
      if (vis("Created by")) xml += `<Cell><Data ss:Type="String">${xmlEsc(e.createdBy||"")}</Data></Cell>`;
      xml += `</Row>`;
    });
    xml += `</Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "expenses.xls"; a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPDF() {
    const cols = EXPENSE_COLS.filter(vis);
    const rows = filtered.map(e => {
      const cells: string[] = [];
      if (vis("Date")) cells.push(fmtDate(e.date));
      if (vis("Category")) cells.push(catMap[e.categoryId||""]||e.categoryName||"");
      if (vis("Reference No.")) cells.push(e.referenceNo||"");
      if (vis("Expense for")) cells.push(e.expenseFor||"");
      if (vis("Amount")) cells.push(Number(e.amount??0).toFixed(2));
      if (vis("Note")) cells.push(e.note||"");
      if (vis("Attachment")) cells.push(e.attachment?.fileName||"");
      if (vis("Created by")) cells.push(e.createdBy||"");
      return cells;
    });
    const html = `<!DOCTYPE html><html><head><title>Expenses</title><style>body{font-family:sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}th{background:#1d4ed8;color:#fff}</style></head><body><h2 style="margin-bottom:8px">Expenses List</h2><table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const win = window.open("","_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  }

  const pageButtons = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  }, [page, totalPages]);

  return (
    <PageScaffold title="Expenses List" subtitle="View/Search Expenses">
      <div className="bg-white border border-slate-200 rounded-sm">
        <div className="px-4 py-3 flex items-center justify-end border-b border-slate-200">
          <Link href="/expenses/new" className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded transition-colors">+ New Expense</Link>
        </div>

        <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Show</span>
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="border border-slate-300 rounded px-2 py-1 text-sm bg-white outline-none">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>entries</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[{ label: "Copy", fn: () => navigator.clipboard.writeText(filtered.map((e) => `${fmtDate(e.date)}\t${e.expenseFor}\t${e.amount}`).join("\n")) },
              { label: "Excel", fn: downloadExcel }, { label: "PDF", fn: downloadPDF },
              { label: "Print", fn: downloadPDF }, { label: "CSV", fn: downloadCSV }].map((btn) => (
              <button key={btn.label} onClick={btn.fn} className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors">{btn.label}</button>
            ))}
            <div className="relative" ref={colPickerRef}>
              <button onClick={() => setShowColPicker(p => !p)} className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors">Columns</button>
              {showColPicker && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg z-20 py-1 min-w-44">
                  {EXPENSE_COLS.map(col => (
                    <label key={col} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={vis(col)} onChange={() => toggleCol(col)} className="accent-teal-600" />
                      {col}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {selectedIds.size > 0 && (
              <button type="button" onClick={handleBulkDelete} className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedIds.size})
              </button>
            )}
            <div className="flex items-center gap-1 ml-1">
              <span className="text-sm text-slate-600">Search:</span>
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400 w-36" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white text-xs">
                <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={allPageSelected} onChange={toggleAll} /></th>
                {vis("Date") && <th className="px-3 py-2.5 font-semibold text-left">Date</th>}
                {vis("Category") && <th className="px-3 py-2.5 font-semibold text-left">Category</th>}
                {vis("Reference No.") && <th className="px-3 py-2.5 font-semibold text-left">Reference No.</th>}
                {vis("Expense for") && <th className="px-3 py-2.5 font-semibold text-left">Expense for</th>}
                {vis("Amount") && <th className="px-3 py-2.5 font-semibold text-left">Amount</th>}
                {vis("Note") && <th className="px-3 py-2.5 font-semibold text-left">Note</th>}
                {vis("Attachment") && <th className="px-3 py-2.5 font-semibold text-left">Attachment</th>}
                {vis("Created by") && <th className="px-3 py-2.5 font-semibold text-left">Created by</th>}
                <th className="px-3 py-2.5 font-semibold text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-16 text-center text-slate-400 text-sm">Loading…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-16 text-center text-slate-400 text-sm">No expenses found</td></tr>
              ) : paginated.map((e, i) => (
                <tr key={e.pk} className={`border-t border-slate-100 hover:bg-blue-50/30 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                  <td className="px-3 py-2 text-center"><input type="checkbox" checked={selectedIds.has(e.pk)} onChange={() => toggleId(e.pk)} /></td>
                  {vis("Date") && <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{fmtDate(e.date)}</td>}
                  {vis("Category") && <td className="px-3 py-2 text-slate-700">{catMap[e.categoryId || ""] || e.categoryName || "—"}</td>}
                  {vis("Reference No.") && <td className="px-3 py-2 text-slate-500 text-xs">{e.referenceNo || ""}</td>}
                  {vis("Expense for") && <td className="px-3 py-2 text-slate-700">{e.expenseFor || "—"}</td>}
                  {vis("Amount") && <td className="px-3 py-2 font-medium text-slate-800">{Number(e.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
                  {vis("Note") && <td className="px-3 py-2 text-slate-500 text-xs max-w-xs truncate">{e.note || ""}</td>}
                  {vis("Attachment") && <td className="px-3 py-2 text-xs">
                    {e.attachment?.url ? (
                      <a href={attachmentHref(e.attachment.url)} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 hover:underline">
                        {e.attachment.fileName || "Open file"}
                      </a>
                    ) : "-"}
                  </td>}
                  {vis("Created by") && <td className="px-3 py-2 text-slate-500 text-xs">{e.createdBy || ""}</td>}
                  <td className="px-3 py-2">
                    <DropdownMenu>
                      <button onClick={() => openEdit(e)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><Pencil className="w-3.5 h-3.5 text-teal-600" /> Edit</button>
                      <button onClick={() => deleteExp(e)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-red-600 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
            {!loading && filtered.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300">
                  <td colSpan={1 + ["Date", "Category", "Reference No.", "Expense for"].filter(vis).length} className="px-3 py-2.5 text-right font-semibold text-slate-700 text-sm">Total</td>
                  {vis("Amount") && <td className="px-3 py-2.5 font-bold text-slate-800">{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>}
                  <td colSpan={["Note", "Attachment", "Created by"].filter(vis).length + 1} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 text-sm text-slate-500">
          <div>{loading ? "Loading…" : `Showing ${filtered.length === 0 ? 0 : (page - 1) * perPage + 1} to ${Math.min(page * perPage, filtered.length)} of ${filtered.length} entries`}</div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1} className="px-3 py-1 border border-slate-200 rounded text-xs disabled:opacity-40 hover:bg-slate-50">Previous</button>
            {pageButtons.map((p) => <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 border rounded text-xs ${p === page ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 hover:bg-slate-50"}`}>{p}</button>)}
            <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="px-3 py-1 border border-slate-200 rounded text-xs disabled:opacity-40 hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>

      {editExp && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">Edit Expense</h2>
              <button onClick={() => setEditExp(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={saveEdit} className="p-5 grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-slate-500 mb-1 block">Date*</label>
                <DateInput required value={editForm.date || ""} onChange={(v) => setEditForm((f) => ({ ...f, date: v }))} className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-slate-500 mb-1 block">Reference No.</label>
                <input value={editForm.referenceNo || ""} onChange={(e) => setEditForm((f) => ({ ...f, referenceNo: e.target.value }))} className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-slate-500 mb-1 block">Category*</label>
                <select required value={editForm.categoryId || ""} onChange={(e) => setEditForm((f) => ({ ...f, categoryId: e.target.value }))} className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white">
                  <option value="">-Select-</option>
                  {categories.map((c) => <option key={c.pk} value={c.pk}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-slate-500 mb-1 block">Amount*</label>
                <input required type="number" min={0} step={0.01} value={editForm.amount ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, amount: Number(e.target.value) }))} className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-slate-500 mb-1 block">Expense for*</label>
                <input required value={editForm.expenseFor || ""} onChange={(e) => setEditForm((f) => ({ ...f, expenseFor: e.target.value }))} className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Note</label>
                <textarea value={editForm.note || ""} onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))} rows={2} className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div className="col-span-2 flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setEditExp(null)} className="px-4 py-2 border border-slate-300 rounded text-sm hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={editSaving} className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-semibold disabled:opacity-60">{editSaving ? "Saving…" : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageScaffold>
  );
}
