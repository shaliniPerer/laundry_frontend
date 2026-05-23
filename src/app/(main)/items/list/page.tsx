"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { PageScaffold } from "@/components/PageScaffold";
import { DropdownMenu } from "@/components/DropdownMenu";
import { api } from "@/lib/api";

type Item = {
  pk: string;
  itemNumber?: string;
  name: string;
  categoryId?: string;
  brandId?: string;
  price?: number;
  unit?: string;
  status?: string;
};
type Brand = { pk: string; name: string };
type Category = { pk: string; name: string };

export default function ItemListPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [itemsRes, brandsRes, catsRes] = await Promise.all([
      api<{ items: Item[] }>("/api/items"),
      api<{ brands: Brand[] }>("/api/items/brands"),
      api<{ categories: Category[] }>("/api/items/categories?kind=item"),
    ]);
    setLoading(false);
    if (itemsRes.ok && itemsRes.data?.items) setItems(itemsRes.data.items.filter((i) => i.pk?.startsWith("ITEM#")));
    if (brandsRes.ok && brandsRes.data?.brands) setBrands(brandsRes.data.brands.filter((b) => b.pk?.startsWith("BRAND#")));
    if (catsRes.ok && catsRes.data?.categories) setCategories(catsRes.data.categories.filter((c) => c.pk?.startsWith("CATEGORY#")));
  }, []);

  useEffect(() => { load(); }, [load]);

  const brandMap = useMemo(() => Object.fromEntries(brands.map((b) => [b.pk, b.name])), [brands]);
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.pk, c.name])), [categories]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => {
      if (filterBrand && item.brandId !== filterBrand) return false;
      if (filterCategory && item.categoryId !== filterCategory) return false;
      return !q || (item.name || "").toLowerCase().includes(q) || (item.itemNumber || "").toLowerCase().includes(q);
    });
  }, [items, search, filterBrand, filterCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  async function deleteItem(item: Item) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    const id = item.pk.replace("ITEM#", "");
    await api(`/api/items/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((x) => x.pk !== item.pk));
    setOpenActionId(null);
  }

  function downloadCSV() {
    const header = "Item Code,Item Name,Laundry Type,Service,Unit, Price,Status";
    const rows = filtered.map((item) => [
      `"${item.itemNumber || ""}"`, `"${item.name}"`,
      `"${catMap[item.categoryId || ""] || ""}"`, `"${brandMap[item.brandId || ""] || ""}"`,
      `"${item.unit || ""}"`, `"${item.price || ""}"`, `"${item.status || "active"}"`,
    ].join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "items.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const pageButtons = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  }, [page, totalPages]);

  return (
    <PageScaffold title="Items List" subtitle="View/Search Inventory Items">
      <div className="bg-white border border-slate-200 rounded-sm" onClick={() => setOpenActionId(null)}>
        {/* Filter Row */}
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <select value={filterBrand} onChange={(e) => { setFilterBrand(e.target.value); setPage(1); }} className="border border-slate-300 rounded px-2.5 py-1.5 text-sm bg-white outline-none focus:border-blue-400">
              <option value="">All Brands</option>
              {brands.map((b) => <option key={b.pk} value={b.pk}>{b.name}</option>)}
            </select>
            <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }} className="border border-slate-300 rounded px-2.5 py-1.5 text-sm bg-white outline-none focus:border-blue-400">
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c.pk} value={c.pk}>{c.name}</option>)}
            </select>
          </div>
          <Link href="/items/new" className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded transition-colors">+ New Item</Link>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Show</span>
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="border border-slate-300 rounded px-2 py-1 text-sm bg-white outline-none">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>entries</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[{ label: "Copy", fn: () => navigator.clipboard.writeText(filtered.map((item) => item.name).join("\n")) },
              { label: "Excel", fn: () => {} }, { label: "PDF", fn: () => {} },
              { label: "Print", fn: () => window.print() }, { label: "CSV", fn: downloadCSV }, { label: "Columns", fn: () => {} }].map((btn) => (
              <button key={btn.label} onClick={btn.fn} className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors">{btn.label}</button>
            ))}
            <div className="flex items-center gap-1 ml-1">
              <span className="text-sm text-slate-600">Search:</span>
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400 w-36" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-275">
            <thead>
              <tr className="bg-blue-600 text-white text-xs">
                <th className="px-3 py-2.5 w-8"><input type="checkbox" /></th>
                
                {["Item Code", "Item Name", "Laundry Type", "Service", "Unit",  "Price(LKR)",  "Status", "Action"].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-semibold text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={14} className="px-4 py-16 text-center text-slate-400 text-sm">Loading…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={14} className="px-4 py-16 text-center text-slate-400 text-sm">No items found</td></tr>
              ) : paginated.map((item, i) => (
                <tr key={item.pk} className={`border-t border-slate-100 hover:bg-blue-50/30 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                  <td className="px-3 py-2 text-center"><input type="checkbox" /></td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{item.itemNumber || "—"}</td>

            
              <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2 text-slate-600 text-xs">{brandMap[item.brandId || ""] || "—"}</td>
                  <td className="px-3 py-2 text-slate-600 text-xs">{catMap[item.categoryId || ""] || "—"}</td>
                  <td className="px-3 py-2 text-slate-600 text-xs">{item.unit || "—"}</td>
                  <td className="px-3 py-2 text-slate-600 text-xs">{item.price != null ? `${item.price.toFixed(2)}` : "—"}</td>
                  <td className="px-3 py-2"><span className="bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded">{(item.status || "active") === "active" ? "Active" : item.status}</span></td>
                  <td className="px-3 py-2">
                    <DropdownMenu>
                      <button
                        type="button"
                        onClick={() => router.push(`/items/new?edit=${item.pk.replace("ITEM#", "")}`)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Pencil className="w-3.5 h-3.5 text-teal-600" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteItem(item)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-red-600 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 text-sm text-slate-500">
          <div>{loading ? "Loading…" : `Showing ${filtered.length === 0 ? 0 : (page - 1) * perPage + 1} to ${Math.min(page * perPage, filtered.length)} of ${filtered.length} entries`}</div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1} className="px-3 py-1 border border-slate-200 rounded text-xs disabled:opacity-40 hover:bg-slate-50">Previous</button>
            {pageButtons.map((p) => <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 border rounded text-xs ${p === page ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 hover:bg-slate-50"}`}>{p}</button>)}
            <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="px-3 py-1 border border-slate-200 rounded text-xs disabled:opacity-40 hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>
    </PageScaffold>
  );
}
