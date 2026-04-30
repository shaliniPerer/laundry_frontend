"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Barcode, CalendarIcon, Plus, Trash2 } from "lucide-react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

type Supplier = { pk: string; name: string; supplierNumber?: string; mobile?: string };
type Item = { pk: string; name: string; itemCode?: string; barcode?: string; purchasePrice?: number; salePrice?: number };

type Line = {
  id: string;
  itemId: string;
  description: string;
  qty: number;
  purchasePrice: number;
  discount: number;
  unitCost: number;
  lineTotal: number;
};

const inputCls = "border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white w-full";
const selectCls = "border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white w-full appearance-none";

function today() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

export default function NewPurchasePage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDrop, setShowItemDrop] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [status, setStatus] = useState("Received");
  const [referenceNo, setReferenceNo] = useState("");
  const [otherCharges, setOtherCharges] = useState(0);
  const [otherChargesType, setOtherChargesType] = useState("None");
  const [discountOnAll, setDiscountOnAll] = useState(0);
  const [discountOnAllType, setDiscountOnAllType] = useState("Per%");
  const [roundOff] = useState(0);
  const [note, setNote] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState("");
  const [payNote, setPayNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const supplierRef = useRef<HTMLDivElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    const [sr, ir] = await Promise.all([
      api<{ suppliers: Supplier[] }>("/api/suppliers"),
      api<{ items: Item[] }>("/api/items"),
    ]);
    if (sr.ok && sr.data?.suppliers) setSuppliers(sr.data.suppliers.filter((s) => s.pk?.startsWith("SUPPLIER#")));
    if (ir.ok && ir.data?.items) setItems(ir.data.items.filter((i) => i.pk?.startsWith("ITEM#")));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) setShowSupplierDrop(false);
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) setShowItemDrop(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredSuppliers = suppliers.filter(
    (s) =>
      (s.name || "").toLowerCase().includes(supplierSearch.toLowerCase()) ||
      (s.mobile || "").includes(supplierSearch)
  );

  const filteredItems = items.filter(
    (i) =>
      (i.name || "").toLowerCase().includes(itemSearch.toLowerCase()) ||
      (i.itemCode || "").toLowerCase().includes(itemSearch.toLowerCase()) ||
      (i.barcode || "").includes(itemSearch)
  );

  function selectSupplier(s: Supplier) {
    setSelectedSupplier(s);
    setSupplierSearch(s.name);
    setShowSupplierDrop(false);
  }

  function addItem(item: Item) {
    const purchasePrice = Number(item.purchasePrice || 0);
    const unitCost = purchasePrice;
    const line: Line = {
      id: `${item.pk}-${Date.now()}`,
      itemId: item.pk.replace("ITEM#", ""),
      description: item.name,
      qty: 1,
      purchasePrice,
      discount: 0,
      unitCost,
      lineTotal: unitCost,
    };
    setLines((prev) => [...prev, line]);
    setItemSearch("");
    setShowItemDrop(false);
  }

  function updateLine(id: string, field: keyof Line, value: string | number) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        updated.unitCost = updated.purchasePrice - updated.discount;
        updated.lineTotal = updated.unitCost * updated.qty;
        return updated;
      })
    );
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);

  const discountAmt =
    discountOnAllType === "Per%"
      ? (subtotal * discountOnAll) / 100
      : discountOnAll;

  const grandTotal = subtotal + otherCharges - discountAmt + roundOff;

  async function handleSave() {
    if (!selectedSupplier) { setMsg({ type: "err", text: "Please select a supplier." }); return; }
    setSaving(true);
    setMsg(null);
    const res = await api("/api/purchases", {
      method: "POST",
      body: JSON.stringify({
        supplierId: selectedSupplier.pk.replace("SUPPLIER#", ""),
        supplierName: selectedSupplier.name,
        purchaseDate,
        status,
        referenceNo,
        lines: lines.map((l) => ({
          itemId: l.itemId,
          description: l.description,
          qty: l.qty,
          purchasePrice: l.purchasePrice,
          discount: l.discount,
          unitCost: l.unitCost,
          lineTotal: l.lineTotal,
        })),
        otherCharges,
        otherChargesType,
        discountOnAll: discountAmt,
        discountOnAllType,
        roundOff,
        note,
      }),
    });
    setSaving(false);
    if (!res.ok) { setMsg({ type: "err", text: res.error || "Failed to save purchase." }); return; }
    router.push("/purchase/list");
  }

  return (
    <PageScaffold title="Purchase" subtitle="Add/Update Purchase">
      <div className="bg-white border border-slate-200 rounded-sm p-5 mb-4">
        {/* Top form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-3 mb-5">
          {/* Left */}
          <div className="space-y-3">
            <div className="flex items-center">
              <label className="w-36 text-right pr-4 text-sm text-slate-600 shrink-0">
                Supplier Name<span className="text-red-500">*</span>
              </label>
              <div className="flex-1 relative" ref={supplierRef}>
                <div className="flex gap-1">
                  <input
                    value={supplierSearch}
                    onChange={(e) => { setSupplierSearch(e.target.value); setShowSupplierDrop(true); setSelectedSupplier(null); }}
                    onFocus={() => setShowSupplierDrop(true)}
                    placeholder="Search Name/Mobile"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => router.push("/suppliers/new")}
                    className="px-2 border border-slate-300 rounded hover:bg-slate-50 text-slate-600"
                    title="Add supplier"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {showSupplierDrop && filteredSuppliers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-slate-200 rounded shadow-lg z-20 max-h-48 overflow-y-auto">
                    {filteredSuppliers.map((s) => (
                      <button
                        key={s.pk}
                        type="button"
                        onClick={() => selectSupplier(s)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                      >
                        <span className="font-medium">{s.name}</span>
                        {s.mobile && <span className="text-slate-400 ml-2 text-xs">{s.mobile}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <label className="w-36 text-right pr-4 text-sm text-slate-600 shrink-0">
                Status<span className="text-red-500">*</span>
              </label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
                <option>Received</option>
                <option>Ordered</option>
                <option>Pending</option>
                <option>Cancelled</option>
              </select>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-3">
            <div className="flex items-center">
              <label className="w-36 text-right pr-4 text-sm text-slate-600 shrink-0">
                Purchase Date<span className="text-red-500">*</span>
              </label>
              <div className="flex-1 relative flex items-center">
                <input
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className={inputCls}
                />
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
            <input
              value={itemSearch}
              onChange={(e) => { setItemSearch(e.target.value); setShowItemDrop(true); }}
              onFocus={() => setShowItemDrop(true)}
              placeholder="Item name/Barcode/Itemcode"
              className="w-full border border-slate-300 rounded pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-400"
            />
            {showItemDrop && itemSearch && filteredItems.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-slate-200 rounded shadow-lg z-20 max-h-48 overflow-y-auto">
                {filteredItems.map((i) => (
                  <button
                    key={i.pk}
                    type="button"
                    onClick={() => addItem(i)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                  >
                    <span className="font-medium">{i.name}</span>
                    {i.itemCode && <span className="text-slate-400 ml-2 text-xs">{i.itemCode}</span>}
                    {i.purchasePrice != null && (
                      <span className="text-slate-500 ml-2 text-xs">LKR {Number(i.purchasePrice).toFixed(2)}</span>
                    )}
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
                {["Item Name", "Quantity", "Purchase Price(LKR)", "Discount(LKR)", "Unit Cost(LKR)", "Total Amount(LKR)", "Action"].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-semibold text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">No items added yet. Search above to add items.</td>
                </tr>
              ) : (
                lines.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-800 min-w-40">{l.description}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        value={l.qty}
                        onChange={(e) => updateLine(l.id, "qty", Number(e.target.value))}
                        className="w-20 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={l.purchasePrice}
                        onChange={(e) => updateLine(l.id, "purchasePrice", Number(e.target.value))}
                        className="w-28 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={l.discount}
                        onChange={(e) => updateLine(l.id, "discount", Number(e.target.value))}
                        className="w-24 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-400"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-700">{l.unitCost.toFixed(2)}</td>
                    <td className="px-3 py-2 text-slate-700">{l.lineTotal.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => removeLine(l.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totals section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-3 mb-6">
          {/* Left */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 w-36 shrink-0">Total Quantities</span>
              <span className="font-bold text-green-600 text-lg">{totalQty}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 w-36 shrink-0">Other Charges</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={otherCharges}
                onChange={(e) => setOtherCharges(Number(e.target.value))}
                className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400"
              />
              <select
                value={otherChargesType}
                onChange={(e) => setOtherChargesType(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400 bg-white"
              >
                <option>None</option>
                <option>Fixed</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 w-36 shrink-0">Discount on All</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={discountOnAll}
                onChange={(e) => setDiscountOnAll(Number(e.target.value))}
                className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400"
              />
              <select
                value={discountOnAllType}
                onChange={(e) => setDiscountOnAllType(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400 bg-white"
              >
                <option>Per%</option>
                <option>Fixed</option>
              </select>
            </div>
            <div className="flex items-start gap-2">
              <label className="text-sm text-slate-600 w-36 shrink-0 pt-1.5">Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400 resize-y"
              />
            </div>
          </div>

          {/* Right — totals */}
          <div className="border border-slate-200 rounded p-4 space-y-2 text-sm">
            {[
              ["Subtotal", `LKR ${subtotal.toFixed(2)}`],
              ["Other Charges", `LKR ${otherCharges.toFixed(2)}`],
              ["Discount on All", `LKR ${discountAmt.toFixed(2)}`],
              ["Round Off ⓘ", `LKR ${roundOff.toFixed(2)}`],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-slate-600">
                <span>{label}</span>
                <span>{val}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-2 text-base">
              <span>Grand Total</span>
              <span>LKR {grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Previous Payments */}
        <div className="mb-5">
          <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-t text-xs font-semibold text-slate-700">
            Previous Payments Information
          </div>
          <table className="w-full text-sm border border-t-0 border-slate-200">
            <thead>
              <tr className="bg-blue-600 text-white text-xs">
                {["#", "Date", "Payment Type", "Payment Note", "Payment", "Action"].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-semibold text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-sm">
                  Payments Pending!!
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Make Payment */}
        <div className="mb-5">
          <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-t text-xs font-semibold text-slate-700">
            Make Payment
          </div>
          <div className="border border-t-0 border-slate-200 rounded-b p-4">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Amount</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Payment Type</label>
                <select
                  value={payType}
                  onChange={(e) => setPayType(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white appearance-none"
                >
                  <option value="">-Select-</option>
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                  <option>Cheque</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Payment Note</label>
              <textarea
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                rows={2}
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 resize-y"
              />
            </div>
          </div>
        </div>

        {msg && (
          <div className={`mb-4 px-3 py-2 rounded text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
            {msg.text}
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded text-sm disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/purchase/list")}
            className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </PageScaffold>
  );
}
