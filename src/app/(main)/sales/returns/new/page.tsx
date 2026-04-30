"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

type Sale = {
  pk: string;
  saleNumber?: string;
  customerName?: string;
  total?: number;
  lines?: { description: string; qty: number; unitPrice: number; lineTotal: number }[];
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewSalesReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const saleIdParam = searchParams.get("saleId");

  const [sale, setSale] = useState<Sale | null>(null);
  const [originalSaleId, setOriginalSaleId] = useState(saleIdParam ?? "");
  const [returnDate, setReturnDate] = useState(today());
  const [total, setTotal] = useState("0");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!saleIdParam) return;
    (async () => {
      const res = await api<Sale>(`/api/sales/${saleIdParam}`);
      if (res.ok && res.data) {
        setSale(res.data);
        setOriginalSaleId(saleIdParam);
        setTotal(String(res.data.total ?? 0));
      }
    })();
  }, [saleIdParam]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!total || Number(total) <= 0) { setMsg({ type: "err", text: "Return amount must be greater than 0." }); return; }
    setSaving(true);
    setMsg(null);
    const res = await api("/api/sales/returns", {
      method: "POST",
      body: JSON.stringify({
        originalSaleId: originalSaleId || undefined,
        total: Number(total),
        reason: reason || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setMsg({ type: "err", text: res.error ?? "Failed to record return." });
      return;
    }
    setMsg({ type: "ok", text: "Sales return recorded successfully." });
    setTimeout(() => router.push("/sales/list"), 1500);
  }

  return (
    <PageScaffold title="Sales Return" subtitle="Record a return against a prior sale" maxWidthClassName="max-w-2xl">
      {sale && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4 text-sm">
          <div className="font-semibold text-blue-800 mb-1">Original Invoice: {sale.saleNumber}</div>
          <div className="text-blue-700">Customer: {sale.customerName ?? "Walk-in"} &nbsp;|&nbsp; Total: LKR {Number(sale.total ?? 0).toFixed(2)}</div>
          {sale.lines && (
            <table className="mt-3 w-full text-xs border-collapse">
              <thead>
                <tr className="bg-blue-200 text-blue-900">
                  <th className="px-2 py-1 text-left">Item</th>
                  <th className="px-2 py-1 text-right">Qty</th>
                  <th className="px-2 py-1 text-right">Unit Price</th>
                  <th className="px-2 py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.lines.map((l, i) => (
                  <tr key={i} className="border-t border-blue-100">
                    <td className="px-2 py-1">{l.description}</td>
                    <td className="px-2 py-1 text-right">{l.qty}</td>
                    <td className="px-2 py-1 text-right">{l.unitPrice.toFixed(2)}</td>
                    <td className="px-2 py-1 text-right">{l.lineTotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <form onSubmit={submit} className="bg-white rounded border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Return Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Return Amount (LKR) <span className="text-red-500">*</span></label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>
        </div>
        {!saleIdParam && (
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Original Sale ID (optional)</label>
            <input
              value={originalSaleId}
              onChange={(e) => setOriginalSaleId(e.target.value)}
              placeholder="Sale ID or invoice number"
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>
        )}
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Reason for return…"
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-400 resize-y"
          />
        </div>

        {msg && (
          <div className={`px-3 py-2 rounded text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
            {msg.text}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded text-sm disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving…" : "Record Return"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </PageScaffold>
  );
}

