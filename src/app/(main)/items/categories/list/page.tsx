"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Pencil, Trash2, X } from "lucide-react";
import { PageScaffold } from "@/components/PageScaffold";
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
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [editForm, setEditForm] = useState<Partial<Category>>({});
  const [editSaving, setEditSaving] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

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
              { label: "Print", fn: () => window.print() }, { label: "CSV", fn: downloadCSV }].map((btn) => (
              <button type="button" key={btn.label} onClick={btn.fn} className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors">{btn.label}</button>
            ))}
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
                <th className="px-3 py-2.5 w-8"><input type="checkbox" /></th>
                {["Service Code", "Service Name", "Description", "Action"].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-semibold text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center text-slate-400 text-sm">Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center text-slate-400 text-sm">No services found</td></tr>
              ) : paginated.map((c, i) => (
                <tr key={c.pk} className={`border-t border-slate-100 hover:bg-blue-50/30 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                  <td className="px-3 py-2 text-center"><input type="checkbox" /></td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{c.categoryCode || "-"}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{c.name}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{c.description || "-"}</td>
                  <td className="px-3 py-2">
                    <div ref={openActionId === c.pk ? actionMenuRef : null} className="relative inline-block">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setOpenActionId(openActionId === c.pk ? null : c.pk); }} className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1 transition-colors">
                        Action <ChevronDown className="w-3 h-3" />
                      </button>
                      {openActionId === c.pk && (
                        <div className="absolute right-0 top-full mt-0.5 bg-white border border-slate-200 rounded shadow-lg z-20 min-w-36 py-1">
                          <button type="button" onClick={() => openEdit(c)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><Pencil className="w-3.5 h-3.5 text-teal-600" /> Edit</button>
                          <button type="button" onClick={() => deleteCategory(c)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-red-600 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                        </div>
                      )}
                    </div>
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
