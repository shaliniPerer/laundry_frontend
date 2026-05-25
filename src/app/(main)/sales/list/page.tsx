"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageScaffold } from "@/components/PageScaffold";
import { DropdownMenu } from "@/components/DropdownMenu";
import { DateInput } from "@/components/DateInput";
import { api } from "@/lib/api";
import {
  ShoppingBag,
  Plus,
  Search,
  ChevronDown,
  Eye,
  Pencil,
  CreditCard,
  Printer,
  FileText,
  ReceiptText,
  RotateCcw,
  Trash2,
  Copy,
  FileSpreadsheet,
  Columns3,
  Banknote,
  Building2,
  MessageSquare,
  Check,
  Loader2,
} from "lucide-react";

type MultiPayment = { id: string; type: "Cash" | "Card" | "Bank Transfer"; amount: number; cardLast4?: string; note?: string };
const PAYMENT_TYPES = ["Cash", "Card", "Bank Transfer"] as const;

type Sale = {
  pk: string;
  saleNumber?: string;
  createdAt?: string;
  deliveryDate?: string;
  status?: string;
  referenceNo?: string;
  customerName?: string;
  customerMobile?: string;
  total?: number;
  paidAmount?: number;
  paymentStatus?: string;
  createdBy?: string;
  payments?: { id: string; date: string; paymentType: string; note?: string; amount: number }[];
  lines?: { description: string; qty: number; unitPrice: number; discount?: number; lineTotal: number }[];
};

const STATUS_FLOW = ["Pending", "Processing", "Ready to Deliver", "Delivered", "Returned"] as const;
type OrderStatus = typeof STATUS_FLOW[number];

type Customer = { pk: string; name: string; mobile?: string };

