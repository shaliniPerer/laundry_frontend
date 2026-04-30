"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Pencil, Trash2, X } from "lucide-react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

type Supplier = {
  pk: string;
  supplierNumber?: string;
  name: string;
  mobile?: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
  taxNumber?: string;
  country?: string;
  state?: string;
  city?: string;
  postcode?: string;
  address?: string;
  previousDue?: number;
  status?: string;
};

const COUNTRIES = [
  "Sri Lanka", "India", "United Kingdom", "United States",
  "Australia", "Canada", "Singapore", "Malaysia", "Other",
];

export default function SupplierListPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState<Partial<Supplier>>({});
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await api<{ suppliers: Supplier[] }>("/api/suppliers");
    setLoading(false);
    if (res.ok && res.data?.suppliers)
      setSuppliers(res.data.suppliers.filter((s) => s.pk?.startsWith("SUPPLIER#")));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    function handler() { setOpenActionId(null); }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        !q ||
        (s.name || "").toLowerCase().includes(q) ||
        (s.mobile || "").includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.supplierNumber || "").toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const footerTotals = useMemo(() => {
    let purchaseDue = 0, returnDue = 0;
    for (const s of filtered) {
      purchaseDue += Number(s.previousDue || 0);
    }
    return { purchaseDue, returnDue };
  }, [filtered]);

  async function deleteSupplier(s: Supplier) {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    const id = s.pk.replace("SUPPLIER#", "");
    await api(`/api/suppliers/${id}`, { method: "DELETE" });
    setSuppliers((prev) => prev.filter((x) => x.pk !== s.pk));
    setOpenActionId(null);
  }

  function openEdit(s: Supplier) {
    setEditSupplier(s);
    setEditForm({ ...s });
    setEditMsg(null);
    setOpenActionId(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editSupplier) return;
    setEditMsg(null);
    setEditSaving(true);
    const id = editSupplier.pk.replace("SUPPLIER#", "");
    const res = await api(`/api/suppliers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(editForm),
    });
    setEditSaving(false);
    if (!res.ok) { setEditMsg("Failed to save changes."); return; }
    setSuppliers((prev) =>
      prev.map((s) => (s.pk === editSupplier.pk ? { ...s, ...editForm } : s))
    );
    setEditSupplier(null);
  }

  function copyToClipboard() {
    const text = filtered
      .map((s) => [
        s.supplierNumber || `SU${String(suppliers.indexOf(s) + 1).padStart(4, "0")}`,
        s.name, s.mobile || "", s.email || "",
        "0.00", "0.00", s.status || "Active",
      ].join("\t"))
      .join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function downloadCSV() {
    const header = "Supplier ID,Supplier Name,Mobile,Email,Purchase Due,Purchase Return Due,Status";
    const rows = filtered.map((s) => {
      const id = s.supplierNumber || `SU${String(suppliers.indexOf(s) + 1).padStart(4, "0")}`;
      return [id, `"${s.name}"`, s.mobile || "", s.email || "", "0.00", "0.00", s.status || "Active"].join(",");
    });
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "suppliers.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const pageButtons = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  }, [page, totalPages]);

  return (
    <PageScaffold title="Suppliers List" subtitle="View/Search Suppliers">
      <div className="bg-white border border-slate-200 rounded-sm">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Suppliers List</h2>
          <Link
            href="/suppliers/new"
            className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded transition-colors"
          >
            + New Supplier
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
              { label: "Copy", fn: copyToClipboard },
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
                  ["Supplier ID", "text-left"],
                  ["Supplier Name", "text-left"],
                  ["Mobile", "text-left"],
                  ["Email", "text-left"],
                  ["Purchase Due", "text-right"],
                  ["Purchase Return Due", "text-right"],
                  ["Status", "text-center"],
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
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-400 text-sm">No suppliers found</td>
                </tr>
              ) : (
                paginated.map((s, i) => {
                  const displayId = s.supplierNumber || `SU${String(suppliers.indexOf(s) + 1).padStart(4, "0")}`;
                  return (
                    <tr
                      key={s.pk}
                      className={`border-t border-slate-100 hover:bg-blue-50/30 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" className="rounded" />
                      </td>
                      <td className="px-3 py-2 text-slate-700 font-mono text-xs">{displayId}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{s.name}</td>
                      <td className="px-3 py-2 text-slate-600">{s.mobile || s.phone || "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{s.email || "—"}</td>
                      <td className="px-3 py-2 text-right text-slate-700">0.00</td>
                      <td className="px-3 py-2 text-right text-slate-700">0.00</td>
                      <td className="px-3 py-2 text-center">
                        <span className="bg-green-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded">
                          {(s.status || "active") === "active" ? "Active" : s.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setOpenActionId(openActionId === s.pk ? null : s.pk)}
                            className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1 transition-colors"
                          >
                            Action <ChevronDown className="w-3 h-3" />
                          </button>
                          {openActionId === s.pk && (
                            <div className="absolute right-0 top-full mt-0.5 bg-white border border-slate-200 rounded shadow-lg z-20 min-w-40 py-1">
                              <button
                                onClick={() => openEdit(s)}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Pencil className="w-3.5 h-3.5 text-teal-600" /> Edit
                              </button>
                              <button
                                onClick={() => deleteSupplier(s)}
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
                  <td colSpan={5} className="px-3 py-2.5 text-right text-slate-600">Total</td>
                  <td className="px-3 py-2.5 text-right text-slate-800">{footerTotals.purchaseDue.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-800">{footerTotals.returnDue.toFixed(2)}</td>
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

      {/* Edit modal */}
      {editSupplier && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-10 overflow-y-auto pb-10">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">Edit Supplier — {editSupplier.name}</h2>
              <button onClick={() => setEditSupplier(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveEdit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["name", "Supplier Name*", true],
                  ["mobile", "Mobile", false],
                  ["email", "Email", false],
                  ["phone", "Phone", false],
                  ["city", "City", false],
                  ["postcode", "Postcode", false],
                  ["gstNumber", "GST Number", false],
                  ["taxNumber", "TAX Number", false],
                ].map(([k, label, req]) => (
                  <div key={String(k)}>
                    <label className="text-xs text-slate-500 mb-1 block">{String(label)}</label>
                    <input
                      required={Boolean(req)}
                      type={k === "email" ? "email" : "text"}
                      value={String(editForm[k as keyof Supplier] ?? "")}
                      onChange={(e) => setEditForm((f) => ({ ...f, [String(k)]: e.target.value }))}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Country</label>
                  <select
                    value={editForm.country || "Sri Lanka"}
                    onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white"
                  >
                    {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Status</label>
                  <select
                    value={editForm.status || "active"}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              {editMsg && <p className="text-red-600 text-sm">{editMsg}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded text-sm disabled:opacity-60 transition-colors"
                >
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditSupplier(null)}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageScaffold>
  );
}
