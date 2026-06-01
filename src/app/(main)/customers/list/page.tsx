"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Eye, History, Pencil, Trash2, X } from "lucide-react";
import { PageScaffold } from "@/components/PageScaffold";
import { DropdownMenu } from "@/components/DropdownMenu";
import { DateInput } from "@/components/DateInput";
import { api } from "@/lib/api";

type Customer = {
  pk: string;
  customerNumber?: string;
  salutation?: string;
  firstName?: string;
  lastName?: string;
  name: string;
  mobile?: string;
  phone?: string;
  email?: string;
  dob?: string;
  gstNumber?: string;
  taxNumber?: string;
  country?: string;
  state?: string;
  city?: string;
  postcode?: string;
  address?: string;
  previousDue?: number;
  discountType?: "percentage" | "fixed";
  discount?: number;
  createdAt?: string;
  updatedAt?: string;
};

type Sale = {
  pk: string;
  customerId?: string;
  total?: number;
  paidAmount?: number;
  paymentStatus?: string;
  entityType?: string;
};

type SaleReturn = { pk: string; originalSaleId?: string; total?: number };

type CustomerStats = { total: number; paid: number; due: number; returnDue: number };

const emptyStats: CustomerStats = { total: 0, paid: 0, due: 0, returnDue: 0 };

function formatDiscountType(customer: Pick<Customer, "discountType">) {
  if (!customer.discountType) return "-";
  return customer.discountType === "percentage" ? "Percentage" : "Fixed";
}

function formatDiscountAmount(customer: Pick<Customer, "discount">) {
  if (customer.discount == null) return "-";
  return Number(customer.discount).toFixed(2);
}

