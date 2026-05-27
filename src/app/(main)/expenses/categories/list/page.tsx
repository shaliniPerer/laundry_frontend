"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, X } from "lucide-react";
import { PageScaffold } from "@/components/PageScaffold";
import { DropdownMenu } from "@/components/DropdownMenu";
import { api } from "@/lib/api";

type Category = { pk: string; name: string; description?: string; status?: string };

export default function ExpenseCategoryListPage() {
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

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api<{ categories: Category[] }>("/api/expenses/categories/list");
    setLoading(false);
    if (res.ok && res.data?.categories) setCategories(res.data.categories.filter((c) => c.pk?.startsWith("EXPENSE_CAT#")));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    function handler() { setOpenActionId(null); }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return categories.filter((c) => !q || (c.name || "").toLowerCase().includes(q));
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
    for (const pk of selectedIds) await api(`/api/expenses/categories/${pk.replace("EXPENSE_CAT#", "")}`, { method: "DELETE" });
    setSelectedIds(new Set());
    load();
  }

  async function deleteCat(c: Category) {
    if (!confirm(`Delete "${c.name}"?`)) return;
    const id = c.pk.replace("EXPENSE_CAT#", "");
    await api(`/api/expenses/categories/${id}`, { method: "DELETE" });
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
    const id = editCat.pk.replace("EXPENSE_CAT#", "");
    const res = await api(`/api/expenses/categories/${id}`, { method: "PATCH", body: JSON.stringify(editForm) });
    setEditSaving(false);
    if (!res.ok) return;
    setCategories((prev) => prev.map((c) => (c.pk === editCat.pk ? { ...c, ...editForm } : c)));
    setEditCat(null);
  }

  function downloadCSV() {
    const header = "Category Name,Description,Status";
    const rows = filtered.map((c) => [`"${c.name}"`, `"${c.description || ""}"`, c.status || "active"].join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "expense_categories.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const pageButtons = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  }, [page, totalPages]);

  return (
    <PageScaffold title="Expense Category List" subtitle="View/Search Expense Categories">
      <div className="bg-white border border-slate-200 rounded-sm">
        <div className="px-4 py-3 flex items-center justify-end border-b border-slate-200">
          <Link href="/expenses/categories/new" className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded transition-colors">+ New Category</Link>
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
            {[{ label: "Copy", fn: () => navigator.clipboard.writeText(filtered.map((c) => c.name).join("\n")) },
              { label: "Excel", fn: () => {} }, { label: "PDF", fn: () => {} },
              { label: "Print", fn: () => window.print() }, { label: "CSV", fn: downloadCSV }, { label: "Columns", fn: () => {} }].map((btn) => (
              <button key={btn.label} onClick={btn.fn} className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors">{btn.label}</button>
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
                {["Category Name", "Description", "Status", "Action"].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-semibold text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center text-slate-400 text-sm">Loading…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center text-slate-400 text-sm">No categories found</td></tr>
              ) : paginated.map((c, i) => (
                <tr key={c.pk} className={`border-t border-slate-100 hover:bg-blue-50/30 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                  <td className="px-3 py-2 text-center"><input type="checkbox" checked={selectedIds.has(c.pk)} onChange={() => toggleId(c.pk)} /></td>
                  <td className="px-3 py-2 font-medium text-slate-800">{c.name}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{c.description || "—"}</td>
                  <td className="px-3 py-2">
                    <span className="bg-green-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded">{(c.status || "active") === "active" ? "Active" : c.status}</span>
                  </td>
                  <td className="px-3 py-2">
                    <DropdownMenu>
                      <button onClick={() => openEdit(c)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><Pencil className="w-3.5 h-3.5 text-teal-600" /> Edit</button>
                      <button onClick={() => deleteCat(c)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-red-600 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
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

      {editCat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">Edit Category</h2>
              <button onClick={() => setEditCat(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={saveEdit} className="p-5 space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Category Name*</label>
                <input required value={editForm.name || ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Description</label>
                <textarea value={editForm.description || ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setEditCat(null)} className="px-4 py-2 border border-slate-300 rounded text-sm hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={editSaving} className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-semibold disabled:opacity-60">{editSaving ? "Saving…" : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageScaffold>
  );
}
