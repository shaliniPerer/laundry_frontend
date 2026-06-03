"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, X } from "lucide-react";
import { PageScaffold } from "@/components/PageScaffold";
import { DropdownMenu } from "@/components/DropdownMenu";
import { api } from "@/lib/api";
import { usePermissions } from "@/components/PermissionsContext";

type Brand = {
  pk: string;
  brandCode?: string;
  name: string;
  description?: string;
};

export default function BrandListPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = usePermissions();
  const [editBrand, setEditBrand] = useState<Brand | null>(null);
  const [editForm, setEditForm] = useState<Partial<Brand>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const BRAND_COLS = ["Laundry Type Code", "Laundry Type Name", "Description"];
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [showColPicker, setShowColPicker] = useState(false);
  const colPickerRef = useRef<HTMLDivElement>(null);
  const vis = (col: string) => !hiddenCols.has(col);
  function toggleCol(col: string) {
    setHiddenCols(prev => { const next = new Set(prev); next.has(col) ? next.delete(col) : next.add(col); return next; });
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api<{ brands: Brand[] }>("/api/items/brands");
    setLoading(false);
    if (res.ok && res.data?.brands) {
      setBrands(res.data.brands.filter((b) => b.pk?.startsWith("BRAND#")));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setShowColPicker(false);
    }
    if (showColPicker) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColPicker]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return brands.filter(
      (b) =>
        !q ||
        (b.name || "").toLowerCase().includes(q) ||
        (b.brandCode || "").toLowerCase().includes(q)
    );
  }, [brands, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const allPageSelected = paginated.length > 0 && paginated.every(b => selectedIds.has(b.pk));
  function toggleAll() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) paginated.forEach(b => next.delete(b.pk));
      else paginated.forEach(b => next.add(b.pk));
      return next;
    });
  }
  function toggleId(pk: string) {
    setSelectedIds(prev => { const next = new Set(prev); next.has(pk) ? next.delete(pk) : next.add(pk); return next; });
  }
  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} selected item(s)? This cannot be undone.`)) return;
    for (const pk of selectedIds) await api(`/api/items/brands/${pk.replace("BRAND#", "")}`, { method: "DELETE" });
    setSelectedIds(new Set());
    load();
  }

  async function deleteBrand(b: Brand) {
    if (!confirm(`Delete "${b.name}"?`)) return;
    const id = b.pk.replace("BRAND#", "");
    const res = await api(`/api/items/brands/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setBrands((prev) => prev.filter((x) => x.pk !== b.pk));
  }

  function openEdit(b: Brand) {
    setEditBrand(b);
    setEditForm({ ...b });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editBrand) return;
    setEditSaving(true);
    const id = editBrand.pk.replace("BRAND#", "");
    const payload = {
      name: editForm.name?.trim() || "",
      description: editForm.description?.trim() || "",
    };
    const res = await api(`/api/items/brands/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    setEditSaving(false);
    if (!res.ok) return;
    setBrands((prev) => prev.map((b) => (b.pk === editBrand.pk ? { ...b, ...payload } : b)));
    setEditBrand(null);
  }

  function downloadCSV() {
    const header = "Laundry Type Code,Laundry Type Name,Description";
    const rows = filtered.map((b) =>
      [`"${b.brandCode || ""}"`, `"${b.name}"`, `"${b.description || ""}"`].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "laundry_types.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function xmlEsc(s: string) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  function downloadExcel() {
    const cols = BRAND_COLS.filter(vis);
    let xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="LaundryTypes"><Table>`;
    xml += `<Row>${cols.map(c => `<Cell><Data ss:Type="String">${xmlEsc(c)}</Data></Cell>`).join("")}</Row>`;
    filtered.forEach(b => {
      xml += `<Row>`;
      if (vis("Laundry Type Code")) xml += `<Cell><Data ss:Type="String">${xmlEsc(b.brandCode||"")}</Data></Cell>`;
      if (vis("Laundry Type Name")) xml += `<Cell><Data ss:Type="String">${xmlEsc(b.name)}</Data></Cell>`;
      if (vis("Description")) xml += `<Cell><Data ss:Type="String">${xmlEsc(b.description||"")}</Data></Cell>`;
      xml += `</Row>`;
    });
    xml += `</Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "laundry_types.xls"; a.click();
    URL.revokeObjectURL(url);
  }

  function printTable() {
    const cols = BRAND_COLS.filter(vis);
    const rows = filtered.map(b => {
      const cells: string[] = [];
      if (vis("Laundry Type Code")) cells.push(b.brandCode||"");
      if (vis("Laundry Type Name")) cells.push(b.name);
      if (vis("Description")) cells.push(b.description||"");
      return cells;
    });
    const html = `<!DOCTYPE html><html><head><title>Laundry Types</title><style>body{font-family:sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}th{background:#1d4ed8;color:#fff}</style></head><body><h2 style="margin-bottom:8px">Laundry Type List</h2><table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const win = window.open("","_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  }

  const pageButtons = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  }, [page, totalPages]);

  return (
    <PageScaffold title="Laundry Type List" subtitle="View/Search Laundry Types">
      <div className="bg-white border border-slate-200 rounded-sm">
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Laundry Type List</h2>
          <Link href="/items/brands/new" className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded transition-colors">
            + Add Laundry Type
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
            {[{ label: "Copy", fn: () => navigator.clipboard.writeText(filtered.map((b) => `${b.brandCode || ""}\t${b.name}`).join("\n")) },
              { label: "Excel", fn: downloadExcel }, { label: "PDF", fn: printTable },
              { label: "Print", fn: printTable }, { label: "CSV", fn: downloadCSV }].map((btn) => (
              <button type="button" key={btn.label} onClick={btn.fn} className={{"Copy":"bg-slate-600 hover:bg-slate-700","Excel":"bg-green-600 hover:bg-green-700","PDF":"bg-red-500 hover:bg-red-600","Print":"bg-slate-700 hover:bg-slate-800","CSV":"bg-green-700 hover:bg-green-800"}[btn.label]+" text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"}>{btn.label}</button>
            ))}

            {selectedIds.size > 0 && hasPermission("item-brands:delete") && (
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
                {vis("Laundry Type Code") && <th className="px-3 py-2.5 font-semibold text-left">Laundry Type Code</th>}
                {vis("Laundry Type Name") && <th className="px-3 py-2.5 font-semibold text-left">Laundry Type Name</th>}
                {vis("Description") && <th className="px-3 py-2.5 font-semibold text-left">Description</th>}
                <th className="px-3 py-2.5 font-semibold text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center text-slate-400 text-sm">Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center text-slate-400 text-sm">No laundry types found</td></tr>
              ) : paginated.map((b, i) => (
                <tr key={b.pk} className={`border-t border-slate-100 hover:bg-blue-50/30 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                  <td className="px-3 py-2 text-center"><input type="checkbox" checked={selectedIds.has(b.pk)} onChange={() => toggleId(b.pk)} /></td>
                  {vis("Laundry Type Code") && <td className="px-3 py-2 font-mono text-xs text-slate-600">{b.brandCode || "-"}</td>}
                  {vis("Laundry Type Name") && <td className="px-3 py-2 font-medium text-slate-800">{b.name}</td>}
                  {vis("Description") && <td className="px-3 py-2 text-slate-500 text-xs">{b.description || "-"}</td>}
                  <td className="px-3 py-2">
                    <DropdownMenu>
                      {hasPermission("item-brands:edit") && <button type="button" onClick={() => openEdit(b)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><Pencil className="w-3.5 h-3.5 text-teal-600" /> Edit</button>}
                      {hasPermission("item-brands:delete") && <button type="button" onClick={() => deleteBrand(b)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-red-600 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete</button>}
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

      {editBrand && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">Edit Laundry Type</h2>
              <button type="button" onClick={() => setEditBrand(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={saveEdit} className="p-5 space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Laundry Type Name*</label>
                <input required value={editForm.name || ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Description</label>
                <textarea value={editForm.description || ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setEditBrand(null)} className="px-4 py-2 border border-slate-300 rounded text-sm hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={editSaving} className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-semibold disabled:opacity-60">{editSaving ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageScaffold>
  );
}
