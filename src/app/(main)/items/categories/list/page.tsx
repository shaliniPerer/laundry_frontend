"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, X } from "lucide-react";
import { PageScaffold } from "@/components/PageScaffold";
import { DropdownMenu } from "@/components/DropdownMenu";
import { api } from "@/lib/api";

type Category = {
  pk: string;
  categoryCode?: string;
  name: string;
  description?: string;
};

export default function CategoryListPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [_openActionId, setOpenActionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [editForm, setEditForm] = useState<Partial<Category>>({});
  const [editSaving, setEditSaving] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  const CAT_COLS = ["Service Code", "Service Name", "Description"];
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [showColPicker, setShowColPicker] = useState(false);
  const colPickerRef = useRef<HTMLDivElement>(null);
  const vis = (col: string) => !hiddenCols.has(col);
  function toggleCol(col: string) {
    setHiddenCols(prev => { const next = new Set(prev); next.has(col) ? next.delete(col) : next.add(col); return next; });
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api<{ categories: Category[] }>("/api/items/categories?kind=item");
    setLoading(false);
    if (res.ok && res.data?.categories) {
      setCategories(res.data.categories.filter((c) => c.pk?.startsWith("CATEGORY#")));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function handler(event: MouseEvent) {
      if (actionMenuRef.current?.contains(event.target as Node)) return;
      setOpenActionId(null);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setShowColPicker(false);
    }
    if (showColPicker) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColPicker]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return categories.filter(
      (c) =>
        !q ||
        (c.name || "").toLowerCase().includes(q) ||
        (c.categoryCode || "").toLowerCase().includes(q)
    );
  }, [categories, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const allPageSelected = paginated.length > 0 && paginated.every(c => selectedIds.has(c.pk));
  function toggleAll() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) paginated.forEach(c => next.delete(c.pk));
      else paginated.forEach(c => next.add(c.pk));
      return next;
    });
  }
  function toggleId(pk: string) {
    setSelectedIds(prev => { const next = new Set(prev); next.has(pk) ? next.delete(pk) : next.add(pk); return next; });
  }
  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} selected item(s)? This cannot be undone.`)) return;
    for (const pk of selectedIds) await api(`/api/items/categories/${pk.replace("CATEGORY#", "")}`, { method: "DELETE" });
    setSelectedIds(new Set());
    load();
  }

  async function deleteCategory(c: Category) {
    if (!confirm(`Delete "${c.name}"?`)) return;
    const id = c.pk.replace("CATEGORY#", "");
    const res = await api(`/api/items/categories/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setCategories((prev) => prev.filter((x) => x.pk !== c.pk));
    setOpenActionId(null);
  }

  function openEdit(c: Category) {
    setEditCat(c);
    setEditForm({ ...c });
    setOpenActionId(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editCat) return;
    setEditSaving(true);
    const id = editCat.pk.replace("CATEGORY#", "");
    const payload = {
      name: editForm.name?.trim() || "",
      description: editForm.description?.trim() || "",
    };
    const res = await api(`/api/items/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    setEditSaving(false);
    if (!res.ok) return;
    setCategories((prev) => prev.map((c) => (c.pk === editCat.pk ? { ...c, ...payload } : c)));
    setEditCat(null);
  }

  function downloadCSV() {
    const header = "Service Code,Service Name,Description";
    const rows = filtered.map((c) =>
      [`"${c.categoryCode || ""}"`, `"${c.name}"`, `"${c.description || ""}"`].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "services.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function xmlEsc(s: string) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  function downloadExcel() {
    const cols = CAT_COLS.filter(vis);
    let xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Services"><Table>`;
    xml += `<Row>${cols.map(c => `<Cell><Data ss:Type="String">${xmlEsc(c)}</Data></Cell>`).join("")}</Row>`;
    filtered.forEach(c => {
      xml += `<Row>`;
      if (vis("Service Code")) xml += `<Cell><Data ss:Type="String">${xmlEsc(c.categoryCode||"")}</Data></Cell>`;
      if (vis("Service Name")) xml += `<Cell><Data ss:Type="String">${xmlEsc(c.name)}</Data></Cell>`;
      if (vis("Description")) xml += `<Cell><Data ss:Type="String">${xmlEsc(c.description||"")}</Data></Cell>`;
      xml += `</Row>`;
    });
    xml += `</Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "services.xls"; a.click();
    URL.revokeObjectURL(url);
  }

  function printTable() {
    const cols = CAT_COLS.filter(vis);
    const rows = filtered.map(c => {
      const cells: string[] = [];
      if (vis("Service Code")) cells.push(c.categoryCode||"");
      if (vis("Service Name")) cells.push(c.name);
      if (vis("Description")) cells.push(c.description||"");
      return cells;
    });
    const html = `<!DOCTYPE html><html><head><title>Services</title><style>body{font-family:sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}th{background:#1d4ed8;color:#fff}</style></head><body><h2 style="margin-bottom:8px">Service List</h2><table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const win = window.open("","_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  }

  const pageButtons = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  }, [page, totalPages]);

  return (
    <PageScaffold title="Service List" subtitle="View/Search Services">
      <div className="bg-white border border-slate-200 rounded-sm">
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Service List</h2>
          <Link href="/items/categories/new" className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded transition-colors">
            + Add Service
          </Link>
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
            {[{ label: "Copy", fn: () => navigator.clipboard.writeText(filtered.map((c) => `${c.categoryCode || ""}\t${c.name}`).join("\n")) },
              { label: "Excel", fn: downloadExcel }, { label: "PDF", fn: printTable },
              { label: "Print", fn: printTable }, { label: "CSV", fn: downloadCSV }].map((btn) => (
              <button type="button" key={btn.label} onClick={btn.fn} className={{"Copy":"bg-slate-600 hover:bg-slate-700","Excel":"bg-green-600 hover:bg-green-700","PDF":"bg-red-500 hover:bg-red-600","Print":"bg-slate-700 hover:bg-slate-800","CSV":"bg-green-700 hover:bg-green-800"}[btn.label]+" text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"}>{btn.label}</button>
            ))}

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
                {vis("Service Code") && <th className="px-3 py-2.5 font-semibold text-left">Service Code</th>}
                {vis("Service Name") && <th className="px-3 py-2.5 font-semibold text-left">Service Name</th>}
                {vis("Description") && <th className="px-3 py-2.5 font-semibold text-left">Description</th>}
                <th className="px-3 py-2.5 font-semibold text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center text-slate-400 text-sm">Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center text-slate-400 text-sm">No services found</td></tr>
              ) : paginated.map((c, i) => (
                <tr key={c.pk} className={`border-t border-slate-100 hover:bg-blue-50/30 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                  <td className="px-3 py-2 text-center"><input type="checkbox" checked={selectedIds.has(c.pk)} onChange={() => toggleId(c.pk)} /></td>
                  {vis("Service Code") && <td className="px-3 py-2 font-mono text-xs text-slate-600">{c.categoryCode || "-"}</td>}
                  {vis("Service Name") && <td className="px-3 py-2 font-medium text-slate-800">{c.name}</td>}
                  {vis("Description") && <td className="px-3 py-2 text-slate-500 text-xs">{c.description || "-"}</td>}
                  <td className="px-3 py-2">
                    <DropdownMenu>
                      <button type="button" onClick={() => openEdit(c)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><Pencil className="w-3.5 h-3.5 text-teal-600" /> Edit</button>
                      <button type="button" onClick={() => deleteCategory(c)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-red-600 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 text-sm text-slate-500">
          <div>{loading ? "Loading..." : `Showing ${filtered.length === 0 ? 0 : (page - 1) * perPage + 1} to ${Math.min(page * perPage, filtered.length)} of ${filtered.length} entries`}</div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPage(1)} disabled={page === 1} className="px-3 py-1 border border-slate-200 rounded text-xs disabled:opacity-40 hover:bg-slate-50">Previous</button>
            {pageButtons.map((p) => <button type="button" key={p} onClick={() => setPage(p)} className={`px-3 py-1 border rounded text-xs ${p === page ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 hover:bg-slate-50"}`}>{p}</button>)}
            <button type="button" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="px-3 py-1 border border-slate-200 rounded text-xs disabled:opacity-40 hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>

      {editCat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">Edit Service</h2>
              <button type="button" onClick={() => setEditCat(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={saveEdit} className="p-5 space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Service Name*</label>
                <input required value={editForm.name || ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Description</label>
                <textarea value={editForm.description || ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setEditCat(null)} className="px-4 py-2 border border-slate-300 rounded text-sm hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={editSaving} className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-semibold disabled:opacity-60">{editSaving ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageScaffold>
  );
}
