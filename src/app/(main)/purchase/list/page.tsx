"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Plus, RefreshCw, Hourglass, Trash2, Pencil } from "lucide-react";
import { PageScaffold } from "@/components/PageScaffold";
import { DropdownMenu } from "@/components/DropdownMenu";
import { api } from "@/lib/api";

type Purchase = {
  pk: string;
  purchaseCode?: string;
  supplierId?: string;
  supplierName?: string;
  purchaseDate?: string;
  status?: string;
  referenceNo?: string;
  total?: number;
  subtotal?: number;
  paymentStatus?: string;
  createdBy?: string;
};

export default function PurchaseListPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [_openActionId, setOpenActionId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await api<{ purchases: Purchase[] }>("/api/purchases");
    setLoading(false);
    if (res.ok && res.data?.purchases)
      setPurchases(res.data.purchases.filter((p) => p.pk?.startsWith("PURCHASE#")));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    function handler() { setOpenActionId(null); }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return purchases.filter(
      (p) =>
        !q ||
        (p.purchaseCode || "").toLowerCase().includes(q) ||
        (p.supplierName || "").toLowerCase().includes(q) ||
        (p.status || "").toLowerCase().includes(q) ||
        (p.referenceNo || "").toLowerCase().includes(q)
    );
  }, [purchases, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const stats = useMemo(() => {
    const totalInvoices = purchases.length;
    const totalAmount = purchases.reduce((s, p) => s + Number(p.total || 0), 0);
    const totalPaid = purchases
      .filter((p) => p.paymentStatus === "Paid" || p.paymentStatus === "fully_paid")
      .reduce((s, p) => s + Number(p.total || 0), 0);
    const totalDue = totalAmount - totalPaid;
    return { totalInvoices, totalAmount, totalPaid, totalDue };
  }, [purchases]);

  const footerTotals = useMemo(() => {
    let total = 0, paid = 0, due = 0;
    for (const p of filtered) {
      const t = Number(p.total || 0);
      total += t;
      if (p.paymentStatus === "Paid" || p.paymentStatus === "fully_paid") paid += t;
      else due += t;
    }
    return { total, paid, due };
  }, [filtered]);

  async function deletePurchase(p: Purchase) {
    if (!confirm(`Delete purchase "${p.purchaseCode}"? This cannot be undone.`)) return;
    const id = p.pk.replace("PURCHASE#", "");
    await api(`/api/purchases/${id}`, { method: "DELETE" });
    setPurchases((prev) => prev.filter((x) => x.pk !== p.pk));
    setOpenActionId(null);
  }

  function downloadCSV() {
    const header = "Purchase Date,Purchase Code,Status,Reference No.,Supplier Name,Total,Payment Status";
    const rows = filtered.map((p) =>
      [p.purchaseDate || "", p.purchaseCode || "", p.status || "", p.referenceNo || "",
        `"${p.supplierName || ""}"`, Number(p.total || 0).toFixed(2), p.paymentStatus || ""].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "purchases.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const pageButtons = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  }, [page, totalPages]);

  return (
    <PageScaffold title="Purchase List" subtitle="View/Search Purchases">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="bg-cyan-500 text-white rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
            <div className="text-xs opacity-90 mt-0.5">Total Invoices</div>
            <div className="text-xs opacity-70 mt-2 underline cursor-pointer">More info →</div>
          </div>
          <ShoppingBag className="w-10 h-10 opacity-40" />
        </div>
        <div className="bg-green-500 text-white rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">LKR {stats.totalAmount.toFixed(2)}</div>
            <div className="text-xs opacity-90 mt-0.5">Total Invoices Amount</div>
            <div className="text-xs opacity-70 mt-2 underline cursor-pointer">More info →</div>
          </div>
          <Plus className="w-10 h-10 opacity-40" />
        </div>
        <div className="bg-amber-500 text-white rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">LKR {stats.totalPaid.toFixed(2)}</div>
            <div className="text-xs opacity-90 mt-0.5">Total Paid Amount</div>
            <div className="text-xs opacity-70 mt-2 underline cursor-pointer">More info →</div>
          </div>
          <RefreshCw className="w-10 h-10 opacity-40" />
        </div>
        <div className="bg-red-500 text-white rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">LKR {stats.totalDue.toFixed(2)}</div>
            <div className="text-xs opacity-90 mt-0.5">Total Purchase Due</div>
            <div className="text-xs opacity-70 mt-2 underline cursor-pointer">More info →</div>
          </div>
          <Hourglass className="w-10 h-10 opacity-40" />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Purchase List</h2>
          <Link
            href="/purchase/new"
            className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded transition-colors"
          >
            + New Purchase
          </Link>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Show</span>
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="border border-slate-300 rounded px-2 py-1 text-sm bg-white outline-none"
            >
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>entries</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: "Copy", fn: () => {} },
              { label: "Excel", fn: () => {} },
              { label: "PDF", fn: () => {} },
              { label: "Print", fn: () => window.print() },
              { label: "CSV", fn: downloadCSV },
              { label: "Columns", fn: () => {} },
            ].map((b) => (
              <button
                key={b.label}
                onClick={b.fn}
                className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
              >
                {b.label}
              </button>
            ))}
            <div className="flex items-center gap-1 ml-1">
              <span className="text-sm text-slate-600">Search:</span>
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400 w-36"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white text-xs">
                <th className="px-3 py-2.5 w-8">
                  <input type="checkbox" className="rounded" />
                </th>
                {[
                  ["Purchase Date", "text-left"],
                  ["Purchase Code", "text-left"],
                  ["Purchase Status", "text-center"],
                  ["Reference No.", "text-left"],
                  ["Supplier Name", "text-left"],
                  ["Total", "text-right"],
                  ["Paid Payment", "text-right"],
                  ["Due", "text-right"],
                  ["Payment Status", "text-center"],
                  ["Created by", "text-left"],
                  ["Action", "text-center"],
                ].map(([h, align]) => (
                  <th key={h} className={`px-3 py-2.5 font-semibold ${align}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center text-slate-400 text-sm">Loading…</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center text-slate-400 text-sm">No purchases found</td>
                </tr>
              ) : (
                paginated.map((p, i) => {
                  const total = Number(p.total || 0);
                  const isPaid = p.paymentStatus === "Paid" || p.paymentStatus === "fully_paid";
                  const paid = isPaid ? total : 0;
                  const due = isPaid ? 0 : total;
                  return (
                    <tr
                      key={p.pk}
                      className={`border-t border-slate-100 hover:bg-blue-50/30 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" className="rounded" />
                      </td>
                      <td className="px-3 py-2 text-slate-600">{p.purchaseDate ? (() => { const pts = p.purchaseDate!.split("-"); return pts.length === 3 && pts[0].length === 4 ? `${pts[2]}-${pts[1]}-${pts[0]}` : p.purchaseDate; })() : "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">{p.purchaseCode || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-white text-xs font-semibold px-2.5 py-0.5 rounded ${p.status === "Received" ? "bg-green-500" : p.status === "Ordered" ? "bg-blue-500" : "bg-slate-400"}`}>
                          {p.status || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{p.referenceNo || "—"}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{p.supplierName || "—"}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{total.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-green-700">{paid.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-red-600">{due.toFixed(2)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-white text-xs font-semibold px-2.5 py-0.5 rounded ${isPaid ? "bg-green-500" : "bg-red-500"}`}>
                          {p.paymentStatus || "Unpaid"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{p.createdBy || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <DropdownMenu>
                          <Link
                            href={`/purchase/new?edit=${p.pk.replace("PURCHASE#", "")}`}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Pencil className="w-3.5 h-3.5 text-teal-600" /> Edit
                          </Link>
                          <button
                            onClick={() => deletePurchase(p)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-red-600 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {!loading && paginated.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-100 font-semibold text-sm">
                  <td colSpan={6} className="px-3 py-2.5 text-right text-slate-600">Total</td>
                  <td className="px-3 py-2.5 text-right text-slate-800">{footerTotals.total.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right text-green-700">{footerTotals.paid.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right text-red-600">{footerTotals.due.toFixed(2)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 text-sm text-slate-500">
          <div>
            {loading
              ? "Loading…"
              : `Showing ${filtered.length === 0 ? 0 : (page - 1) * perPage + 1} to ${Math.min(page * perPage, filtered.length)} of ${filtered.length} entries`}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-3 py-1 border border-slate-200 rounded text-xs disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            {pageButtons.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1 border rounded text-xs ${p === page ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 hover:bg-slate-50"}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-slate-200 rounded text-xs disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </PageScaffold>
  );
}
