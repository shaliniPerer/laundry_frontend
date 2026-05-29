"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
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
  const [_openActionId, setOpenActionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const ITEM_COLS = ["Item Code", "Item Name", "Laundry Type", "Service", "Unit", "Price(LKR)", "Status"];
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [showColPicker, setShowColPicker] = useState(false);
  const colPickerRef = useRef<HTMLDivElement>(null);
  const vis = (col: string) => !hiddenCols.has(col);
  function toggleCol(col: string) {
    setHiddenCols(prev => { const next = new Set(prev); next.has(col) ? next.delete(col) : next.add(col); return next; });
  }

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setShowColPicker(false);
    }
    if (showColPicker) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColPicker]);

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
  const allPageSelected = paginated.length > 0 && paginated.every(item => selectedIds.has(item.pk));
  function toggleAll() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) paginated.forEach(item => next.delete(item.pk));
      else paginated.forEach(item => next.add(item.pk));
      return next;
    });
  }
  function toggleId(pk: string) {
    setSelectedIds(prev => { const next = new Set(prev); next.has(pk) ? next.delete(pk) : next.add(pk); return next; });
  }
  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} selected item(s)? This cannot be undone.`)) return;
    for (const pk of selectedIds) await api(`/api/items/${pk.replace("ITEM#", "")}`, { method: "DELETE" });
    setSelectedIds(new Set());
    load();
  }

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

  function xmlEsc(s: string) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  function downloadExcel() {
    const cols = ITEM_COLS.filter(vis);
    let xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Items"><Table>`;
    xml += `<Row>${cols.map(c => `<Cell><Data ss:Type="String">${xmlEsc(c)}</Data></Cell>`).join("")}</Row>`;
    filtered.forEach(item => {
      xml += `<Row>`;
      if (vis("Item Code")) xml += `<Cell><Data ss:Type="String">${xmlEsc(item.itemNumber||"")}</Data></Cell>`;
      if (vis("Item Name")) xml += `<Cell><Data ss:Type="String">${xmlEsc(item.name)}</Data></Cell>`;
      if (vis("Laundry Type")) xml += `<Cell><Data ss:Type="String">${xmlEsc(brandMap[item.brandId||""]||"")}</Data></Cell>`;
      if (vis("Service")) xml += `<Cell><Data ss:Type="String">${xmlEsc(catMap[item.categoryId||""]||"")}</Data></Cell>`;
      if (vis("Unit")) xml += `<Cell><Data ss:Type="String">${xmlEsc(item.unit||"")}</Data></Cell>`;
      if (vis("Price(LKR)")) xml += `<Cell><Data ss:Type="Number">${item.price||0}</Data></Cell>`;
      if (vis("Status")) xml += `<Cell><Data ss:Type="String">${xmlEsc(item.status||"active")}</Data></Cell>`;
      xml += `</Row>`;
    });
    xml += `</Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "items.xls"; a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPDF() {
    const cols = ITEM_COLS.filter(vis);
    const rows = filtered.map(item => {
      const cells: string[] = [];
      if (vis("Item Code")) cells.push(item.itemNumber||"");
      if (vis("Item Name")) cells.push(item.name);
      if (vis("Laundry Type")) cells.push(brandMap[item.brandId||""]||"");
      if (vis("Service")) cells.push(catMap[item.categoryId||""]||"");
      if (vis("Unit")) cells.push(item.unit||"");
      if (vis("Price(LKR)")) cells.push(item.price!=null?item.price.toFixed(2):"");
      if (vis("Status")) cells.push(item.status||"active");
      return cells;
    });
    const html = `<!DOCTYPE html><html><head><title>Items</title><style>body{font-family:sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}th{background:#1d4ed8;color:#fff}</style></head><body><h2 style="margin-bottom:8px">Items List</h2><table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const win = window.open("","_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
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
              { label: "Excel", fn: downloadExcel }, { label: "PDF", fn: downloadPDF },
              { label: "Print", fn: downloadPDF }, { label: "CSV", fn: downloadCSV }].map((btn) => (
              <button key={btn.label} onClick={btn.fn} className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors">{btn.label}</button>
            ))}
            <div className="relative" ref={colPickerRef}>
              <button onClick={() => setShowColPicker(p => !p)} className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors">Columns</button>
              {showColPicker && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg z-20 py-1 min-w-40">
                  {ITEM_COLS.map(col => (
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-275">
            <thead>
              <tr className="bg-blue-600 text-white text-xs">
                <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={allPageSelected} onChange={toggleAll} /></th>
                
                {vis("Item Code") && <th className="px-3 py-2.5 font-semibold text-left">Item Code</th>}
                {vis("Item Name") && <th className="px-3 py-2.5 font-semibold text-left">Item Name</th>}
                {vis("Laundry Type") && <th className="px-3 py-2.5 font-semibold text-left">Laundry Type</th>}
                {vis("Service") && <th className="px-3 py-2.5 font-semibold text-left">Service</th>}
                {vis("Unit") && <th className="px-3 py-2.5 font-semibold text-left">Unit</th>}
                {vis("Price(LKR)") && <th className="px-3 py-2.5 font-semibold text-left">Price(LKR)</th>}
                {vis("Status") && <th className="px-3 py-2.5 font-semibold text-left">Status</th>}
                <th className="px-3 py-2.5 font-semibold text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={14} className="px-4 py-16 text-center text-slate-400 text-sm">Loading…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={14} className="px-4 py-16 text-center text-slate-400 text-sm">No items found</td></tr>
              ) : paginated.map((item, i) => (
                <tr key={item.pk} className={`border-t border-slate-100 hover:bg-blue-50/30 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                  <td className="px-3 py-2 text-center"><input type="checkbox" checked={selectedIds.has(item.pk)} onChange={() => toggleId(item.pk)} /></td>
                  {vis("Item Code") && <td className="px-3 py-2 font-mono text-xs text-slate-600">{item.itemNumber || "—"}</td>}
                  {vis("Item Name") && <td className="px-3 py-2">{item.name}</td>}
                  {vis("Laundry Type") && <td className="px-3 py-2 text-slate-600 text-xs">{brandMap[item.brandId || ""] || "—"}</td>}
                  {vis("Service") && <td className="px-3 py-2 text-slate-600 text-xs">{catMap[item.categoryId || ""] || "—"}</td>}
                  {vis("Unit") && <td className="px-3 py-2 text-slate-600 text-xs">{item.unit || "—"}</td>}
                  {vis("Price(LKR)") && <td className="px-3 py-2 text-slate-600 text-xs">{item.price != null ? `${item.price.toFixed(2)}` : "—"}</td>}
                  {vis("Status") && <td className="px-3 py-2"><span className="bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded">{(item.status || "active") === "active" ? "Active" : item.status}</span></td>}
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
