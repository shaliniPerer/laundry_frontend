"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Barcode, CalendarIcon, Trash2 } from "lucide-react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

type Customer = { pk: string; name: string; mobile?: string; customerNumber?: string };
type Item = { pk: string; name: string; itemCode?: string; barcode?: string; salePrice?: number; price?: number };
type Line = { id: string; itemId: string; description: string; qty: number; unitPrice: number; discount: number; lineTotal: number };

const WALK_IN: Customer = { pk: "WALKIN", name: "Walk-in customer" };
const inputCls = "border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white w-full";
const selectCls = "border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white w-full appearance-none";

export default function EditSalePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [customerSearch, setCustomerSearch] = useState("Walk-in customer");
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(WALK_IN);
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDrop, setShowItemDrop] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [salesDate, setSalesDate] = useState("");
  const [status, setStatus] = useState("Final");
  const [referenceNo, setReferenceNo] = useState("");
  const [otherCharges, setOtherCharges] = useState(0);
  const [otherChargesType, setOtherChargesType] = useState("None");
  const [discountOnAll, setDiscountOnAll] = useState(0);
  const [discountOnAllType, setDiscountOnAllType] = useState("Per%");
  const [roundOff, setRoundOff] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const customerRef = useRef<HTMLDivElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    const [saleRes, cr, ir] = await Promise.all([
      api<Record<string, unknown>>(`/api/sales/${id}`),
      api<{ customers: Customer[] }>("/api/customers"),
      api<{ items: Item[] }>("/api/items"),
    ]);
    if (cr.ok && cr.data?.customers) setCustomers(cr.data.customers.filter((c) => c.pk?.startsWith("CUSTOMER#")));
    if (ir.ok && ir.data?.items) setItems(ir.data.items.filter((i) => i.pk?.startsWith("ITEM#")));
    if (saleRes.ok && saleRes.data) {
      const s = saleRes.data as {
        customerName?: string; customerId?: string; deliveryDate?: string; status?: string;
        referenceNo?: string; otherCharges?: number; otherChargesType?: string;
        discountOnAll?: number; discountOnAllType?: string; roundOff?: number; note?: string;
        lines?: { itemId?: string; description: string; qty: number; unitPrice: number; discount?: number; lineTotal: number }[];
      };
      // Pre-fill customer
      if (s.customerId && cr.data?.customers) {
        const found = cr.data.customers.find((c) => c.pk === `CUSTOMER#${s.customerId}` || c.pk.replace("CUSTOMER#", "") === s.customerId);
        if (found) { setSelectedCustomer(found); setCustomerSearch(found.name); }
        else { setCustomerSearch(s.customerName ?? ""); }
      } else if (s.customerName) {
        setCustomerSearch(s.customerName);
        // If no customerId but name present, treat as walk-in with name
        const found = cr.data?.customers?.find((c) => c.name === s.customerName);
        if (found) { setSelectedCustomer(found); } else { setSelectedCustomer({ ...WALK_IN, name: s.customerName ?? "Walk-in customer" }); }
      }
      setSalesDate(s.deliveryDate ?? "");
      setStatus(s.status ?? "Final");
      setReferenceNo(s.referenceNo ?? "");
      setOtherCharges(s.otherCharges ?? 0);
      setOtherChargesType(s.otherChargesType ?? "None");
      setDiscountOnAll(s.discountOnAll ?? 0);
      setDiscountOnAllType(s.discountOnAllType ?? "Per%");
      setRoundOff(s.roundOff ?? 0);
      setNote(s.note ?? "");
      setLines(
        (s.lines ?? []).map((l, i) => ({
          id: `line-${i}-${Date.now()}`,
          itemId: l.itemId ?? "",
          description: l.description,
          qty: l.qty,
          unitPrice: l.unitPrice,
          discount: l.discount ?? 0,
          lineTotal: l.lineTotal,
        }))
      );
    }
    setLoaded(true);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) setShowCustomerDrop(false);
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) setShowItemDrop(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allCustomers = [WALK_IN, ...customers];
  const filteredCustomers = allCustomers.filter(
    (c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.mobile ?? "").includes(customerSearch)
  );
  const filteredItems = items.filter(
    (i) => i.name.toLowerCase().includes(itemSearch.toLowerCase()) || (i.itemCode ?? "").toLowerCase().includes(itemSearch.toLowerCase()) || (i.barcode ?? "").includes(itemSearch)
  );

  function selectCustomer(c: Customer) { setSelectedCustomer(c); setCustomerSearch(c.name); setShowCustomerDrop(false); }

  function addItem(item: Item) {
    const unitPrice = Number(item.salePrice || item.price || 0);
    setLines((prev) => [...prev, { id: `${item.pk}-${Date.now()}`, itemId: item.pk.replace("ITEM#", ""), description: item.name, qty: 1, unitPrice, discount: 0, lineTotal: unitPrice }]);
    setItemSearch(""); setShowItemDrop(false);
  }

  function updateLine(id: string, field: "qty" | "unitPrice" | "discount", value: number) {
    setLines((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const u = { ...l, [field]: value };
      u.lineTotal = (u.unitPrice - u.discount) * u.qty;
      return u;
    }));
  }

  function removeLine(id: string) { setLines((prev) => prev.filter((l) => l.id !== id)); }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const discountAmt = discountOnAllType === "Per%" ? (subtotal * discountOnAll) / 100 : discountOnAll;
  const grandTotal = subtotal + otherCharges - discountAmt + roundOff;

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    const res = await api(`/api/sales/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        customerId: selectedCustomer.pk === "WALKIN" ? undefined : selectedCustomer.pk.replace("CUSTOMER#", ""),
        customerName: selectedCustomer.name,
        customerMobile: selectedCustomer.mobile,
        deliveryDate: salesDate,
        status,
        referenceNo: referenceNo || undefined,
        otherCharges,
        otherChargesType,
        discountOnAll: discountAmt,
        discountOnAllType,
        roundOff,
        note: note || undefined,
        lines: lines.map((l) => ({ itemId: l.itemId || undefined, description: l.description, qty: l.qty, unitPrice: l.unitPrice, discount: l.discount, lineTotal: l.lineTotal })),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg({ type: "ok", text: "Sale updated successfully." });
      setTimeout(() => router.push(`/sales/${id}/view`), 1200);
    } else {
      setMsg({ type: "err", text: res.error ?? "Failed to update." });
    }
  }

  if (!loaded) return <PageScaffold title="Edit Sale"><p className="p-6 text-slate-400">Loading…</p></PageScaffold>;

  return (
    <PageScaffold title="Edit Sale" subtitle="Modify sale details" maxWidthClassName="max-w-5xl">
      <div className="bg-white rounded border border-slate-200 shadow-sm p-6">
        {/* Top fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
          {/* Left */}
          <div className="space-y-3">
            <div className="flex items-center" ref={customerRef}>
              <label className="w-36 text-right pr-4 text-sm text-slate-600 shrink-0">Customer</label>
              <div className="flex-1 relative">
                <input value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDrop(true); }} onFocus={() => setShowCustomerDrop(true)} className={inputCls} placeholder="Search…" />
                {showCustomerDrop && filteredCustomers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-slate-200 rounded shadow-lg z-20 max-h-48 overflow-y-auto">
                    {filteredCustomers.map((c) => (
                      <button key={c.pk} type="button" onClick={() => selectCustomer(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50">
                        <span className="font-medium">{c.name}</span>
                        {c.mobile && <span className="text-slate-400 ml-2 text-xs">{c.mobile}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <label className="w-36 text-right pr-4 text-sm text-slate-600 shrink-0">Status<span className="text-red-500">*</span></label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
                <option>Final</option><option>Draft</option><option>Pending</option><option>Cancelled</option>
              </select>
            </div>
          </div>
          {/* Right */}
          <div className="space-y-3">
            <div className="flex items-center">
              <label className="w-36 text-right pr-4 text-sm text-slate-600 shrink-0">Sales Date<span className="text-red-500">*</span></label>
              <div className="flex-1 relative flex items-center">
                <input value={salesDate} onChange={(e) => setSalesDate(e.target.value)} className={inputCls} />
                <CalendarIcon className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center">
              <label className="w-36 text-right pr-4 text-sm text-slate-600 shrink-0">Reference No.</label>
              <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Item search */}
        <div className="mb-4" ref={itemRef}>
          <div className="relative">
            <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input value={itemSearch} onChange={(e) => { setItemSearch(e.target.value); setShowItemDrop(true); }} onFocus={() => setShowItemDrop(true)} placeholder="Add item by name/barcode/code" className="w-full border border-slate-300 rounded pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-400" />
            {showItemDrop && itemSearch && filteredItems.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-slate-200 rounded shadow-lg z-20 max-h-48 overflow-y-auto">
                {filteredItems.map((i) => (
                  <button key={i.pk} type="button" onClick={() => addItem(i)} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50">
                    <span className="font-medium">{i.name}</span>
                    {i.itemCode && <span className="text-slate-400 ml-2 text-xs">{i.itemCode}</span>}
                    {(i.salePrice ?? i.price) != null && <span className="text-slate-500 ml-2 text-xs">{Number(i.salePrice ?? i.price).toFixed(2)}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Items table */}
        <div className="overflow-x-auto mb-5">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-700 text-white text-xs">
                {["Item Name", "Quantity", "Unit Price", "Discount(LKR)", "Total Amount", "Action"].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-semibold text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">No items. Search above to add.</td></tr>
              ) : lines.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-800 min-w-40">{l.description}</td>
                  <td className="px-3 py-2"><input type="number" min={1} value={l.qty} onChange={(e) => updateLine(l.id, "qty", Number(e.target.value))} className="w-20 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-400" /></td>
                  <td className="px-3 py-2"><input type="number" min={0} step={0.01} value={l.unitPrice} onChange={(e) => updateLine(l.id, "unitPrice", Number(e.target.value))} className="w-28 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-400" /></td>
                  <td className="px-3 py-2"><input type="number" min={0} step={0.01} value={l.discount} onChange={(e) => updateLine(l.id, "discount", Number(e.target.value))} className="w-24 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-400" /></td>
                  <td className="px-3 py-2 text-slate-700">{l.lineTotal.toFixed(2)}</td>
                  <td className="px-3 py-2"><button onClick={() => removeLine(l.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-3 mb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 w-36 shrink-0">Quantity</span>
              <span className="font-bold text-green-600 text-lg">{totalQty}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 w-36 shrink-0">Other Charges</label>
              <input type="number" min={0} step={0.01} value={otherCharges} onChange={(e) => setOtherCharges(Number(e.target.value))} className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400" />
              <select value={otherChargesType} onChange={(e) => setOtherChargesType(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400 bg-white">
                <option>None</option><option>Fixed</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 w-36 shrink-0">Discount on All</label>
              <input type="number" min={0} step={0.01} value={discountOnAll} onChange={(e) => setDiscountOnAll(Number(e.target.value))} className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400" />
              <select value={discountOnAllType} onChange={(e) => setDiscountOnAllType(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400 bg-white">
                <option>Per%</option><option>Fixed</option>
              </select>
            </div>
            <div className="flex items-start gap-2">
              <label className="text-sm text-slate-600 w-36 shrink-0 pt-1.5">Note</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400 resize-y" />
            </div>
          </div>
          <div className="border border-slate-200 rounded p-4 space-y-2 text-sm">
            {[["Subtotal", subtotal.toFixed(2)], ["Other Charges", otherCharges.toFixed(2)], ["Discount on All", discountAmt.toFixed(2)], ["Round Off", roundOff.toFixed(2)]].map(([label, val]) => (
              <div key={label} className="flex justify-between text-slate-600"><span>{label}</span><span>{val}</span></div>
            ))}
            <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-2 text-base">
              <span>Grand Total</span><span>{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {msg && (
          <div className={`mb-4 px-3 py-2 rounded text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
            {msg.text}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={handleSave} disabled={saving}
            className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded text-sm disabled:opacity-60 transition-colors">
            {saving ? "Saving…" : "Update Sale"}
          </button>
          <button type="button" onClick={() => router.push(`/sales/${id}/view`)}
            className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-sm transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </PageScaffold>
  );
}
