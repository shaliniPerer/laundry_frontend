"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageScaffold } from "@/components/PageScaffold";
import { Play, Trash2, ShoppingBag, Clock } from "lucide-react";

type HeldLine = { description: string; qty: number; unitPrice: number; discount: number; lineTotal?: number };
type HeldCustomer = { pk: string; name: string; mobile?: string; phone?: string };

type HeldOrder = {
  id: string;
  holdNumber: string;
  customer: HeldCustomer;
  lines: HeldLine[];
  deliveryDate: string;
  otherCharges: number;
  total: number;
  savedAt: string;
};

const HOLD_KEY = "pos_held_orders";

function getHeldOrders(): HeldOrder[] {
  try { return JSON.parse(localStorage.getItem(HOLD_KEY) ?? "[]") as HeldOrder[]; } catch { return []; }
}
function saveHeldOrders(orders: HeldOrder[]) { localStorage.setItem(HOLD_KEY, JSON.stringify(orders)); }

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

export default function HoldsListPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<HeldOrder[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    setOrders(getHeldOrders().sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
  }, []);

  useEffect(() => { load(); }, [load]);

  function processOrder(order: HeldOrder) {
    router.push(`/sales/pos?holdId=${order.id}`);
  }

  function deleteOrder(id: string) {
    if (!confirm("Delete this held order? This cannot be undone.")) return;
    saveHeldOrders(getHeldOrders().filter(h => h.id !== id));
    load();
  }

  return (
    <PageScaffold title="Held Orders" subtitle="Orders on hold — click Process to resume" maxWidthClassName="max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-500">{orders.length} order{orders.length !== 1 ? "s" : ""} on hold</div>
        <button
          type="button"
          onClick={() => router.push("/sales/pos")}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
        >
          <ShoppingBag className="w-4 h-4" /> New Sale
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded border border-slate-200 p-12 text-center text-slate-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No held orders</p>
          <p className="text-sm mt-1">Orders you put on hold will appear here.</p>
          <button type="button" onClick={() => router.push("/sales/pos")}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded text-sm font-semibold">
            Go to POS
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => {
            const isOpen = expanded === order.id;
            return (
              <div key={order.id} className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                {/* Row */}
                <div className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="w-24">
                    <div className="text-xs text-slate-400">Hold #</div>
                    <div className="font-bold text-blue-700 text-sm">{order.holdNumber}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-slate-400">Customer</div>
                    <div className="font-semibold text-slate-800 text-sm">{order.customer.name || "Walk-in Customer"}</div>
                  </div>
                  <div className="w-24 text-center">
                    <div className="text-xs text-slate-400">Items</div>
                    <div className="font-semibold text-slate-700 text-sm">{order.lines.length}</div>
                  </div>
                  <div className="w-28 text-right">
                    <div className="text-xs text-slate-400">Total</div>
                    <div className="font-bold text-slate-800 text-sm">LKR {Number(order.total).toFixed(2)}</div>
                  </div>
                  <div className="w-40 text-right">
                    <div className="text-xs text-slate-400">Saved At</div>
                    <div className="text-xs text-slate-600">{fmtDateTime(order.savedAt)}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : order.id)}
                      className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 border border-slate-200 rounded"
                    >
                      {isOpen ? "Hide" : "Details"}
                    </button>
                    <button
                      type="button"
                      onClick={() => processOrder(order)}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1.5 rounded transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" /> Process
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteOrder(order.id)}
                      className="text-red-400 hover:text-red-600 p-1.5 border border-red-100 rounded transition-colors"
                      title="Delete held order"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500">
                          <th className="text-left pb-1.5 font-semibold">Item</th>
                          <th className="text-right pb-1.5 font-semibold">Qty</th>
                          <th className="text-right pb-1.5 font-semibold">Unit Price</th>
                          <th className="text-right pb-1.5 font-semibold">Discount</th>
                          <th className="text-right pb-1.5 font-semibold">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.lines.map((l, i) => (
                          <tr key={i} className="border-t border-slate-200">
                            <td className="py-1 text-slate-700 font-medium">{l.description}</td>
                            <td className="py-1 text-right text-slate-600">{l.qty}</td>
                            <td className="py-1 text-right text-slate-600">{l.unitPrice.toFixed(2)}</td>
                            <td className="py-1 text-right text-slate-600">{(l.discount ?? 0).toFixed(2)}</td>
                            <td className="py-1 text-right font-semibold text-slate-800">
                              {(l.qty * l.unitPrice - (l.discount ?? 0)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-300">
                          <td className="pt-1.5 font-bold text-slate-700" colSpan={4}>Total</td>
                          <td className="pt-1.5 text-right font-bold text-blue-700">LKR {Number(order.total).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                    <div className="mt-2 text-xs text-slate-400 flex gap-4">
                      <span>Delivery: {order.deliveryDate}</span>
                      {order.otherCharges > 0 && <span>Other Charges: {order.otherCharges.toFixed(2)}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageScaffold>
  );
}
