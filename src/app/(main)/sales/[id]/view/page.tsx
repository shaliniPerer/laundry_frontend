"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Printer, FileText, ReceiptText, RotateCcw, Pencil, Globe } from "lucide-react";

type SaleLine = {
  itemId?: string;
  description: string;
  qty: number;
  unitPrice: number;
  discount?: number;
  discountAmount?: number;
  unitCost?: number;
  lineTotal: number;
};

type SalePayment = {
  id: string;
  date: string;
  paymentType: string;
  note?: string;
  amount: number;
};

type Sale = {
  pk: string;
  saleNumber?: string;
  deliveryDate?: string;
  status?: string;
  referenceNo?: string;
  customerName?: string;
  customerMobile?: string;
  total?: number;
  subtotal?: number;
  paidAmount?: number;
  paymentStatus?: string;
  otherCharges?: number;
  discountOnAll?: number;
  discountOnAllType?: string;
  roundOff?: number;
  note?: string;
  createdBy?: string;
  payments?: SalePayment[];
  lines?: SaleLine[];
  createdAt?: string;
};

const COMPANY = {
  name: "Clips Laundry Pvt Ltd",
  address: "No. 168/2 (33/2), Katuwawala,, City:Boralesgamuwa",
  mobile: "0771107108",
  email: "hello@clips.lk",
};

const TERMS = [
  "Please bring this invoice when collecting your garments.",
  "Items not collected within 30 days may be subject to storage handling.",
  "We check every item carefully, but claims should be reported at delivery time.",
  "Special fabric care depends on garment condition and manufacturer instructions.",
];

function fmtDate(d?: string) {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return d;
}

function fmtDateTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function SaleViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const printRef = useRef<HTMLDivElement>(null);

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await api<Sale>(`/api/sales/${id}`);
      if (res.ok && res.data) setSale(res.data);
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    const pdf = searchParams.get("pdf");
    const print = searchParams.get("print");
    if ((pdf === "1" || print === "1") && !loading && sale) {
      setTimeout(() => window.print(), 300);
    }
  }, [loading, sale, searchParams]);

  function handlePrint() { window.print(); }

  function handlePDF() {
    window.print();
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Loading…</div>;
  if (!sale) return <div className="p-8 text-center text-red-500">Invoice not found.</div>;

  const lines = sale.lines ?? [];
  const subtotal = sale.subtotal ?? lines.reduce((s, l) => s + l.lineTotal, 0);
  const otherCharges = sale.otherCharges ?? 0;
  const discountOnAll = sale.discountOnAll ?? 0;
  const roundOff = sale.roundOff ?? 0;
  const grandTotal = sale.total ?? (subtotal + otherCharges - discountOnAll + roundOff);
  const payments = sale.payments ?? [];
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-print, #invoice-print * { visibility: visible !important; }
          #invoice-print { position: fixed; inset: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Breadcrumb + action bar */}
      <div className="no-print bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <nav className="text-sm text-slate-500 flex items-center gap-1">
          <button type="button" onClick={() => router.push("/dashboard")} className="hover:text-slate-700">Home</button>
          <span>›</span>
          <button type="button" onClick={() => router.push("/sales/list")} className="hover:text-slate-700">Sales List</button>
          <span>›</span>
          <button type="button" onClick={() => router.push("/sales/new")} className="hover:text-slate-700">New Sales</button>
          <span>›</span>
          <span className="text-slate-700 font-medium">Invoice</span>
        </nav>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        <div id="invoice-print" ref={printRef} className="bg-white rounded border border-slate-200 shadow-sm p-8 print:shadow-none">
          {/* Header */}
          <div className="flex items-start justify-between mb-8 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-5 h-5 text-slate-500" />
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Laundry Invoice</h1>
              </div>
              <p className="text-sm text-slate-500">Professional garment care and delivery receipt</p>
            </div>
            <div className="text-sm text-slate-500 text-right">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-1">Invoice Date</div>
              <div className="font-semibold text-slate-800">{fmtDateTime(sale.createdAt)}</div>
            </div>
          </div>

          {/* Company / Customer / Invoice details */}
          <div className="grid grid-cols-3 gap-6 mb-6 text-sm">
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
              <div className="text-slate-400 italic mb-1">From</div>
              <div className="font-bold text-slate-800">{COMPANY.name}</div>
              <div className="text-slate-600">{COMPANY.address}</div>
              <div className="text-slate-600">Phone: , Mobile: {COMPANY.mobile}</div>
              <div className="text-slate-600">Email: {COMPANY.email}</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
              <div className="text-slate-400 italic mb-1">Customer Details</div>
              <div className="font-bold text-slate-800">{sale.customerName ?? "Walk-in Customer"}</div>
              <div className="text-slate-600">Sri Lanka</div>
              {sale.customerMobile && <div className="text-slate-600">Mobile: {sale.customerMobile}</div>}
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-white text-right">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">Invoice Summary</div>
              <div className="font-bold text-slate-800 text-lg">#{sale.saleNumber}</div>
              <div className="text-slate-600">Sales Status : {sale.status}</div>
              <div className="text-slate-600">Reference No. : {sale.referenceNo ?? "-"}</div>
              <div className="text-slate-600">Delivery Date : {fmtDate(sale.deliveryDate)}</div>
            </div>
          </div>

          {/* Lines table */}
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-600 text-white text-xs">
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Item Name</th>
                  <th className="px-3 py-2 text-right">Unit Price</th>
                  <th className="px-3 py-2 text-right">Quantity</th>
                  <th className="px-3 py-2 text-right">Net Cost</th>
                  <th className="px-3 py-2 text-right">Discount</th>
                  <th className="px-3 py-2 text-right">Discount Amount</th>
                  <th className="px-3 py-2 text-right">Unit Cost</th>
                  <th className="px-3 py-2 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const discAmt = l.discountAmount ?? (l.discount ?? 0) * l.qty;
                  const netCost = l.unitPrice * l.qty;
                  const unitCost = l.unitCost ?? (l.discount ? l.unitPrice - l.discount : 0);
                  return (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{l.description}</td>
                      <td className="px-3 py-2 text-right">LKR {l.unitPrice.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{l.qty.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">LKR {netCost.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{(l.discount ?? 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">LKR {discAmt.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">LKR {unitCost.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-semibold">LKR {l.lineTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold text-sm border-t border-slate-200">
                  <td className="px-3 py-2" colSpan={2}>Total</td>
                  <td className="px-3 py-2 text-right">LKR {lines.reduce((s, l) => s + l.unitPrice, 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{totalQty.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">LKR {lines.reduce((s, l) => s + l.unitPrice * l.qty, 0).toFixed(2)}</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-right">LKR {lines.reduce((s, l) => s + (l.discountAmount ?? 0), 0).toFixed(2)}</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-right">LKR {subtotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Bottom section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: discount note + payments */}
            <div>
              <div className="text-sm mb-4">
                <div className="flex gap-2 text-slate-700"><span className="font-semibold w-36">Discount on All</span><span>: {discountOnAll.toFixed(2)} (%)</span></div>
                <div className="flex gap-2 text-slate-700 mt-1"><span className="font-semibold w-36">Note</span><span>: {sale.note}</span></div>
              </div>

              {/* Payments */}
              <div className="text-cyan-600 font-semibold text-sm mb-2">Payments Information :</div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-600 text-white text-xs">
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Payment Type</th>
                    <th className="px-3 py-2 text-left">Payment Note</th>
                    <th className="px-3 py-2 text-right">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-slate-400 text-xs border-t border-slate-100">No payments recorded.</td>
                    </tr>
                  ) : (
                    payments.map((p, i) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">{i + 1}</td>
                        <td className="px-3 py-2">{fmtDate(p.date)}</td>
                        <td className="px-3 py-2">{p.paymentType}</td>
                        <td className="px-3 py-2">{p.note}</td>
                        <td className="px-3 py-2 text-right">{p.amount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                  <tr className="border-t border-slate-200 font-semibold">
                    <td className="px-3 py-2" colSpan={4}>Total</td>
                    <td className="px-3 py-2 text-right">{paidTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: totals summary */}
            <div className="flex justify-end">
              <div className="w-64 text-sm space-y-1.5">
                <SummaryRow label="Subtotal" value={subtotal.toFixed(2)} />
                <SummaryRow label="Other Charges" value={otherCharges.toFixed(2)} />
                <SummaryRow label="Discount on All" value={discountOnAll.toFixed(2)} />
                <SummaryRow label="Round Off" value={roundOff.toFixed(2)} />
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-800 text-base">
                  <span>Grand Total</span>
                  <span>{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-6 border-t border-slate-200 pt-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Terms and Conditions</h3>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {TERMS.map((term) => (
                  <li key={term}>{term}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-800 mb-8">Authorized Signature</div>
              <div className="border-b border-slate-300 h-10" />
              <div className="text-xs text-slate-500 mt-2">Thank you for choosing {COMPANY.name}</div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="no-print flex items-center gap-2 mt-5">
          <ActionBtn color="bg-green-600" icon={<Pencil className="w-4 h-4" />} label="Edit"
            onClick={() => router.push(`/sales/${id}/edit`)} />
          <ActionBtn color="bg-amber-500" icon={<Printer className="w-4 h-4" />} label="Print"
            onClick={handlePrint} />
          <ActionBtn color="bg-cyan-500" icon={<ReceiptText className="w-4 h-4" />} label="POS Invoice"
            onClick={() => router.push(`/sales/pos?id=${id}`)} />
          <ActionBtn color="bg-blue-600" icon={<FileText className="w-4 h-4" />} label="PDF"
            onClick={handlePDF} />
          <ActionBtn color="bg-red-500" icon={<RotateCcw className="w-4 h-4" />} label="Sales Return"
            onClick={() => router.push(`/sales/returns/list?saleId=${id}&saleCode=${encodeURIComponent(sale.saleNumber ?? "")}`)} />
        </div>
      </div>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ActionBtn({ color, icon, label, onClick }: { color: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${color} hover:opacity-90 text-white text-sm px-4 py-2 rounded flex items-center gap-2 transition-opacity font-medium`}
    >
      {icon} {label}
    </button>
  );
}