export default function CustomerListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc" | null>(null);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [_openActionId, setOpenActionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [discountDrafts, setDiscountDrafts] = useState<
    Record<string, { discountType: "percentage" | "fixed"; discount: string }>
  >({});
  const [savingDiscountId, setSavingDiscountId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [cr, sr, rr] = await Promise.all([
      api<{ customers: Customer[] }>("/api/customers"),
      api<{ sales: Sale[] }>("/api/sales"),
      api<{ returns: SaleReturn[] }>("/api/sales/returns/list"),
    ]);
    setLoading(false);

    if (cr.ok && cr.data?.customers) {
      const nextCustomers = cr.data.customers.filter((customer) =>
        customer.pk?.startsWith("CUSTOMER#")
      );
      setCustomers(nextCustomers);
      setDiscountDrafts((prev) => {
        const nextDrafts: Record<
          string,
          { discountType: "percentage" | "fixed"; discount: string }
        > = {};

        for (const customer of nextCustomers) {
          nextDrafts[customer.pk] = prev[customer.pk] ?? {
            discountType: customer.discountType || "percentage",
            discount: customer.discount != null ? String(customer.discount) : "",
          };
        }

        return nextDrafts;
      });
    }
    if (sr.ok && sr.data?.sales) {
      setSales(sr.data.sales.filter((sale) => sale.entityType === "SALE"));
    }
    if (rr.ok && rr.data?.returns) {
      setReturns(rr.data.returns);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (actionMenuRef.current?.contains(event.target as Node)) return;
      setOpenActionId(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const customerStats = useMemo(() => {
    const map: Record<string, CustomerStats> = {};

    for (const sale of sales) {
      const customerId = sale.customerId || "__walkin__";
      const row = map[customerId] || { ...emptyStats };
      const total = Number(sale.total || 0);
      const paidAmount =
        sale.paidAmount != null
          ? Number(sale.paidAmount || 0)
          : sale.paymentStatus === "fully_paid"
            ? total
            : 0;

      row.total += total;
      row.paid += paidAmount;
      row.due = row.total - row.paid;
      map[customerId] = row;
    }

    for (const saleReturn of returns) {
      const originalSale = sales.find((sale) => sale.pk === `SALE#${saleReturn.originalSaleId}`);
      const customerId = originalSale?.customerId || "__walkin__";
      const row = map[customerId] || { ...emptyStats };
      row.returnDue += Number(saleReturn.total || 0);
      map[customerId] = row;
    }

    return map;
  }, [returns, sales]);

  const getStats = useCallback((customer: Customer): CustomerStats => {
    return customerStats[customer.pk.replace("CUSTOMER#", "")] || emptyStats;
  }, [customerStats]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = customers.filter((customer) => {
      return (
        !q ||
        (customer.name || "").toLowerCase().includes(q) ||
        (customer.mobile || "").includes(q) ||
        (customer.email || "").toLowerCase().includes(q) ||
        (customer.customerNumber || "").toLowerCase().includes(q)
      );
    });
    if (sortDir === null) return list;
    return [...list].sort((a, b) => {
      const diff = getStats(a).total - getStats(b).total;
      return sortDir === "desc" ? -diff : diff;
    });
  }, [customers, search, sortDir, getStats]);

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
    if (!confirm(`Delete ${selectedIds.size} selected customer(s)? This cannot be undone.`)) return;
    for (const pk of selectedIds) await api(`/api/customers/${pk.replace("CUSTOMER#", "")}`, { method: "DELETE" });
    setSelectedIds(new Set());
    loadData();
  }

  const footerTotals = useMemo(() => {
    return filtered.reduce(
      (totals, customer) => {
        const stats = getStats(customer);
        totals.total += stats.total;
        totals.paid += stats.paid;
        totals.due += stats.due;
        totals.ret += stats.returnDue;
        return totals;
      },
      { total: 0, paid: 0, due: 0, ret: 0 }
    );
  }, [filtered, getStats]);

  async function deleteCustomer(customer: Customer) {
    if (!confirm(`Delete "${customer.name}"? This cannot be undone.`)) return;
    const id = customer.pk.replace("CUSTOMER#", "");
    await api(`/api/customers/${id}`, { method: "DELETE" });
    setOpenActionId(null);
    loadData();
  }

  function openEdit(customer: Customer) {
    setEditCustomer(customer);
    setEditForm({ ...customer, salutation: customer.salutation || "Mr" });
    setEditMsg(null);
    setOpenActionId(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editCustomer) return;

    setEditMsg(null);
    setEditSaving(true);
    const id = editCustomer.pk.replace("CUSTOMER#", "");
    const name = [editForm.salutation, editForm.firstName, editForm.lastName].filter(Boolean).join(" ") || editForm.name || "";
    const res = await api(`/api/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...editForm,
        name,
        discount: Number(editForm.discount ?? 0),
      }),
    });
    setEditSaving(false);

    if (!res.ok) {
      setEditMsg("Failed to save changes.");
      return;
    }

    setEditCustomer(null);
    loadData();
  }

  function setDiscountDraft(
    customerPk: string,
    patch: Partial<{ discountType: "percentage" | "fixed"; discount: string }>
  ) {
    setDiscountDrafts((prev) => ({
      ...prev,
      [customerPk]: {
        discountType: prev[customerPk]?.discountType || "percentage",
        discount: prev[customerPk]?.discount ?? "",
        ...patch,
      },
    }));
  }

  async function saveInlineDiscount(customer: Customer) {
    const draft = discountDrafts[customer.pk] || {
      discountType: customer.discountType || "percentage",
      discount: customer.discount != null ? String(customer.discount) : "",
    };
    const nextDiscount = Number(draft.discount || 0);
    const id = customer.pk.replace("CUSTOMER#", "");

    setSavingDiscountId(customer.pk);
    const res = await api(`/api/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        discountType: draft.discountType,
        discount: Number.isFinite(nextDiscount) ? nextDiscount : 0,
      }),
    });
    setSavingDiscountId(null);
    if (!res.ok) return;

    setCustomers((prev) =>
      prev.map((item) =>
        item.pk === customer.pk
          ? {
              ...item,
              discountType: draft.discountType,
              discount: Number.isFinite(nextDiscount) ? nextDiscount : 0,
            }
          : item
      )
    );
  }

  function copyToClipboard() {
    const text = filtered
      .map((customer) => {
        const stats = getStats(customer);
        const displayId =
          customer.customerNumber ||
          `CU${String(customers.indexOf(customer) + 1).padStart(4, "0")}`;

        return [
          displayId,
          customer.name,
          customer.mobile || customer.phone || "",
          customer.email || "",
          stats.total.toFixed(2),
          stats.paid.toFixed(2),
          stats.due.toFixed(2),
          formatDiscountType(customer),
          formatDiscountAmount(customer),
        ].join("\t");
      })
      .join("\n");

    navigator.clipboard.writeText(text).catch(() => {});
  }

  function downloadCSV() {
    const header =
      "Customer ID,Customer Name,Mobile,Email,Total,Paid,Due,Discount Type,Discount Amount";
    const rows = filtered.map((customer) => {
      const stats = getStats(customer);
      const displayId =
        customer.customerNumber ||
        `CU${String(customers.indexOf(customer) + 1).padStart(4, "0")}`;

      return [
        displayId,
        `"${customer.name}"`,
        customer.mobile || customer.phone || "",
        customer.email || "",
        stats.total.toFixed(2),
        stats.paid.toFixed(2),
        stats.due.toFixed(2),
        formatDiscountType(customer),
        formatDiscountAmount(customer),
      ].join(",");
    });

    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const pageButtons = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  }, [page, totalPages]);

  return (
    <PageScaffold title="Customers List" subtitle="View/Search Customers">
      <div className="bg-white border border-slate-200 rounded-sm">
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Customers List</h2>
          <Link
            href="/customers/new"
            className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded transition-colors"
          >
            + New Customer
          </Link>
        </div>

        <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Show</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="border border-slate-300 rounded px-2 py-1 text-sm bg-white outline-none"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
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
            ].map((button) => (
              <button
                key={button.label}
                onClick={button.fn}
                className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
              >
                {button.label}
              </button>
            ))}
            {selectedIds.size > 0 && (
              <button type="button" onClick={handleBulkDelete} className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedIds.size})
              </button>
            )}

            <div className="flex items-center gap-1 ml-1">
              <span className="text-sm text-slate-600">Sort:</span>
              <select
                value={sortDir ?? ""}
                onChange={(e) => { setSortDir(e.target.value === "" ? null : e.target.value as "asc" | "desc"); setPage(1); }}
                className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-blue-400"
              >
                <option value="">Default</option>
                <option value="desc">Total: High → Low</option>
                <option value="asc">Total: Low → High</option>
              </select>
            </div>

            <div className="flex items-center gap-1 ml-1">
              <span className="text-sm text-slate-600">Search:</span>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400 w-36"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-blue-600 text-white text-xs">
                <th className="px-3 py-2.5 w-8">
                  <input type="checkbox" className="rounded" checked={allPageSelected} onChange={toggleAll} />
                </th>
                {[
                  ["Customer ID", "text-left"],
                  ["Customer Name", "text-left"],
                  ["Mobile", "text-left"],
                  ["Email", "text-left"],
                  ["Total", "text-right"],
                  ["Paid", "text-right"],
                  ["Due", "text-right"],
                  ["Discount Type", "text-center"],
                  ["Discount Amount", "text-right"],
                  ["Action", "text-center"],
                ].map(([heading, align]) => (
                  <th key={heading} className={`px-3 py-2.5 font-semibold ${align}`}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-slate-400 text-sm">
                    Loading...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-slate-400 text-sm">
                    No customers found
                  </td>
                </tr>
              ) : (
                paginated.map((customer, index) => {
                  const stats = getStats(customer);
                  const discountDraft = discountDrafts[customer.pk] || {
                    discountType: customer.discountType || "percentage",
                    discount: customer.discount != null ? String(customer.discount) : "",
                  };
                  const displayId =
                    customer.customerNumber ||
                    `CU${String(customers.indexOf(customer) + 1).padStart(4, "0")}`;

                  return (
                    <tr
                      key={customer.pk}
                      className={`border-t border-slate-100 hover:bg-blue-50/30 ${
                        index % 2 === 1 ? "bg-slate-50/40" : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" className="rounded" checked={selectedIds.has(customer.pk)} onChange={() => toggleId(customer.pk)} />
                      </td>
                      <td className="px-3 py-2 text-slate-700 font-mono text-xs">{displayId}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{customer.name}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {customer.mobile || customer.phone || "-"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{customer.email || "-"}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{stats.total.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{stats.paid.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{stats.due.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <select
                          value={discountDraft.discountType}
                          onChange={(e) =>
                            setDiscountDraft(customer.pk, {
                              discountType: e.target.value as "percentage" | "fixed",
                            })
                          }
                          className="w-full border border-slate-200 rounded px-2 py-1 text-xs bg-white outline-none focus:border-blue-400"
                        >
                          <option value="percentage">Percentage</option>
                          <option value="fixed">Fixed</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={discountDraft.discount}
                            onChange={(e) =>
                              setDiscountDraft(customer.pk, { discount: e.target.value })
                            }
                            className="w-24 border border-slate-200 rounded px-2 py-1 text-xs text-right outline-none focus:border-blue-400"
                            placeholder="0.00"
                          />
                          <button
                            type="button"
                            onClick={() => saveInlineDiscount(customer)}
                            disabled={savingDiscountId === customer.pk}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold disabled:opacity-60"
                          >
                            {savingDiscountId === customer.pk ? "..." : "Save"}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <DropdownMenu>
                          <Link
                            href={`/sales/list?customer=${encodeURIComponent(customer.name)}`}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <History className="w-3.5 h-3.5 text-blue-600" />
                            History
                          </Link>
                          <button
                            type="button"
                            onClick={() => setViewCustomer(customer)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            View Details
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(customer)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Pencil className="w-3.5 h-3.5 text-teal-600" />
                            Edit Details
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCustomer(customer)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-red-600 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
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
                  <td colSpan={4} className="px-3 py-2.5 text-right text-slate-600">
                    Total
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-800">
                    {footerTotals.total.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-800">
                    {footerTotals.paid.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-800">
                    {footerTotals.due.toFixed(2)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 text-sm text-slate-500">
          <div>
            {loading
              ? "Loading..."
              : `Showing ${filtered.length === 0 ? 0 : (page - 1) * perPage + 1} to ${Math.min(
                  page * perPage,
                  filtered.length
                )} of ${filtered.length} entries`}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-3 py-1 border border-slate-200 rounded text-xs disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            {pageButtons.map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                className={`px-3 py-1 border rounded text-xs ${
                  pageNumber === page
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-slate-200 rounded text-xs disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {editCustomer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-10 overflow-y-auto pb-10">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">Edit Customer - {editCustomer.name}</h2>
              <button
                onClick={() => setEditCustomer(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">
                    First Name<span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={editForm.salutation || "Mr"}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, salutation: e.target.value }))}
                      className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400 bg-white"
                    >
                      <option>Mr</option>
                      <option>Miss</option>
                    </select>
                    <input
                      required
                      placeholder="First name"
                      value={editForm.firstName || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, firstName: e.target.value }))}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Last Name</label>
                  <input
                    placeholder="Last name"
                    value={editForm.lastName || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Mobile Number</label>
                  <input
                    value={editForm.mobile || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, mobile: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={editForm.email || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Birthday</label>
                  <DateInput
                    value={editForm.dob || ""}
                    onChange={(v) => setEditForm((prev) => ({ ...prev, dob: v }))}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Address</label>
                  <textarea
                    value={editForm.address || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                    rows={3}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 resize-y"
                  />
                </div>
              </div>

              {editMsg && <p className="text-sm text-red-600">{editMsg}</p>}

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditCustomer(null)}
                  className="px-4 py-2 border border-slate-300 rounded text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-semibold disabled:opacity-60"
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewCustomer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-10 overflow-y-auto pb-10">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">Customer Details</h2>
              <button
                onClick={() => setViewCustomer(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><b>Name:</b> {viewCustomer.name}</div>
              <div><b>Customer ID:</b> {viewCustomer.customerNumber || "-"}</div>
              <div><b>Mobile:</b> {viewCustomer.mobile || "-"}</div>
              <div><b>Whatsapp:</b> {viewCustomer.phone || "-"}</div>
              <div><b>Email:</b> {viewCustomer.email || "-"}</div>
              <div><b>Country:</b> {viewCustomer.country || "-"}</div>
              <div><b>City:</b> {viewCustomer.city || "-"}</div>
              <div><b>Previous Due:</b> {Number(viewCustomer.previousDue || 0).toFixed(2)}</div>
              <div><b>Discount Type:</b> {formatDiscountType(viewCustomer)}</div>
              <div><b>Discount Amount:</b> {formatDiscountAmount(viewCustomer)}{viewCustomer.discountType === "percentage" && viewCustomer.discount != null ? "%" : ""}</div>

              {/* Sales totals */}
              {(() => {
                const s = getStats(viewCustomer);
                return (
                  <>
                    <div className="sm:col-span-2 border-t border-slate-100 pt-2 mt-1" />
                    <div><b>Total Sales:</b> <span className="text-slate-700">{s.total.toFixed(2)}</span></div>
                    <div><b>Total Paid:</b> <span className="text-green-700">{s.paid.toFixed(2)}</span></div>
                    <div><b>Due Balance:</b> <span className={s.due > 0 ? "text-red-600 font-semibold" : "text-slate-700"}>{s.due.toFixed(2)}</span></div>

                  </>
                );
              })()}

              <div className="sm:col-span-2"><b>Address:</b> {viewCustomer.address || "-"}</div>
              <div className="sm:col-span-2">
                <b>Created At:</b>{" "}
                {viewCustomer.createdAt
                  ? (() => { const d = new Date(viewCustomer.createdAt); const dd = String(d.getDate()).padStart(2,"0"); const mm = String(d.getMonth()+1).padStart(2,"0"); const hh = String(d.getHours()).padStart(2,"0"); const min = String(d.getMinutes()).padStart(2,"0"); return `${dd}-${mm}-${d.getFullYear()} ${hh}:${min}`; })()
                  : "-"}
              </div>
              <div className="sm:col-span-2">
                <b>Updated At:</b>{" "}
                {viewCustomer.updatedAt
                  ? (() => { const d = new Date(viewCustomer.updatedAt); const dd = String(d.getDate()).padStart(2,"0"); const mm = String(d.getMonth()+1).padStart(2,"0"); const hh = String(d.getHours()).padStart(2,"0"); const min = String(d.getMinutes()).padStart(2,"0"); return `${dd}-${mm}-${d.getFullYear()} ${hh}:${min}`; })()
                  : "-"}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-5 pb-4">
              <button
                onClick={() => setViewCustomer(null)}
                className="px-4 py-2 border border-slate-300 rounded text-sm hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageScaffold>
  );
}
