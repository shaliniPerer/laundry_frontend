"use client";

import { useCallback, useEffect, useState } from "react";
import { Barcode, Printer, X } from "lucide-react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

type Item = { pk: string; name: string; itemNumber?: string; barcode?: string; sku?: string };
type LabelRow = { item: Item; qty: number };

export default function PrintLabelsPage() {
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Item[]>([]);
  const [labelRows, setLabelRows] = useState<LabelRow[]>([]);
  const [showSugg, setShowSugg] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await api<{ items: Item[] }>("/api/items");
      if (res.ok && res.data?.items) setAllItems(res.data.items.filter((i) => i.pk?.startsWith("ITEM#")));
    })();
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    if (!q.trim()) { setSuggestions([]); setShowSugg(false); return; }
    const lower = q.toLowerCase();
    const found = allItems.filter((item) =>
      (item.name || "").toLowerCase().includes(lower) ||
      (item.barcode || "").toLowerCase().includes(lower) ||
      (item.itemNumber || "").toLowerCase().includes(lower)
    ).slice(0, 8);
    setSuggestions(found);
    setShowSugg(true);
  }, [allItems]);

  function addItem(item: Item) {
    setLabelRows((prev) => {
      if (prev.some((r) => r.item.pk === item.pk)) return prev;
      return [...prev, { item, qty: 1 }];
    });
    setSearch("");
    setSuggestions([]);
    setShowSugg(false);
  }

  function removeRow(pk: string) { setLabelRows((prev) => prev.filter((r) => r.item.pk !== pk)); }
  function updateQty(pk: string, qty: number) { setLabelRows((prev) => prev.map((r) => r.item.pk === pk ? { ...r, qty } : r)); }

  const totalLabels = labelRows.reduce((sum, r) => sum + r.qty, 0);

  function handlePrint() { window.print(); }

  return (
    <PageScaffold title="Print Labels" subtitle="Search items and print barcode/garment labels">
      <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-5">
        {/* Search */}
        <div className="relative max-w-md">
          <div className="flex items-center gap-2 border border-slate-300 rounded px-3 py-1.5 bg-white focus-within:border-blue-400">
            <Barcode className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSugg(true)}
              placeholder="Item name / Barcode / Itemcode"
              className="flex-1 text-sm outline-none bg-transparent"
            />
          </div>
          {showSugg && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded shadow-lg z-20 max-h-56 overflow-y-auto">
              {suggestions.map((item) => (
                <button key={item.pk} type="button" onClick={() => addItem(item)} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex items-center justify-between">
                  <span>{item.name}</span>
                  <span className="text-xs text-slate-400 font-mono">{item.itemNumber}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 rounded">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white text-xs">
                {["Item Name", "Quantity", "Action"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-semibold text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labelRows.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-12 text-center text-slate-400 text-sm">Search and add items above</td></tr>
              ) : labelRows.map((row, i) => (
                <tr key={row.item.pk} className={`border-t border-slate-100 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                  <td className="px-4 py-2 font-medium text-slate-800">{row.item.name}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number" min={1} value={row.qty}
                      onChange={(e) => updateQty(row.item.pk, Math.max(1, Number(e.target.value)))}
                      className="w-20 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-400 text-center"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <button onClick={() => removeRow(row.item.pk)} className="text-red-500 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm font-semibold text-slate-600">Total Labels: {totalLabels}</p>

        <div className="flex items-center gap-3">
          <button type="button" className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded text-sm transition-colors" disabled={labelRows.length === 0}>Preview</button>
          <button type="button" onClick={() => setLabelRows([])} className="px-5 py-2.5 bg-slate-400 hover:bg-slate-500 text-white font-bold rounded text-sm transition-colors">Close</button>
          <button type="button" onClick={handlePrint} className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-sm transition-colors" disabled={labelRows.length === 0}>
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>
    </PageScaffold>
  );
}