function fmt(n?: number) {
  return `LKR ${Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d?: string) {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return d;
}

function saleOccurredDate(s: Sale) {
  return (s.createdAt || "").slice(0, 10);
}

const PAGE_SIZES = [10, 25, 50, 100];

export default function SalesListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerFromQuery = searchParams.get("customer") ?? "";
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState(customerFromQuery);
  const [customerSearch, setCustomerSearch] = useState(customerFromQuery);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [createdByFilter, setCreatedByFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openSmsMenu, setOpenSmsMenu] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  const [paySale, setPaySale] = useState<Sale | null>(null);
  const [payType, setPayType] = useState<"Cash" | "Card" | "Bank Transfer">("Cash");
  const [payAmount, setPayAmount] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [payNote, setPayNote] = useState("");
  const [multiPayments, setMultiPayments] = useState<MultiPayment[]>([]);
  const [submittingPay, setSubmittingPay] = useState(false);
  const [payMsg, setPayMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // View Payments modal
  const [viewPaySale, setViewPaySale] = useState<Sale | null>(null);
  const [viewPayments, setViewPayments] = useState<{ id: string; date: string; paymentType: string; note?: string; amount: number }[]>([]);
  const [viewPayLoading, setViewPayLoading] = useState(false);

  async function openViewPaymentsModal(sale: Sale) {
    setViewPaySale(sale);
    setViewPayments([]);
    setViewPayLoading(true);
    const id = saleId(sale);
    const res = await api<{ payments: { id: string; date: string; paymentType: string; note?: string; amount: number }[] }>(`/api/sales/${id}/payments`);
    if (res.ok && res.data?.payments) setViewPayments(res.data.payments);
    setViewPayLoading(false);
  }

  const menuRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);

  // SMS send state: record of saleId -> "idle" | "sending" | "sent" | "error"
  const [smsState, setSmsState] = useState<Record<string, "idle" | "sending" | "sent" | "error">>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    const [sr, cr] = await Promise.all([
      api<{ sales: Sale[] }>("/api/sales"),
      api<{ customers: Customer[] }>("/api/customers"),
    ]);
    if (sr.ok && sr.data?.sales) {
      setSales(sr.data.sales.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")));
    }
    if (cr.ok && cr.data?.customers) setCustomers(cr.data.customers);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setCustomerFilter(customerFromQuery);
    setCustomerSearch(customerFromQuery);
    setPage(1);
  }, [customerFromQuery]);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) setShowCustomerDrop(false);
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-sms-menu='true']")) setOpenSmsMenu(null);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const createdByOptions = Array.from(new Set(sales.map((s) => s.createdBy).filter(Boolean)));

  const filtered = sales.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.saleNumber?.toLowerCase().includes(q) ||
      s.customerName?.toLowerCase().includes(q) ||
      s.status?.toLowerCase().includes(q) ||
      s.createdBy?.toLowerCase().includes(q);
    const matchCustomer = !customerFilter || s.customerName === customerFilter;
    const matchCreatedBy = !createdByFilter || s.createdBy === createdByFilter;
    const matchFrom = !fromDate || (s.deliveryDate ?? "") >= fromDate;
    const matchTo = !toDate || (s.deliveryDate ?? "") <= toDate;
    return matchSearch && matchCustomer && matchCreatedBy && matchFrom && matchTo;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalInvoices = filtered.length;
  const totalAmount = filtered.reduce((s, r) => s + Number(r.total ?? 0), 0);
  const totalReceived = filtered.reduce((s, r) => s + Number(r.paidAmount ?? 0), 0);
  const totalDue = totalAmount - totalReceived;

  async function handleDelete(sale: Sale) {
    if (!confirm(`Delete invoice ${sale.saleNumber}? This cannot be undone.`)) return;
    const id = sale.pk.replace("SALE#", "");
    setDeleting(id);
    await api(`/api/sales/${id}`, { method: "DELETE" });
    setDeleting(null);
    setOpenMenu(null);
    loadData();
  }

  function saleId(s: Sale) { return s.pk.replace("SALE#", ""); }

  async function handleSendSms(sale: Sale) {
    const id = saleId(sale);
    if (!sale.customerMobile) return;
    setSmsState(prev => ({ ...prev, [id]: "sending" }));
    const res = await api(`/api/sales/${id}/send-sms`, { method: "POST" });
    if (res.ok) {
      setSmsState(prev => ({ ...prev, [id]: "sent" }));
    } else {
      setSmsState(prev => ({ ...prev, [id]: "error" }));
      setTimeout(() => setSmsState(prev => ({ ...prev, [id]: "idle" })), 5000);
    }
  }

  const payGrandTotal = paySale ? Number(paySale.total ?? 0) : 0;
  const payPreviouslyPaid = paySale ? Number(paySale.paidAmount ?? 0) : 0;
  const payMultiTotalPaid = multiPayments.reduce((s, p) => s + p.amount, 0);
  const payBalance = payGrandTotal - payPreviouslyPaid - payMultiTotalPaid;

  function openPaymentModal(sale: Sale) {
    const due = Number(sale.total ?? 0) - Number(sale.paidAmount ?? 0);
    setPaySale(sale);
    setMultiPayments([]);
    setPayAmount(Math.max(0, due).toFixed(2));
    setPayType("Cash");
    setCardLast4("");
    setPayNote("");
    setPayMsg(null);
  }

  function addMultiPayment() {
    const amt = parseFloat(payAmount);
    if (!payAmount || isNaN(amt) || amt <= 0) return;
    if (payType === "Card" && cardLast4.length !== 4) { setPayMsg({ type: "err", text: "Enter last 4 digits of card." }); return; }
    setMultiPayments(prev => [...prev, {
      id: `pay-${Date.now()}`,
      type: payType,
      amount: amt,
      cardLast4: payType === "Card" ? cardLast4 : undefined,
      note: payType !== "Card" ? payNote : undefined,
    }]);
    setPayAmount(Math.max(0, payBalance - amt).toFixed(2));
    setCardLast4("");
    setPayNote("");
    setPayMsg(null);
  }

  function removeMultiPayment(id: string) {
    setMultiPayments(prev => prev.filter(p => p.id !== id));
  }

  async function handlePayAll() {
    if (!paySale) return;
    if (multiPayments.length === 0) { setPayMsg({ type: "err", text: "Add at least one payment entry." }); return; }
    setSubmittingPay(true);
    setPayMsg(null);

    const payments = multiPayments.map(p => ({
      id: p.id,
      date: new Date().toISOString().slice(0, 10),
      paymentType: p.type,
      note: p.type === "Card" ? `Card ****${p.cardLast4}` : (p.note ?? ""),
      amount: p.amount,
    }));

    const id = saleId(paySale);
    let ok = true;
    for (const p of payments) {
      const res = await api(`/api/sales/${id}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount: p.amount, paymentType: p.paymentType, date: p.date, note: p.note }),
      });
      if (!res.ok) ok = false;
    }

    if (!ok) {
      setPayMsg({ type: "err", text: "Some payments failed to record." });
      setSubmittingPay(false);
    } else {
      setSubmittingPay(false);
      setPaySale(null);
      loadData();
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    const sale = sales.find((s) => saleId(s) === id);
    // Optimistic update
    setSales((prev) => prev.map((s) => saleId(s) === id ? { ...s, status: newStatus } : s));
    await api(`/api/sales/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status: newStatus,
        customerPhone: sale?.customerMobile,
        customerName: sale?.customerName,
      }),
    });
  }

  // CSV export
  function exportCSV() {
    const headers = ["Sales Date", "Deliver Date", "Sales Code", "Sales Status", "Customer Name", "Total", "Paid", "Due", "Payment Status", "Created By"];
    const rows = filtered.map((s) => [
      fmtDate(saleOccurredDate(s)),
      fmtDate(s.deliveryDate),
      s.saleNumber ?? "",
      s.status ?? "",
      s.customerName ?? "",
      Number(s.total ?? 0).toFixed(2),
      Number(s.paidAmount ?? 0).toFixed(2),
      (Number(s.total ?? 0) - Number(s.paidAmount ?? 0)).toFixed(2),
      s.paymentStatus ?? "",
      s.createdBy ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sales.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function copyTable() {
    const rows = [
      ["Sales Date", "Deliver Date", "Sales Code", "Status", "Customer", "Total", "Paid", "Due", "Payment Status", "Created By"],
      ...filtered.map((s) => [
        fmtDate(saleOccurredDate(s)), fmtDate(s.deliveryDate), s.saleNumber ?? "", s.status ?? "",
        s.customerName ?? "",
        Number(s.total ?? 0).toFixed(2), Number(s.paidAmount ?? 0).toFixed(2),
        (Number(s.total ?? 0) - Number(s.paidAmount ?? 0)).toFixed(2),
        s.paymentStatus ?? "", s.createdBy ?? "",
      ]),
    ].map((r) => r.join("\t")).join("\n");
    navigator.clipboard.writeText(rows).catch(() => {});
  }

  function handlePrint() {
    window.print();
  }

  const filteredCustomers = customers.filter(
    (c) => c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <>
      <style>{`
        @media print {
          body > * { visibility: hidden !important; }
          #sales-print-area,
          #sales-print-area * { visibility: visible !important; }
          #sales-print-area { position: fixed; inset: 0; width: 100%; overflow: visible; }
          .no-print { display: none !important; }
        }
      `}</style>
    <PageScaffold title="Sales List" subtitle="View/Search Sold Items" maxWidthClassName="max-w-[1400px]">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard icon={<ShoppingBag className="w-10 h-10 opacity-30" />} label="Total Invoices" value={totalInvoices.toString()} color="bg-cyan-500" />
        <SummaryCard icon={<Plus className="w-10 h-10 opacity-30" />} label="Total Invoices Amount" value={fmt(totalAmount)} color="bg-green-600" />
        <SummaryCard icon={<RotateCcw className="w-10 h-10 opacity-30" />} label="Total Received Amount" value={fmt(totalReceived)} color="bg-amber-500" />
        <SummaryCard icon={<ShoppingBag className="w-10 h-10 opacity-30" />} label="Total Sales Due" value={fmt(totalDue)} color="bg-red-500" />
      </div>

      <div className="bg-white rounded border border-slate-200 shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-end justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            {/* Customer filter */}
            <div className="relative min-w-48" ref={customerRef}>
              <label className="text-xs text-slate-500 mb-1 block">Customers</label>
              <input
                value={customerSearch}
                onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDrop(true); if (!e.target.value) setCustomerFilter(""); }}
                onFocus={() => setShowCustomerDrop(true)}
                placeholder="Search Name/Mobile"
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400"
              />
              {showCustomerDrop && (
                <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-slate-200 rounded shadow-lg z-20 max-h-40 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => { setCustomerFilter(""); setCustomerSearch(""); setShowCustomerDrop(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
                  >All Customers</button>
                  {filteredCustomers.slice(0, 50).map((c) => (
                    <button
                      key={c.pk}
                      type="button"
                      onClick={() => { setCustomerFilter(c.name); setCustomerSearch(`${c.name}${c.mobile ? ` - ${c.mobile}` : ""}`); setShowCustomerDrop(false); setPage(1); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                    >{c.name}{c.mobile && <span className="text-slate-400"> - {c.mobile}</span>}</button>
                  ))}
                </div>
              )}
            </div>
            {/* Created by */}
            <div className="min-w-36">
              <label className="text-xs text-slate-500 mb-1 block">Created by</label>
              <select
                value={createdByFilter}
                onChange={(e) => { setCreatedByFilter(e.target.value); setPage(1); }}
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white"
              >
                <option value="">-All Users-</option>
                {createdByOptions.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            {/* From Date */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">From Date</label>
              <DateInput value={fromDate} onChange={(v) => { setFromDate(v); setPage(1); }}
                className="border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 w-full bg-white" />
            </div>
            {/* To Date */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">To Date</label>
              <DateInput value={toDate} onChange={(v) => { setToDate(v); setPage(1); }}
                className="border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 w-full bg-white" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/sales/pos")}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded text-sm font-semibold transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> New Sales
          </button>
        </div>

        {/* Table controls */}
        <div className="px-4 py-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            Show
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-400 bg-white">
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            entries
          </div>
          <div className="flex items-center gap-1">
            <ExportBtn icon={<Copy className="w-3.5 h-3.5" />} label="Copy" onClick={copyTable} color="bg-slate-600" />
            <ExportBtn icon={<FileSpreadsheet className="w-3.5 h-3.5" />} label="Excel" onClick={exportCSV} color="bg-green-600" />
            <ExportBtn icon={<FileText className="w-3.5 h-3.5" />} label="PDF" onClick={handlePrint} color="bg-red-500" />
            <ExportBtn icon={<Printer className="w-3.5 h-3.5" />} label="Print" onClick={handlePrint} color="bg-slate-700" />
            <ExportBtn icon={<FileText className="w-3.5 h-3.5" />} label="CSV" onClick={exportCSV} color="bg-green-700" />
            <ExportBtn icon={<Columns3 className="w-3.5 h-3.5" />} label="Columns" onClick={() => {}} color="bg-slate-500" />
            <div className="flex items-center gap-1 ml-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search…"
                className="border border-slate-300 rounded px-3 py-1 text-sm outline-none focus:border-blue-400 w-44"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto" ref={menuRef} id="sales-print-area">
          {loading ? (
            <p className="p-8 text-center text-slate-400 text-sm">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-slate-400 text-sm">No sales found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-700 text-white text-xs">
                  <th className="px-3 py-2.5 text-left w-8 no-print">
                    <input type="checkbox" className="rounded" />
                  </th>
                  {(["Sales Date", "Deliver Date", "Sales Code", "Customer Name", "Total", "Paid", "Due", "Payment Status", "Created By"] as string[]).map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap no-print">Sales Status</th>
                  <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap no-print">Send SMS</th>
                  <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap no-print">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((s, i) => {
                  const id = saleId(s);
                  const due = Number(s.total ?? 0) - Number(s.paidAmount ?? 0);
                  const isOpen = openMenu === id;
                  return (
                    <tr key={s.pk} className={`border-t border-slate-100 hover:bg-slate-50 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                      <td className="px-3 py-2 no-print"><input type="checkbox" className="rounded" /></td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(saleOccurredDate(s))}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(s.deliveryDate)}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        <button
                          type="button"
                          onClick={() => router.push(`/sales/${id}/view`)}
                          className="text-blue-700 hover:underline"
                        >
                          {s.saleNumber}
                        </button>
                      </td>
                      <td className="px-3 py-2">{s.customerName}</td>
                      <td className="px-3 py-2 text-right">{Number(s.total ?? 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{Number(s.paidAmount ?? 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{due.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <PaymentBadge 
                          status={s.paymentStatus} 
                          onClick={() => {
                            const pStatus = (s.paymentStatus ?? "").toLowerCase();
                            if (pStatus === "unpaid" || pStatus === "partial") {
                              openPaymentModal(s);
                            }
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">{s.createdBy}</td>
                      <td className="px-3 py-2 no-print">
                        <StatusCell sale={s} onStatusChange={handleStatusChange} />
                      </td>
                      {/* Send SMS tick column */}
                      <td className="px-3 py-2 text-center no-print">
                        {!s.customerMobile ? (
                          <span className="text-slate-300 text-xs">—</span>
                        ) : (() => {
                          const state = smsState[id] ?? "idle";
                          if (state === "sending") return (
                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin mx-auto" />
                          );
                          if (state === "sent") return (
                            <div data-sms-menu="true" className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={() => setOpenSmsMenu(openSmsMenu === id ? null : id)}
                                className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2 py-0.5 text-green-600 text-xs font-semibold"
                              >
                                <Check className="w-3.5 h-3.5" /> Sent <ChevronDown className="w-3 h-3" />
                              </button>
                              {openSmsMenu === id && (
                                <div className="absolute right-0 mt-1 min-w-28 rounded border border-slate-200 bg-white py-1 shadow-lg z-20">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenSmsMenu(null);
                                      handleSendSms(s);
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                                  >
                                    Sent Again
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                          if (state === "error") return (
                            <span className="text-red-500 text-xs font-semibold">Failed</span>
                          );
                          return (
                            <button
                              type="button"
                              title="Send delivery SMS to customer"
                              onClick={() => handleSendSms(s)}
                              className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded px-2 py-0.5 text-xs font-semibold transition-colors"
                            >
                              <MessageSquare className="w-3 h-3" /> SMS
                            </button>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2 no-print">
                        <DropdownMenu buttonClassName="flex items-center gap-1 bg-slate-700 hover:bg-slate-800 text-white text-xs px-3 py-1.5 rounded transition-colors">
                            <ActionItem icon={<Eye className="w-3.5 h-3.5 text-blue-500" />} label="Invoice"
                              onClick={() => { router.push(`/sales/${id}/view`); }} />
                            <ActionItem icon={<Pencil className="w-3.5 h-3.5 text-green-600" />} label="Edit"
                              onClick={() => { router.push(`/sales/pos?id=${id}`); }} />
                            <ActionItem icon={<CreditCard className="w-3.5 h-3.5 text-purple-500" />} label="View Payments"
                              onClick={() => { setOpenMenu(null); openViewPaymentsModal(s); }} />
                            <hr className="my-1 border-slate-100" />
                            <ActionItem icon={<ReceiptText className="w-3.5 h-3.5 text-cyan-600" />} label="POS Invoice"
                              onClick={() => { router.push(`/sales/${id}/view?print=1`); }} />
                            <hr className="my-1 border-slate-100" />
                            <ActionItem icon={<RotateCcw className="w-3.5 h-3.5 text-orange-500" />} label="Sales Return"
                              onClick={() => { router.push(`/sales/returns/list?saleId=${id}&saleCode=${encodeURIComponent(s.saleNumber ?? "")}`); }} />
                            <hr className="my-1 border-slate-100" />
                            <ActionItem icon={<Trash2 className="w-3.5 h-3.5 text-red-600" />} label={deleting === id ? "Deleting…" : "Delete"}
                              onClick={() => handleDelete(s)} danger />
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600">
            <span>Showing {Math.min((page - 1) * pageSize + 1, filtered.length)}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} entries</span>
            <div className="flex items-center gap-1">
              <PagBtn label="Previous" disabled={page === 1} onClick={() => setPage((p) => p - 1)} />
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pg = page <= 4 ? i + 1 : page - 3 + i;
                if (pg < 1 || pg > totalPages) return null;
                return (
                  <PagBtn key={pg} label={pg.toString()} active={pg === page} onClick={() => setPage(pg)} />
                );
              })}
              <PagBtn label="Next" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} />
            </div>
          </div>
        )}
      </div>

      {/* VIEW PAYMENTS MODAL */}
      {viewPaySale && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setViewPaySale(null); }}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-bold text-lg text-slate-800">Payments — Invoice {viewPaySale.saleNumber}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{viewPaySale.customerName}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-sm">
                  <div className="text-slate-500">Grand Total: <span className="font-semibold text-slate-800">LKR {Number(viewPaySale.total ?? 0).toFixed(2)}</span></div>
                  <div className="text-slate-500">Paid: <span className="font-semibold text-green-600">LKR {Number(viewPaySale.paidAmount ?? 0).toFixed(2)}</span></div>
                  <div className="text-slate-500">Due: <span className={`font-semibold ${(Number(viewPaySale.total ?? 0) - Number(viewPaySale.paidAmount ?? 0)) > 0 ? "text-red-600" : "text-green-600"}`}>LKR {(Number(viewPaySale.total ?? 0) - Number(viewPaySale.paidAmount ?? 0)).toFixed(2)}</span></div>
                </div>
                <button type="button" onClick={() => setViewPaySale(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold leading-none">×</button>
              </div>
            </div>

            {/* Payment History */}
            <div className="flex-1 overflow-y-auto p-4">
              {viewPayLoading ? (
                <p className="text-center text-slate-400 py-8 text-sm">Loading payments…</p>
              ) : viewPayments.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">No payments recorded yet.</p>
              ) : (
                <table className="w-full text-sm border border-slate-200 rounded overflow-hidden">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Note</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Amount (LKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewPayments.map((p, i) => (
                      <tr key={p.id} className={`border-t border-slate-100 ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                        <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDate(p.date)}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            p.paymentType === "Cash" ? "bg-green-100 text-green-700" :
                            p.paymentType === "Card" ? "bg-blue-100 text-blue-700" :
                            "bg-purple-100 text-purple-700"
                          }`}>{p.paymentType}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-500 text-xs">{p.note ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold">{Number(p.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-sm font-semibold text-slate-700 text-right">Total Paid:</td>
                      <td className="px-3 py-2 text-right font-bold text-green-600">{viewPayments.reduce((s, p) => s + Number(p.amount), 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 flex gap-3 shrink-0">
              {(Number(viewPaySale.total ?? 0) - Number(viewPaySale.paidAmount ?? 0)) > 0.005 && (
                <button
                  type="button"
                  onClick={() => { setViewPaySale(null); openPaymentModal(viewPaySale); }}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Payment
                </button>
              )}
              <button type="button" onClick={() => setViewPaySale(null)}
                className="ml-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {paySale && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setPaySale(null); }}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="font-bold text-lg text-slate-800">Payment - Invoice {paySale.saleNumber}</h2>
              <div className="text-sm font-semibold text-blue-700">Grand Total: LKR {payGrandTotal.toFixed(2)}</div>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <div className="flex gap-2">
                {PAYMENT_TYPES.map(t => (
                  <button key={t} type="button"
                    onClick={() => { setPayType(t); setCardLast4(""); setPayNote(""); setPayAmount(Math.max(0, payBalance).toFixed(2)); }}
                    className={`flex-1 py-2 rounded text-sm font-semibold border transition-colors flex items-center justify-center gap-1.5
                      ${payType === t ? "bg-blue-600 text-white border-blue-600" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
                    {t === "Cash" && <Banknote className="w-3.5 h-3.5" />}
                    {t === "Card" && <CreditCard className="w-3.5 h-3.5" />}
                    {t === "Bank Transfer" && <Building2 className="w-3.5 h-3.5" />}
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-slate-500 mb-1 block">Amount (LKR)</label>
                  <input type="number" min={0} step={0.01} value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-400"
                    placeholder="0.00" />
                </div>
                {payType === "Card" && (
                  <div className="w-36">
                    <label className="text-xs text-slate-500 mb-1 block">Last 4 Digits</label>
                    <input maxLength={4} value={cardLast4}
                      onChange={e => setCardLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-400 tracking-widest"
                      placeholder="1234" />
                  </div>
                )}
                {payType === "Bank Transfer" && (
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">Reference / Note</label>
                    <input value={payNote} onChange={e => setPayNote(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  </div>
                )}
              </div>

              <button type="button" onClick={addMultiPayment}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-sm font-semibold flex items-center justify-center gap-1 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Payment Entry
              </button>

              {multiPayments.length > 0 && (
                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs">
                      <tr>
                        <th className="px-3 py-1.5 text-left">#</th>
                        <th className="px-3 py-1.5 text-left">Type</th>
                        <th className="px-3 py-1.5 text-left">Detail</th>
                        <th className="px-3 py-1.5 text-right">Amount</th>
                        <th className="px-2 py-1.5 w-7" />
                      </tr>
                    </thead>
                    <tbody>
                      {multiPayments.map((p, i) => (
                        <tr key={p.id} className="border-t border-slate-100">
                          <td className="px-3 py-1.5 text-slate-500">{i + 1}</td>
                          <td className="px-3 py-1.5 font-medium">{p.type}</td>
                          <td className="px-3 py-1.5 text-slate-400 text-xs">
                            {p.type === "Card" ? `****${p.cardLast4}` : (p.note ?? "")}
                          </td>
                          <td className="px-3 py-1.5 text-right font-semibold">{p.amount.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-center">
                            <button type="button" onClick={() => removeMultiPayment(p.id)} className="text-red-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-between items-center text-sm font-semibold bg-slate-50 rounded px-3 py-2">
                <span>Total Paid: <span className="text-green-600">{payMultiTotalPaid.toFixed(2)}</span></span>
                <span>Balance: <span className={payBalance > 0.005 ? "text-red-600" : "text-green-600"}>{payBalance.toFixed(2)}</span></span>
              </div>

              {payMsg && (
                <div className={`px-3 py-2 rounded text-sm ${payMsg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  {payMsg.text}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex gap-3 shrink-0">
              <button type="button" onClick={handlePayAll}
                disabled={submittingPay || multiPayments.length === 0}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded disabled:opacity-50 transition-colors">
                {submittingPay ? "Processing…" : "✓ Pay All"}
              </button>
              <button type="button" onClick={() => setPaySale(null)}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </PageScaffold>
    </>
  );
}

const STATUS_COLORS: Record<string, string> = {
  Pending:            "bg-yellow-50 text-yellow-800 border-yellow-300",
  Processing:         "bg-blue-50 text-blue-800 border-blue-300",
  "Ready to Deliver": "bg-purple-50 text-purple-800 border-purple-300",
  Delivered:          "bg-green-50 text-green-800 border-green-300",
  Returned:           "bg-red-50 text-red-800 border-red-300",
};

function StatusCell({ sale, onStatusChange }: { sale: Sale; onStatusChange: (id: string, s: string) => void }) {
  const status = (sale.status && STATUS_FLOW.includes(sale.status as OrderStatus) ? sale.status : "Pending") as OrderStatus;
  const id = sale.pk.replace("SALE#", "");
  const colorClass = STATUS_COLORS[status] ?? "bg-slate-50 text-slate-700 border-slate-300";
  return (
    <select
      value={status}
      onChange={(e) => onStatusChange(id, e.target.value)}
      className={`border rounded px-1.5 py-0.5 text-[11px] font-semibold cursor-pointer outline-none focus:ring-1 focus:ring-teal-400 no-print ${colorClass}`}
    >
      {STATUS_FLOW.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className={`${color} text-white rounded p-4 flex items-center justify-between`}>
      <div>
        <div className="text-2xl font-bold leading-tight">{value}</div>
        <div className="text-sm opacity-90 mt-1">{label}</div>
        <div className="text-xs opacity-70 mt-2 cursor-pointer hover:opacity-100">More info ›</div>
      </div>
      {icon}
    </div>
  );
}

function PaymentBadge({ status, onClick }: { status?: string; onClick?: () => void }) {
  const s = (status ?? "").toLowerCase();
  const clickableClass = (s === "unpaid" || s === "partial") && onClick ? "cursor-pointer hover:opacity-80" : "";
  
  if (s === "paid") return <span className={`px-2 py-0.5 rounded text-xs bg-green-500 text-white font-semibold ${clickableClass}`} onClick={onClick}>Paid</span>;
  if (s === "partial") return <span className={`px-2 py-0.5 rounded text-xs bg-amber-500 text-white font-semibold ${clickableClass}`} onClick={onClick}>Partial</span>;
  return <span className={`px-2 py-0.5 rounded text-xs bg-red-500 text-white font-semibold ${clickableClass}`} onClick={onClick}>Unpaid</span>;
}

function ActionItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors ${danger ? "text-red-600" : "text-slate-700"}`}
    >
      {icon} {label}
    </button>
  );
}

function ExportBtn({ icon, label, onClick, color }: { icon: React.ReactNode; label: string; onClick: () => void; color: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${color} hover:opacity-90 text-white text-xs px-2.5 py-1 rounded flex items-center gap-1 transition-opacity`}
    >
      {icon} {label}
    </button>
  );
}

function PagBtn({ label, onClick, disabled, active }: { label: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1 rounded border text-xs transition-colors
        ${active ? "bg-blue-600 text-white border-blue-600" : "border-slate-300 text-slate-600 hover:bg-slate-50"}
        ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >{label}</button>
  );
}
