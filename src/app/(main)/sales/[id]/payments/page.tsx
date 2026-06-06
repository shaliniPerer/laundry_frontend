"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";

type SalePayment = {
  id: string;
  date: string;
  paymentType: string;
  note?: string;
  amount: number;
};

type PaymentsData = {
  payments: SalePayment[];
  paidAmount: number;
  total: number;
  paymentStatus: string;
};

function fmtDate(d?: string) {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return d;
}

export default function ViewPaymentsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<PaymentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api<PaymentsData>(`/api/sales/${id}/payments`);
    if (res.ok && res.data) setData(res.data);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function deletePayment(paymentId: string) {
    if (!confirm("Delete this payment?")) return;
    setDeletingId(paymentId);
    await api(`/api/sales/${id}/payments/${paymentId}`, { method: "DELETE" });
    setDeletingId(null);
    load();
  }

  const paidTotal = data?.payments.reduce((s, p) => s + p.amount, 0) ?? 0;
  const due = (data?.total ?? 0) - paidTotal;

  return (
    <PageScaffold title="View Payments" subtitle={`Invoice payments`} maxWidthClassName="max-w-4xl">
      <div className="bg-white rounded border border-slate-200 shadow-sm">
        {/* Summary bar */}
        {data && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-sm">
            <div><span className="text-slate-500">Invoice Total</span><div className="font-semibold">LKR {Number(data.total).toFixed(2)}</div></div>
            <div><span className="text-slate-500">Paid Amount</span><div className="font-semibold text-green-600">LKR {paidTotal.toFixed(2)}</div></div>
            <div><span className="text-slate-500">{due < 0 ? "Balance (Credit)" : "Balance Due"}</span><div className={`font-semibold ${due > 0 ? "text-red-600" : "text-green-600"}`}>LKR {Math.abs(due).toFixed(2)}</div></div>
          </div>
        )}

        {loading ? (
          <p className="p-6 text-center text-slate-400 text-sm">Loading…</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-700 text-white text-xs">
                  <th className="px-4 py-2.5 text-left">#</th>
                  <th className="px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5 text-left">Payment Type</th>
                  <th className="px-4 py-2.5 text-left">Payment Note</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {(data?.payments ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No payments recorded for this invoice.</td>
                  </tr>
                ) : (
                  (data?.payments ?? []).map((p, i) => (
                    <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2">{i + 1}</td>
                      <td className="px-4 py-2">{fmtDate(p.date)}</td>
                      <td className="px-4 py-2">{p.paymentType}</td>
                      <td className="px-4 py-2">{p.note}</td>
                      <td className="px-4 py-2 text-right font-semibold">LKR {p.amount.toFixed(2)}</td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => deletePayment(p.id)}
                          disabled={deletingId === p.id}
                          className="text-red-500 hover:text-red-700 disabled:opacity-40"
                          title="Delete payment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {(data?.payments ?? []).length > 0 && (
                  <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                    <td className="px-4 py-2" colSpan={4}>Total</td>
                    <td className="px-4 py-2 text-right">LKR {paidTotal.toFixed(2)}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>

            <div className="p-4 flex gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => router.push(`/sales/${id}/payment-receive`)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Payment
              </button>
              <button
                type="button"
                onClick={() => router.push(`/sales/${id}/view`)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-sm font-semibold transition-colors"
              >
                View Invoice
              </button>
              <button
                type="button"
                onClick={() => router.push("/sales/list")}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-sm font-semibold transition-colors"
              >
                Back to List
              </button>
            </div>
          </>
        )}
      </div>
    </PageScaffold>
  );
}
