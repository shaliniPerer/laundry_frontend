"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Trash2, Pencil } from "lucide-react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

type PurchaseReturn = {
  pk: string;
  purchaseReturnCode?: string;
  supplierId?: string;
  supplierName?: string;
  date?: string;
  status?: string;
  referenceNo?: string;
  total?: number;
  paymentStatus?: string;
};

export default function PurchaseReturnListPage() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await api<{ returns: PurchaseReturn[] }>("/api/purchases/returns/list");
    setLoading(false);
    if (res.ok && res.data?.returns)
      setReturns(res.data.returns.filter((r) => r.pk?.startsWith("PURCHASE_RETURN#")));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    function handler() { setOpenActionId(null); }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return returns.filter(
      (r) =>
        !q ||
        (r.purchaseReturnCode || "").toLowerCase().includes(q) ||
        (r.supplierName || "").toLowerCase().includes(q) ||
        (r.status || "").toLowerCase().includes(q) ||
        (r.referenceNo || "").toLowerCase().includes(q)
    );
  }, [returns, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const footerTotal = useMemo(
    () => filtered.reduce((s, r) => s + Number(r.total || 0), 0),
    [filtered]
  );

  async function deleteReturn(r: PurchaseReturn) {
    if (!confirm(`Delete return "${r.purchaseReturnCode}"? This cannot be undone.`)) return;
    const id = r.pk.replace("PURCHASE_RETURN#", "");
    await api(`/api/purchases/returns/${id}`, { method: "DELETE" });
    setReturns((prev) => prev.filter((x) => x.pk !== r.pk));
    setOpenActionId(null);
  }

  function downloadCSV() {
    const header = "Date,Return Code,Status,Reference No.,Supplier Name,Total,Payment Status";
    const rows = filtered.map((r) =>
      [r.date || "", r.purchaseReturnCode || "", r.status || "", r.referenceNo || "",
        `"${r.supplierName || ""}"`, Number(r.total || 0).toFixed(2), r.paymentStatus || ""].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "purchase_returns.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const pageButtons = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  }, [page, totalPages]);

  return (
    <PageScaffold title="Purchase Return List" subtitle="View/Search Purchase Returns">
      <div className="bg-white border border-slate-200 rounded-sm">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Purchase Return List</h2>
          <Link
            href="/purchase/returns/new"
            className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded transition-colors"
          >
            + New Purchase Return
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
                  ["Date", "text-left"],
                  ["Return Code", "text-left"],
                  ["Status", "text-center"],
                  ["Reference No.", "text-left"],
                  ["Supplier Name", "text-left"],
                  ["Total", "text-right"],
                  ["Payment Status", "text-center"],
                  ["Action", "text-center"],
                ].map(([h, align]) => (
                  <th key={h} className={`px-3 py-2.5 font-semibold ${align}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-400 text-sm">Loading…</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-400 text-sm">No purchase returns found</td>
                </tr>
              ) : (
                paginated.map((r, i) => {
                  const total = Number(r.total || 0);
                  const isPaid = r.paymentStatus === "Paid" || r.paymentStatus === "fully_paid";
                  return (
                    <tr
                      key={r.pk}
                      className={`border-t border-slate-100 hover:bg-blue-50/30 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" className="rounded" />
                      </td>
                      <td className="px-3 py-2 text-slate-600">{r.date || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">{r.purchaseReturnCode || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-white text-xs font-semibold px-2.5 py-0.5 rounded ${r.status === "Return" ? "bg-amber-500" : "bg-slate-400"}`}>
                          {r.status || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{r.referenceNo || "—"}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{r.supplierName || "—"}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{total.toFixed(2)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-white text-xs font-semibold px-2.5 py-0.5 rounded ${isPaid ? "bg-green-500" : "bg-red-500"}`}>
                          {r.paymentStatus || "Unpaid"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setOpenActionId(openActionId === r.pk ? null : r.pk)}
                            className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1 transition-colors"
                          >
                            Action <ChevronDown className="w-3 h-3" />
                          </button>
                          {openActionId === r.pk && (
                            <div className="absolute right-0 top-full mt-0.5 bg-white border border-slate-200 rounded shadow-lg z-20 min-w-40 py-1">
                              <Link
                                href={`/purchase/returns/new?edit=${r.pk.replace("PURCHASE_RETURN#", "")}`}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Pencil className="w-3.5 h-3.5 text-teal-600" /> Edit
                              </Link>
                              <button
                                onClick={() => deleteReturn(r)}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-red-600 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
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
                  <td className="px-3 py-2.5 text-right text-slate-800">{footerTotal.toFixed(2)}</td>
                  <td colSpan={2} />
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
