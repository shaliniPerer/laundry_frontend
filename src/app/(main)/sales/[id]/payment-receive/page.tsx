"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";
import { DateInput } from "@/components/DateInput";

type Sale = {
  pk: string;
  saleNumber?: string;
  customerName?: string;
  total?: number;
  paidAmount?: number;
  paymentStatus?: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function PaymentReceivePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const res = await api<Sale>(`/api/sales/${id}`);
      if (res.ok && res.data) {
        setSale(res.data);
        const due = Number(res.data.total ?? 0) - Number(res.data.paidAmount ?? 0);
        setAmount(due > 0 ? due.toFixed(2) : "");
      }
      setLoading(false);
    })();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentType || !amount) { setMsg({ type: "err", text: "Amount and payment type are required." }); return; }
    setSaving(true);
    setMsg(null);
    const res = await api(`/api/sales/${id}/payments`, {
      method: "POST",
      body: JSON.stringify({ amount: Number(amount), paymentType, date, note }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg({ type: "ok", text: "Payment recorded successfully." });
      setTimeout(() => router.push(`/sales/${id}/view?print=1`), 1200);
    } else {
      setMsg({ type: "err", text: res.error ?? "Failed to record payment." });
    }
  }

  if (loading) return <PageScaffold title="Payment Receive"><p className="p-6 text-slate-400">Loading…</p></PageScaffold>;
  if (!sale) return <PageScaffold title="Payment Receive"><p className="p-6 text-red-500">Sale not found.</p></PageScaffold>;

  const due = Number(sale.total ?? 0) - Number(sale.paidAmount ?? 0);

  return (
    <PageScaffold title="Payment Receive" subtitle={`Invoice ${sale.saleNumber}`} maxWidthClassName="max-w-2xl">
      <div className="bg-white rounded border border-slate-200 shadow-sm p-6">
        {/* Invoice summary */}
        <div className="grid grid-cols-3 gap-4 mb-6 text-sm bg-slate-50 rounded p-4">
          <div><span className="text-slate-500">Customer</span><div className="font-semibold">{sale.customerName ?? "Walk-in"}</div></div>
          <div><span className="text-slate-500">Invoice Total</span><div className="font-semibold">LKR {Number(sale.total ?? 0).toFixed(2)}</div></div>
          <div><span className="text-slate-500">Balance Due</span><div className={`font-semibold ${due > 0 ? "text-red-600" : "text-green-600"}`}>LKR {due.toFixed(2)}</div></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Date <span className="text-red-500">*</span></label>
              <DateInput
                value={date}
                onChange={setDate}
                required
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Amount <span className="text-red-500">*</span></label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Payment Type <span className="text-red-500">*</span></label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
            >
              <option value="">-Select-</option>
              <option>Cash</option>
              <option>Card</option>
              <option>Bank Transfer</option>
              <option>Cheque</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Payment Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
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
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-sm disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Record Payment"}
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
      </div>
    </PageScaffold>
  );
}
