"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

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
  deliveryTime?: string;
  status?: string;
  referenceNo?: string;
  customerName?: string;
  customerMobile?: string;
  total?: number;
  subtotal?: number;
  paidAmount?: number;
  paymentStatus?: string;
  otherCharges?: number;
  otherChargeItems?: { description: string; amount: number }[];
  discountOnAll?: number;
  discountOnAllType?: string;
  roundOff?: number;
  note?: string;
  createdBy?: string;
  payments?: SalePayment[];
  lines?: SaleLine[];
  createdAt?: string;
};

type CompanySettings = {
  companyName: string;
  address: string;
  phone: string;
  website: string;
  email: string;
};

function fmtDate(d?: string): string {
  if (!d) return "-";
  const p = d.split("-");
  if (p.length === 3 && p[0].length === 4) return `${p[2]}-${p[1]}-${p[0]}`;
  return d;
}

function fmtISODate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

function fmtTime12(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${m}:${s} ${ampm}`;
}

function fmtTime12Short(time?: string): string {
  if (!time) return "-";
  const parts = time.split(":");
  if (parts.length < 2) return time;
  let h = parseInt(parts[0], 10);
  const m = parts[1].slice(0, 2);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

function fmt(n: number): string {
  return Math.ceil(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function DashLine({ short }: { short?: boolean }) {
  return (
    <div
      style={{
        borderTop: "1.5px dashed #444",
        margin: "5px 0",
        width: short ? "36%" : "100%",
      }}
    />
  );
}

function TotalsRow({
  label,
  value,
  bold,
  size,
}: {
  label: string;
  value: string;
  bold?: boolean;
  size?: string;
}) {
  const fw = bold ? "bold" : "normal";
  const fs = size ?? "8.3pt";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: "8px",
        fontSize: fs,
        marginBottom: "2px",
      }}
    >
      <span style={{ minWidth: "160px", textAlign: "right", fontWeight: fw }}>{label}</span>
      <span style={{ minWidth: "75px", textAlign: "right", fontWeight: fw }}>{value}</span>
    </div>
  );
}

export default function SaleViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sale, setSale] = useState<Sale | null>(null);
  const [settings, setSettings] = useState<CompanySettings>({
    companyName: "CIMPOS Laundry",
    address: "No. 92/B/9, Madapatha Road, Kolamunna, Piliyandala.",
    phone: "070 353 4456",
    website: "www.cimpos.lk",
    email: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<Sale>(`/api/sales/${id}`),
      api<CompanySettings>("/api/admin/settings"),
    ]).then(([saleRes, settingsRes]) => {
      if (saleRes.ok && saleRes.data) setSale(saleRes.data);
      if (settingsRes.ok && settingsRes.data?.companyName) setSettings(settingsRes.data);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!loading && sale && searchParams.get("print") === "1") {
      const handleAfterPrint = () => router.push("/sales/list");
      window.addEventListener("afterprint", handleAfterPrint);
      const t = setTimeout(() => window.print(), 300);
      return () => {
        clearTimeout(t);
        window.removeEventListener("afterprint", handleAfterPrint);
      };
    }
  }, [loading, sale, searchParams, router]);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading…</div>;
  if (!sale) return <div className="p-8 text-center text-red-500">Invoice not found.</div>;

  const lines = sale.lines ?? [];
  // Gross subtotal: qty × unitPrice (no per-line discount deducted)
  const grossSubtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const lineDiscountTotal = lines.reduce((s, l) => s + l.qty * (l.discount ?? 0), 0);
  const discountOnAll = (sale.discountOnAll ?? 0) + lineDiscountTotal;
  const otherCharges = sale.otherCharges ?? 0;
  const roundOff = sale.roundOff ?? 0;
  const grandTotal = sale.total ?? (grossSubtotal - discountOnAll + otherCharges + roundOff);
  const roundedGrandTotal = Math.ceil(grandTotal);
  const payments = sale.payments ?? [];
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);
  const due = grandTotal - paidTotal;

  // column widths — must match between header, item rows, and payment rows
  const COL = { desc: "34%", rate: "16%", qty: "16%", disc: "16%", total: "18%" };

  return (
    <>
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body * { visibility: hidden !important; }
          #invoice-print, #invoice-print * { visibility: visible !important; }
          #invoice-print { position: fixed; top: 0; left: 0; width: 80mm; }
          .no-print { display: none !important; }
        }
        @media screen {
          #invoice-print { box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
        }
      `}</style>

      {/* ── Action buttons (screen only) ── */}
      <div className="no-print flex justify-center gap-3 pt-4 pb-2">
        <button
          onClick={() => window.print()}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-sm transition-colors"
        >
          🖨 Print
        </button>
        <button
          onClick={() => router.push("/sales/list")}
          className="px-6 py-2 bg-slate-500 hover:bg-slate-600 text-white font-semibold rounded text-sm transition-colors"
        >
          ✕ Close
        </button>
      </div>

      {/* Invoice */}
      <div className="p-4 flex justify-center bg-white min-h-screen" style={{ overflowX: "hidden" }}>
        <div
          id="invoice-print"
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: "8.3pt",
            width: "80mm",
            color: "#111",
            padding: "4mm 4mm",
            boxSizing: "border-box",
            overflowX: "hidden",
          }}
        >
          {/* ── Company header ── */}
          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            <div style={{ fontSize: "11pt", fontWeight: "bold", marginBottom: "2px" }}>
              {settings.companyName}
            </div>
            <div style={{ fontSize: "8.3pt" }}>{settings.address}</div>
            <div style={{ fontSize: "8.3pt" }}>
              Phone : {settings.phone}
              {settings.website ? ` | Web : ${settings.website}` : ""}
            </div>
          </div>

          {/* ── INVOICE label ── */}
          <div
            style={{
              textAlign: "center",
              fontSize: "9.4pt",
              marginBottom: "10px",
            }}
          >
            INVOICE
          </div>

          {/* ── Detail rows ── */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.3pt", marginBottom: "8px" }}>
            <tbody>
              {(
                [
                  ["Invoice No", sale.saleNumber ?? "-", true],
                  ["Customer", sale.customerName ?? "Walk-in Customer", true],
                  ["Phone", sale.customerMobile ?? "-", true],
                  ["Staff", sale.createdBy ?? "-", false],
                ] as [string, string, boolean][]
              ).map(([label, value, bold]) => (
                <tr key={label}>
                  <td style={{ width: "32%", paddingBottom: "3px" }}>{label}</td>
                  <td style={{ fontWeight: bold ? "bold" : "normal", paddingBottom: "3px" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Date / Time row ── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "8.3pt",
              marginBottom: "4px",
              marginTop: "4px",
            }}
          >
            <span>Date : {fmtISODate(sale.createdAt)}</span>
            <span>Time : {fmtTime12(sale.createdAt)}</span>
          </div>

          {/* ── Delivery Date & Time ── */}
          <div
            style={{
              fontSize: "9.4pt",
              fontWeight: "bold",
              marginBottom: "6px",
            }}
          >
            Delivery Date &amp; Time : {fmtDate(sale.deliveryDate)}
            {sale.deliveryTime ? ` | ${fmtTime12Short(sale.deliveryTime)}` : ""}
          </div>

          {/* ── Separator ── */}
          <DashLine />

          {/* ── Single unified items table — columns locked via colgroup ── */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.3pt", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: COL.desc }} />
              <col style={{ width: COL.rate }} />
              <col style={{ width: COL.qty }} />
              <col style={{ width: COL.disc }} />
              <col style={{ width: COL.total }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign: "left", fontWeight: "bold", paddingBottom: "4px" }}>Description</th>
                <th style={{ textAlign: "center", fontWeight: "bold", paddingBottom: "4px" }}>Rate</th>
                <th style={{ textAlign: "center", fontWeight: "bold", paddingBottom: "4px" }}>Kg&nbsp;/<br />Pcs</th>
                <th style={{ textAlign: "center", fontWeight: "bold", paddingBottom: "4px" }}>Disc</th>
                <th style={{ textAlign: "right", fontWeight: "bold", paddingBottom: "4px" }}>Total</th>
              </tr>
              <tr>
                <td colSpan={5} style={{ padding: 0, borderTop: "1.5px dashed #444" }} />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <>
                  <tr key={`r${i}`}>
                    <td style={{ verticalAlign: "top", padding: "4px 0", wordBreak: "break-all", overflowWrap: "anywhere" }}>
                      {l.description}
                    </td>
                    <td style={{ textAlign: "center", verticalAlign: "top", padding: "4px 0" }}>
                      {fmt(l.unitPrice)}
                    </td>
                    <td style={{ textAlign: "center", verticalAlign: "top", padding: "4px 0" }}>
                      {l.qty}
                    </td>
                    <td style={{ textAlign: "center", verticalAlign: "top", padding: "4px 0" }}>
                      {(l.discount ?? 0) > 0 ? fmt(l.discount!) : "-"}
                    </td>
                    <td style={{ textAlign: "right", verticalAlign: "top", padding: "4px 0" }}>
                      {fmt(l.qty * l.unitPrice)}
                    </td>
                  </tr>
                  <tr key={`d${i}`}>
                    <td colSpan={5} style={{ padding: 0, borderTop: "1.5px dashed #444" }} />
                  </tr>
                </>
              ))}
            </tbody>
          </table>

          {/* ── Subtotal / Discount / Charges ── */}
          <TotalsRow label="Subtotal" value={fmt(grossSubtotal)} bold />
          {discountOnAll > 0 && (
            <TotalsRow label="Bill Discount (-)" value={fmt(discountOnAll)} />
          )}
          {(otherCharges !== 0 || (sale.otherChargeItems?.length ?? 0) > 0) && (
            sale.otherChargeItems && sale.otherChargeItems.length > 0
              ? sale.otherChargeItems.map((item, i) => (
                  <TotalsRow key={i} label={`${item.description} (+)`} value={fmt(Number(item.amount))} />
                ))
              : <TotalsRow label="Other Charges (+)" value={fmt(otherCharges)} />
          )}
          {roundOff !== 0 && (
            <TotalsRow label="Round Off" value={fmt(roundOff)} />
          )}

          <DashLine />

          {/* ── Grand Total ── */}
          <TotalsRow label="Grand Total (LKR)" value={fmt(roundedGrandTotal)} bold size="9.4pt" />

          <DashLine />

          {/* ── Payment Details ── */}
          {payments.length > 0 && (
            <>
              <div style={{ fontWeight: "bold", fontSize: "8.3pt", marginBottom: "4px", marginTop: "2px" }}>
                Payment Details
              </div>
              {payments.map((p, i) => (
                <div key={i} style={{ display: "flex", fontSize: "8.3pt", marginBottom: "2px" }}>
                  <span style={{ width: COL.desc }}>{p.paymentType}</span>
                  <span>{fmt(p.amount)}</span>
                </div>
              ))}

              <DashLine short />

              <div style={{ display: "flex", fontWeight: "bold", fontSize: "8.3pt", marginBottom: "2px" }}>
                <span style={{ width: COL.desc }}>Total Paid</span>
                <span>{fmt(paidTotal)}</span>
              </div>
              <div style={{ display: "flex", fontWeight: "bold", fontSize: "8.3pt" }}>
                <span style={{ width: COL.desc }}>Due Balance</span>
                <span>{due > 0.005 ? fmt(due) : "-"}</span>
              </div>
            </>
          )}

          {/* ── Terms & Conditions ── */}
          <div style={{ fontSize: "6.5pt", color: "#555", marginTop: "8px", lineHeight: "1.5" }}>
            <div style={{ fontWeight: "bold", marginBottom: "2px" }}>Terms &amp; Conditions:</div>
            <div>1. Not responsible for shrinkage, color fading, items left in garments, late delivery, or unclaimed garments after 3 days.</div>
            <div>2. Stain removal will be done at the customer&apos;s risk.</div>
            <div>3. Liability for loss/damage is limited to 3 times the cleaning cost.</div>
            <div>4. No responsibility for any losses after 1 month.</div>
          </div>

          <DashLine />

          <div style={{ textAlign: "center", fontSize: "8pt", fontWeight: "bold", margin: "6px 0 2px" }}>
            Thank You, Come Again!
          </div>
          <div style={{ textAlign: "center", fontSize: "6pt", color: "#888", marginBottom: "4px" }}>
            <div>Design and Developed By</div>
            <div>www.cimpos.lk</div>
          </div>
        </div>
      </div>
    </>
  );
}
