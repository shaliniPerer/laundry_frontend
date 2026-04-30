"use client";

import { useState } from "react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

function fmt(n: number | undefined) {
  return Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDisplay(iso: string) {
  if (!iso) return "";
  const p = iso.split("-");
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : iso;
}
function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

type PLData = {
  period?: { from: string; to: string };
  openingStock?: number;
  totalSales?: number;
  totalSalesTax?: number;
  totalOtherChargesSales?: number;
  totalDiscountSales?: number;
  paidPaymentSales?: number;
  salesDue?: number;
  totalExpense?: number;
  totalSalesReturn?: number;
  salesReturnDue?: number;
  grossProfit?: number;
  netProfit?: number;
  itemWise?: { name: string; qty: number; salesPrice: number; purchasePrice: number; grossProfit: number }[];
};

type InvoiceRow = { saleNumber?: string; deliveryDate?: string; total?: number; paymentStatus?: string; pk?: string };

export default function ProfitLossPage() {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(todayISO);
  const [showPicker, setShowPicker] = useState(false);
  const [data, setData] = useState<PLData | null>(null);
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"item" | "invoice">("item");

  async function load() {
    setLoading(true);
    setShowPicker(false);
    const [plRes, salesRes] = await Promise.all([
      api<PLData>(`/api/reports/profit-loss?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
      api<{ sales: InvoiceRow[] }>("/api/sales"),
    ]);
    setLoading(false);
    if (plRes.ok && plRes.data) setData(plRes.data);
    if (salesRes.ok && salesRes.data?.sales) {
      setInvoiceRows(salesRes.data.sales.filter((s) => {
        const d = (s as { deliveryDate?: string; entityType?: string }).deliveryDate ?? "";
        const et = (s as { entityType?: string }).entityType;
        return et === "SALE" && (!from || d >= from) && (!to || d <= to);
      }));
    }
  }

  const d = data;
  const rangeLabel = `${fmtDisplay(from)} - ${fmtDisplay(to)}`;

  function exportCSV(side: "left" | "right") {
    const lines: string[] = [];
    if (side === "left") {
      lines.push("Item,Value");
      lines.push(`Opening Stock,${fmt(d?.openingStock)}`);
      lines.push(`Total Purchase,0.00`);
      lines.push(`Paid Payment (Purchase),0.00`);
      lines.push(`Purchase Due,0.00`);
      lines.push(`Total Purchase Return,0.00`);
      lines.push(`Gross Profit,${fmt(d?.grossProfit)}`);
      lines.push(`Net Profit,${fmt(d?.netProfit)}`);
    } else {
      lines.push("Item,Value");
      lines.push(`Total Expense,${fmt(d?.totalExpense)}`);
      lines.push(`Total Sales,${fmt(d?.totalSales)}`);
      lines.push(`Total Discount on Sales,${fmt(d?.totalDiscountSales)}`);
      lines.push(`Paid Payment (Sales),${fmt(d?.paidPaymentSales)}`);
      lines.push(`Sales Due,${fmt(d?.salesDue)}`);
      lines.push(`Total Sales Return,${fmt(d?.totalSalesReturn)}`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `pl_${side}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const Row = ({ label, value, blue, red }: { label: string; value: string; blue?: boolean; red?: boolean }) => (
    <div className={`flex items-center justify-between py-1.5 border-b border-slate-100 text-sm ${blue ? "text-blue-600 font-semibold" : ""}`}>
      <span className={red ? "text-red-500" : blue ? "text-blue-500" : "text-slate-600"}>{label}</span>
      <span className={`font-medium ${red ? "text-red-500" : "text-slate-800"}`}>{value}</span>
    </div>
  );

  return (
    <PageScaffold title="Profit & Loss Report" subtitle="">
      {/* Date selector */}
      <div className="bg-white border border-slate-200 rounded-sm px-4 py-3 mb-4">
        <p className="text-xs font-semibold text-slate-500 mb-2">Select Date</p>
        <div className="relative inline-block">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-2 border border-slate-300 rounded px-3 py-1.5 text-sm bg-white hover:bg-slate-50 transition-colors"
          >
            {rangeLabel} ▾
          </button>
          {showPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 p-4 flex gap-4 items-end min-w-72">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">From</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">To</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <button onClick={load} disabled={loading} className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded disabled:opacity-60">
                {loading ? "…" : "Apply"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main two-column P&L */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Left column — Purchase side */}
        <div className="bg-white border border-slate-200 rounded-sm">
          <div className="flex justify-end px-4 pt-3 pb-2 border-b border-slate-100">
            <button onClick={() => exportCSV("left")} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-1.5 rounded inline-flex items-center gap-1 transition-colors">≡ Export ▾</button>
          </div>
          <div className="px-4 pb-4 pt-2">
            <Row label="Opening Stock" value={fmt(d?.openingStock)} />
            <Row label="Purchase" value="" blue />
            <Row label="Total Purchase" value="0.00" />
            <Row label="Total Purchase Tax" value="0.00" />
            <Row label="Total Other Charges of Purchase" value="0.00" />
            <Row label="Total Discount on Purchase" value="0.00" />
            <Row label="Paid Payment" value="0.00" />
            <Row label="Purchase Due" value="0.00" red />
            <Row label="Purchase Return" value="" blue />
            <Row label="Total Purchase Return" value="0.00" />
            <Row label="Total Purchase Return Tax" value="0.00" />
            <Row label="Total Other Charges of Purchase Return" value="0.00" />
            <Row label="Total Discount on Purchase Return" value="0.00" />
            <Row label="Paid Payment" value="0.00" />
            <Row label="Purchase Return Due" value="0.00" red />
          </div>
          <div className="flex justify-end px-4 pb-3">
            <button onClick={() => exportCSV("left")} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-1.5 rounded inline-flex items-center gap-1 transition-colors">≡ Export ▾</button>
          </div>
          <div className="px-4 pb-4 border-t border-slate-200 pt-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Gross Profit</span>
              <span className="font-bold text-slate-900">{fmt(d?.grossProfit)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Net Profit</span>
              <span className="font-bold text-slate-900">{fmt(d?.netProfit)}</span>
            </div>
          </div>
        </div>

        {/* Right column — Sales side */}
        <div className="bg-white border border-slate-200 rounded-sm">
          <div className="flex justify-end px-4 pt-3 pb-2 border-b border-slate-100">
            <button onClick={() => exportCSV("right")} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-1.5 rounded inline-flex items-center gap-1 transition-colors">≡ Export ▾</button>
          </div>
          <div className="px-4 pb-4 pt-2">
            <Row label="Total Expense" value={fmt(d?.totalExpense)} />
            <Row label="Sales" value="" blue />
            <Row label="Total Sales" value={fmt(d?.totalSales)} />
            <Row label="Total Sales Tax" value={fmt(d?.totalSalesTax)} />
            <Row label="Total Other Charges of Sales" value={fmt(d?.totalOtherChargesSales)} />
            <Row label="Total Discount on Sales" value={fmt(d?.totalDiscountSales)} />
            <Row label="Paid Payment" value={fmt(d?.paidPaymentSales)} />
            <Row label="Sales Due" value={fmt(d?.salesDue)} red />
            <Row label="Sales Return" value="" blue />
            <Row label="Total Sales Return" value={fmt(d?.totalSalesReturn)} />
            <Row label="Total Sales Return Tax" value="0.00" />
            <Row label="Total Other Charges of Sales Return" value="0.00" />
            <Row label="Total Discount on Sales Return" value="0.00" />
            <Row label="Paid Payment" value="0.00" />
            <Row label="Sales Return Due" value={fmt(d?.salesReturnDue)} red />
          </div>
        </div>
      </div>

      {/* Item/Invoice Wise Profit */}
      <div className="bg-white border border-slate-200 rounded-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Select Date</p>
            <div className="text-sm text-slate-700 border border-slate-300 rounded px-3 py-1.5">{rangeLabel} ▾</div>
          </div>
        </div>
        <div className="border-b border-slate-200 flex">
          <button
            onClick={() => setTab("item")}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === "item" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            Item Wise Profit
          </button>
          <button
            onClick={() => setTab("invoice")}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === "invoice" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            Invoice Wise Profit
          </button>
        </div>
        <div className="flex justify-end px-4 py-2">
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-1.5 rounded inline-flex items-center gap-1 transition-colors">≡ Export ▾</button>
        </div>
        <div className="overflow-x-auto">
          {tab === "item" ? (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white text-xs">
                  {["#", "Item Name", "Sales Quantity", "Sales Price", "Purchase Price", "Gross Profit"].map((h) => (
                    <th key={h} className={`px-3 py-2.5 font-semibold ${h === "#" ? "w-12 text-left" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!data ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center text-slate-400 text-sm">Select a date range and click Apply</td></tr>
                ) : (d?.itemWise ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center text-slate-400 text-sm">No item data found</td></tr>
                ) : (d?.itemWise ?? []).map((item, i) => (
                  <tr key={i} className={`border-t border-slate-100 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                    <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2 text-slate-800 font-medium">{item.name}</td>
                    <td className="px-3 py-2 text-slate-700">{item.qty.toFixed(2)}</td>
                    <td className="px-3 py-2 text-slate-700"></td>
                    <td className="px-3 py-2 text-slate-700">{fmt(item.salesPrice)}</td>
                    <td className="px-3 py-2 text-slate-700">{fmt(item.purchasePrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white text-xs">
                  {["#", "Invoice Number", "Sale Date", "Customer", "Total(LKR)", "Paid(LKR)", "Due(LKR)"].map((h) => (
                    <th key={h} className="px-3 py-2.5 font-semibold text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!data ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-400 text-sm">Select a date range and click Apply</td></tr>
                ) : invoiceRows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-400 text-sm">No invoices found</td></tr>
                ) : invoiceRows.map((s, i) => (
                  <tr key={i} className={`border-t border-slate-100 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                    <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2 text-slate-700 font-mono text-xs">{s.saleNumber || s.pk?.slice(-8) || ""}</td>
                    <td className="px-3 py-2 text-slate-600">{fmtDisplay(s.deliveryDate ?? "")}</td>
                    <td className="px-3 py-2 text-slate-600">{(s as { customerId?: string }).customerId ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{fmt(s.total)}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{s.paymentStatus === "fully_paid" ? fmt(s.total) : "0.00"}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{s.paymentStatus !== "fully_paid" ? fmt(s.total) : "0.00"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageScaffold>
  );
}
