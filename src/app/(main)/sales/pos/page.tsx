"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { DateInput } from "@/components/DateInput";
import {
  Camera, ChevronDown, CreditCard, RotateCcw, ShoppingCart,
  Trash2, User, X, Banknote, Building2, Plus, Hourglass,
} from "lucide-react";

// Types
type Item = { pk: string; name: string; price: number; unit?: string; categoryId?: string; brandId?: string; entityType?: string };
type Category = { pk: string; name: string };
type Brand = { pk: string; name: string };
type Customer = {
  pk: string;
  name: string;
  mobile?: string;
  phone?: string;
  discountType?: "percentage" | "fixed";
  discount?: number;
};

type Line = { itemId?: string; description: string; qty: number; unitPrice: number; discount: number; discountStr?: string; unit?: string };

type OtherChargeItem = { id: string; description: string; amount: number };

type MultiPayment = { id: string; type: "Cash" | "Card" | "Bank Transfer"; amount: number; cardLast4?: string; note?: string };

type HeldOrder = {
  id: string;
  holdNumber: string;
  customer: Customer;
  lines: Line[];
  deliveryDate: string;
  deliveryTime?: string;
  otherCharges: number;
  otherChargeItems?: OtherChargeItem[];
  posDiscount?: number;
  posDiscountType?: "percentage" | "fixed";
  total: number;
  savedAt: string;
};

const COUNTRIES = ["Sri Lanka","India","United Kingdom","United States","Australia","Canada","Singapore","Malaysia","Other"];

type NewCustomerForm = {
  name: string; mobile: string; email: string; phone: string;
  country: string; city: string; address: string; dob: string;
};

const INITIAL_NEW_CUST: NewCustomerForm = { name: "", mobile: "", email: "", phone: "", country: "Sri Lanka", city: "", address: "", dob: "" };

const WALK_IN: Customer = { pk: "", name: "Walk-in Customer" };
const HOLD_KEY = "pos_held_orders";

function todayISO() { return new Date().toISOString().slice(0, 10); }

function getHeldOrders(): HeldOrder[] {
  try { return JSON.parse(localStorage.getItem(HOLD_KEY) ?? "[]") as HeldOrder[]; } catch { return []; }
}
function saveHeldOrders(orders: HeldOrder[]) { localStorage.setItem(HOLD_KEY, JSON.stringify(orders)); }

function normalizeCustomer(customer: Customer): Customer {
  const discount = Number(customer.discount);
  const hasDiscount = Number.isFinite(discount) && discount > 0;

  return {
    ...customer,
    discount: hasDiscount ? discount : undefined,
    discountType: hasDiscount ? customer.discountType || "percentage" : undefined,
  };
}

function canUseDecimalQty(unit?: string) {
  return unit?.trim().toLowerCase() === "kg";
}

function normalizeQty(value: number, unit?: string) {
  if (!Number.isFinite(value)) return canUseDecimalQty(unit) ? 0.01 : 1;
  const min = canUseDecimalQty(unit) ? 0.01 : 1;
  const next = canUseDecimalQty(unit) ? value : Math.trunc(value);
  return Math.max(min, next);
}

// Inner component (uses useSearchParams)
function PosInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const holdId = searchParams.get("holdId");

  const [deliveryDate, setDeliveryDate] = useState(todayISO());
  const [deliveryTime, setDeliveryTime] = useState("");
  const [customer, setCustomer] = useState<Customer>(WALK_IN);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // New customer modal
  const [showNewCustModal, setShowNewCustModal] = useState(false);
  const [newCustForm, setNewCustForm] = useState<NewCustomerForm>(INITIAL_NEW_CUST);
  const [savingNewCust, setSavingNewCust] = useState(false);
  const [newCustMsg, setNewCustMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [catFilter, setCatFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [itemSearch, setItemSearch] = useState("");

  const [lines, setLines] = useState<Line[]>([]);
  const [otherChargeItems, setOtherChargeItems] = useState<OtherChargeItem[]>([]);
  const [newChargeDesc, setNewChargeDesc] = useState("");
  const [newChargeAmt, setNewChargeAmt] = useState("");
  const [chargeNameSuggestions, setChargeNameSuggestions] = useState<string[]>([]);
  const [posDiscount, setPosDiscount] = useState(0);
  const [posDiscountType, setPosDiscountType] = useState<"percentage" | "fixed">("fixed");
  const [posDiscountStr, setPosDiscountStr] = useState<string | undefined>(undefined);
  const [sendSms, setSendSms] = useState(true);
  const [previouslyPaid, setPreviouslyPaid] = useState(0);

  // Payment modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payType, setPayType] = useState<"Cash" | "Card" | "Bank Transfer">("Cash");
  const [payAmount, setPayAmount] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [payNote, setPayNote] = useState("");
  const [multiPayments, setMultiPayments] = useState<MultiPayment[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Mobile tab: "items" shows the item catalog, "cart" shows the invoice
  // const [mobileTab, setMobileTab] = useState<"items" | "cart">("items"); // removed — single scrollable page

  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowCustomerDrop(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load reference data
  const loadData = useCallback(async () => {
    const [ir, cr, br, cust] = await Promise.all([
      api<{ items: Item[] }>("/api/items"),
      api<{ categories: Category[] }>("/api/items/categories?kind=item"),
      api<{ brands: Brand[] }>("/api/items/brands"),
      api<{ customers: Customer[] }>("/api/customers"),
    ]);
    if (ir.ok && ir.data?.items) setItems(ir.data.items.filter((i) => i.entityType === "ITEM"));
    if (cr.ok && cr.data?.categories) setCategories(cr.data.categories);
    if (br.ok && br.data?.brands) setBrands(br.data.brands);
    if (cust.ok && cust.data?.customers) {
      setCustomers(
        cust.data.customers
          .filter((c) => c.pk?.startsWith("CUSTOMER#"))
          .map(normalizeCustomer)
      );
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load unique other-charge names from past sales for autocomplete
  useEffect(() => {
    api<{ sales: { otherChargeItems?: { description: string; amount: number }[]; entityType?: string }[] }>("/api/sales").then((res) => {
      if (!res.ok || !res.data?.sales) return;
      const names = new Set<string>();
      for (const s of res.data.sales) {
        if (s.entityType !== "SALE") continue;
        for (const c of s.otherChargeItems ?? []) {
          if (c.description) names.add(c.description);
        }
      }
      setChargeNameSuggestions(Array.from(names).sort());
    });
  }, []);

  // Load existing sale (edit mode)
  useEffect(() => {
    if (!editId) return;
    (async () => {
      const res = await api<Record<string, unknown>>(`/api/sales/${editId}`);
      if (!res.ok || !res.data) return;
      const s = res.data as {
        customerName?: string; customerId?: string; customerMobile?: string;
        deliveryDate?: string; otherCharges?: number;
        otherChargeItems?: { description: string; amount: number }[];
        discountOnAll?: number; discountOnAllType?: string;
        lines?: Line[];
        paidAmount?: number;
      };
      setDeliveryDate(s.deliveryDate ?? todayISO());
      if (Array.isArray(s.otherChargeItems) && s.otherChargeItems.length > 0) {
        setOtherChargeItems(s.otherChargeItems.map((c, idx) => ({ id: `oc-${Date.now()}-${idx}`, description: c.description, amount: Number(c.amount) })));
      } else if ((s.otherCharges ?? 0) > 0) {
        setOtherChargeItems([{ id: "oc-legacy", description: "Other Charges", amount: s.otherCharges! }]);
      } else {
        setOtherChargeItems([]);
      }
      setPosDiscount(s.discountOnAll ?? 0);
      setPosDiscountType((s.discountOnAllType as "percentage" | "fixed") ?? "fixed");
      setPreviouslyPaid(s.paidAmount ?? 0);
      if (s.lines) setLines(s.lines.map((l) => ({ ...l, discount: l.discount ?? 0 })));

      if (s.customerId) {
        const found = customers.find(
          (c) =>
            c.pk === `CUSTOMER#${s.customerId}` || c.pk.replace("CUSTOMER#", "") === s.customerId
        );
        if (found) {
          setCustomer(found);
          setCustomerSearch(found.name);
          return;
        }
      }

      if (s.customerName) {
        setCustomerSearch(s.customerName);
      } else {
        setCustomerSearch("Walk-in Customer");
      }
    })();
  }, [customers, editId]);

  // Load held order
  useEffect(() => {
    if (!holdId) return;
    const held = getHeldOrders();
    const order = held.find(h => h.id === holdId);
    if (!order) return;
    const heldCustomer = normalizeCustomer(order.customer);
    setCustomer(heldCustomer);
    setCustomerSearch(heldCustomer.name);
    setLines(order.lines);
    setDeliveryDate(order.deliveryDate);
    setDeliveryTime(order.deliveryTime ?? "");
    if (order.otherChargeItems && order.otherChargeItems.length > 0) {
      setOtherChargeItems(order.otherChargeItems.map((c, idx) => ({ ...c, id: c.id || `oc-${Date.now()}-${idx}` })));
    } else if (order.otherCharges > 0) {
      setOtherChargeItems([{ id: "oc-legacy", description: "Other Charges", amount: order.otherCharges }]);
    } else {
      setOtherChargeItems([]);
    }
    setPosDiscount(order.posDiscount ?? 0);
    setPosDiscountType(order.posDiscountType ?? "fixed");
    // Remove from held list
    saveHeldOrders(held.filter(h => h.id !== holdId));
  }, [holdId]);

  // Derived
  const filteredItems = useMemo(() => items.filter(it => {
    const matchCat = catFilter === "all" || it.categoryId === catFilter;
    const matchBrand = brandFilter === "all" || it.brandId === brandFilter;
    const matchSearch = !itemSearch || it.name.toLowerCase().includes(itemSearch.toLowerCase());
    return matchCat && matchBrand && matchSearch;
  }), [items, catFilter, brandFilter, itemSearch]);

  const allCustomerOptions = useMemo(() => [WALK_IN, ...customers], [customers]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase();
    if (!q) return allCustomerOptions;
    return allCustomerOptions.filter(c =>
      c.name.toLowerCase().includes(q) || (c.mobile ?? "").includes(q) || (c.phone ?? "").includes(q)
    );
  }, [allCustomerOptions, customerSearch]);

  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const totalAmount = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const totalDiscount = lines.reduce((s, l) => s + l.discount * l.qty, 0);
  const posDiscountAmount = posDiscountType === "percentage"
    ? Math.max(0, totalAmount - totalDiscount) * posDiscount / 100
    : posDiscount;
  const otherCharges = otherChargeItems.reduce((s, c) => s + c.amount, 0);
  const grandTotal = totalAmount - totalDiscount - posDiscountAmount + otherCharges;
  const multiTotalPaid = multiPayments.reduce((s, p) => s + p.amount, 0);
  const balance = grandTotal - previouslyPaid - multiTotalPaid;

  const autoPay = searchParams.get("pay") === "1";
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  useEffect(() => {
    if (autoPay && lines.length > 0 && !hasAutoOpened) {
      setHasAutoOpened(true);
      openPayModal();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPay, lines.length, hasAutoOpened]);

  // Line helpers
  function getLineUnit(line: Line) {
    if (line.unit) return line.unit;
    const itemId = line.itemId?.replace("ITEM#", "");
    return items.find((item) =>
      item.pk === line.itemId || item.pk.replace("ITEM#", "") === itemId
    )?.unit;
  }

  function addItem(item: Item) {
    setLines(prev => {
      const idx = prev.findIndex(l => l.itemId === item.pk);
      if (idx >= 0) {
        return prev.map((l, i) => {
          if (i !== idx) return l;
          const qty = l.qty + 1;
          return { ...l, qty };
        });
      }
      // Auto-switch removed — single scrollable page
      return [...prev, { itemId: item.pk, description: item.name, qty: 1, unitPrice: item.price, discount: 0, unit: item.unit }];
    });
    setMsg(null);
  }

  function setLine(i: number, patch: Partial<Line>) {
    setLines(prev => prev.map((l, j) => j === i ? { ...l, ...patch } : l));
  }
  function setLineQty(i: number, qty: number) {
    setLines(prev => prev.map((line, j) => {
      if (j !== i) return line;
      const unit = getLineUnit(line);
      const nextQty = normalizeQty(qty, unit);
      return { ...line, unit, qty: nextQty };
    }));
  }
  function removeLine(i: number) { setLines(prev => prev.filter((_, j) => j !== i)); }

  function applyCustomerDiscount(selectedCustomer: Customer) {
    const nextCustomer = normalizeCustomer(selectedCustomer);
    setCustomer(nextCustomer);
    setCustomerSearch(nextCustomer.pk ? nextCustomer.name : "");
    setShowCustomerDrop(false);
    // Apply customer discount at invoice level, not per line
    const disc = Number(nextCustomer.discount ?? 0);
    if (nextCustomer.pk && disc > 0 && nextCustomer.discountType) {
      setPosDiscount(disc);
      setPosDiscountType(nextCustomer.discountType);
    } else {
      setPosDiscount(0);
      setPosDiscountType("fixed");
    }
    setPosDiscountStr(undefined);
  }

  async function handleSaveNewCustomer(e: React.FormEvent) {
    e.preventDefault();
    setNewCustMsg(null);
    setSavingNewCust(true);
    const res = await api<{ id: string; pk: string; name: string; mobile?: string; phone?: string; discountType?: "percentage" | "fixed"; discount?: number }>("/api/customers", {
      method: "POST",
      body: JSON.stringify({ ...newCustForm, status: "active" }),
    });
    setSavingNewCust(false);
    if (!res.ok) {
      setNewCustMsg({ type: "err", text: res.error || "Failed to save customer" });
      return;
    }
    setNewCustMsg({ type: "ok", text: "Customer saved successfully." });
    // Reload customers list then auto-select the new one
    await loadData();
    if (res.data) {
      const newC = normalizeCustomer({
        pk: res.data.pk,
        name: res.data.name,
        mobile: res.data.mobile,
        phone: res.data.phone,
        discountType: res.data.discountType,
        discount: res.data.discount,
      });
      applyCustomerDiscount(newC);
    }
    setNewCustForm(INITIAL_NEW_CUST);
    setShowNewCustModal(false);
  }

  // Hold
  function holdSale() {
    if (lines.length === 0) { setMsg({ type: "err", text: "No items to hold." }); return; }
    const held = getHeldOrders();
    const holdNumber = `HOLD-${String(held.length + 1).padStart(3, "0")}`;
    const order: HeldOrder = {
      id: `hold-${Date.now()}`,
      holdNumber,
      customer,
      lines,
      deliveryDate,
      deliveryTime,
      otherCharges,
      otherChargeItems,
      posDiscount,
      posDiscountType,
      total: grandTotal,
      savedAt: new Date().toISOString(),
    };
    saveHeldOrders([...held, order]);
    setLines([]);
    setOtherChargeItems([]);
    setNewChargeDesc("");
    setNewChargeAmt("");
    setPosDiscount(0);
    setPosDiscountType("fixed");
    setPosDiscountStr(undefined);
    applyCustomerDiscount(WALK_IN);
    router.push("/sales/holds");
  }

  // Payment modal helpers
  function openPayModal() {
    setMultiPayments([]);
    setPayAmount(Math.max(0, grandTotal - previouslyPaid).toFixed(2));
    setPayType("Cash");
    setCardLast4("");
    setPayNote("");
    setShowPayModal(true);
  }

  function addMultiPayment() {
    const amt = parseFloat(payAmount);
    if (!payAmount || isNaN(amt) || amt <= 0) return;
    if (payType === "Card" && cardLast4.length !== 4) { setMsg({ type: "err", text: "Enter last 4 digits of card." }); return; }
    setMultiPayments(prev => [...prev, {
      id: `pay-${Date.now()}`,
      type: payType,
      amount: amt,
      cardLast4: payType === "Card" ? cardLast4 : undefined,
      note: payType !== "Card" ? payNote : undefined,
    }]);
    setPayAmount("");
    setCardLast4("");
    setPayNote("");
    setMsg(null);
  }

  function removeMultiPayment(id: string) {
    setMultiPayments(prev => prev.filter(p => p.id !== id));
  }

  // Submit
  async function handlePayLater() {
    if (lines.length === 0) { setMsg({ type: "err", text: "No items added." }); return; }
    setSubmitting(true);
    setMsg(null);

    const linePayload = lines.map(l => ({
      itemId: l.itemId,
      description: l.description,
      qty: l.qty,
      unitPrice: l.unitPrice,
      discount: l.discount,
      lineTotal: l.qty * (l.unitPrice - l.discount),
    }));

    let savedId: string | null = editId ?? null;
    if (!editId) {
      const customerMobile = customer.mobile ?? customer.phone;
      const res = await api<{ id: string }>("/api/sales/pos", {
        method: "POST",
        body: JSON.stringify({
          customerId: customer.pk ? customer.pk.replace("CUSTOMER#", "") : undefined,
          customerName: customer.name || undefined,
          customerMobile,
          deliveryDate,
          deliveryTime: deliveryTime || undefined,
          otherCharges,
          otherChargeItems: otherChargeItems.length > 0 ? otherChargeItems.map(c => ({ description: c.description, amount: c.amount })) : undefined,
          discountOnAll: posDiscountAmount || undefined,
          discountOnAllType: posDiscountAmount > 0 ? posDiscountType : undefined,
          sendSms,
          payments: [],
          lines: linePayload,
        }),
      });
      if (!res.ok || !res.data?.id) { setMsg({ type: "err", text: res.error ?? "Could not create sale." }); setSubmitting(false); return; }
      savedId = res.data.id;
      if (sendSms && customerMobile) {
        setMsg({ type: "ok", text: "Sale saved. SMS sent to customer." });
        await new Promise(r => setTimeout(r, 1500));
      }
    } else {
      const upd = await api(`/api/sales/${editId}`, {
        method: "PUT",
        body: JSON.stringify({
          customerId: customer.pk ? customer.pk.replace("CUSTOMER#", "") : undefined,
          customerName: customer.name || undefined,
          customerMobile: customer.mobile ?? customer.phone,
          deliveryDate,
          deliveryTime: deliveryTime || undefined,
          otherCharges,
          otherChargeItems: otherChargeItems.length > 0 ? otherChargeItems.map(c => ({ description: c.description, amount: c.amount })) : undefined,
          discountOnAll: posDiscountAmount || undefined,
          discountOnAllType: posDiscountAmount > 0 ? posDiscountType : undefined,
          lines: linePayload,
        }),
      });
      if (!upd.ok) { setMsg({ type: "err", text: upd.error ?? "Failed to update sale." }); setSubmitting(false); return; }
    }

    setSubmitting(false);
    router.push(`/sales/${savedId}/view?print=1`);
  }

  async function handlePayAll() {
    if (lines.length === 0) { setMsg({ type: "err", text: "No items added." }); return; }
    if (multiPayments.length === 0) { setMsg({ type: "err", text: "Add at least one payment entry." }); return; }
    setSubmitting(true);
    setMsg(null);

    const payments = multiPayments.map(p => ({
      id: p.id,
      date: todayISO(),
      paymentType: p.type,
      note: p.type === "Card" ? `Card ****${p.cardLast4}` : (p.note ?? ""),
      amount: p.amount,
    }));

    const linePayload = lines.map(l => ({
      itemId: l.itemId,
      description: l.description,
      qty: l.qty,
      unitPrice: l.unitPrice,
      discount: l.discount,
      lineTotal: l.qty * (l.unitPrice - l.discount),
    }));

    let saleId: string | null = null;

    if (editId) {
      // Update existing sale
      const upd = await api(`/api/sales/${editId}`, {
        method: "PUT",
        body: JSON.stringify({
          customerId: customer.pk ? customer.pk.replace("CUSTOMER#", "") : undefined,
          customerName: customer.name || undefined,
          customerMobile: customer.mobile ?? customer.phone,
          deliveryDate,
          deliveryTime: deliveryTime || undefined,
          otherCharges,
          otherChargeItems: otherChargeItems.length > 0 ? otherChargeItems.map(c => ({ description: c.description, amount: c.amount })) : undefined,
          discountOnAll: posDiscountAmount || undefined,
          discountOnAllType: posDiscountAmount > 0 ? posDiscountType : undefined,
          lines: linePayload,
        }),
      });
      if (!upd.ok) { setMsg({ type: "err", text: upd.error ?? "Failed to update sale." }); setSubmitting(false); return; }
      // Add new payments
      for (const p of payments) {
        await api(`/api/sales/${editId}/payments`, {
          method: "POST",
          body: JSON.stringify({ amount: p.amount, paymentType: p.paymentType, date: p.date, note: p.note }),
        });
      }
      saleId = editId;
    } else {
      const customerMobile = customer.mobile ?? customer.phone;
      const res = await api<{ id: string }>("/api/sales/pos", {
        method: "POST",
        body: JSON.stringify({
          customerId: customer.pk ? customer.pk.replace("CUSTOMER#", "") : undefined,
          customerName: customer.name || undefined,
          customerMobile,
          deliveryDate,
          deliveryTime: deliveryTime || undefined,
          otherCharges,
          otherChargeItems: otherChargeItems.length > 0 ? otherChargeItems.map(c => ({ description: c.description, amount: c.amount })) : undefined,
          discountOnAll: posDiscountAmount || undefined,
          discountOnAllType: posDiscountAmount > 0 ? posDiscountType : undefined,
          sendSms,
          payments,
          lines: linePayload,
        }),
      });
      if (!res.ok || !res.data?.id) { setMsg({ type: "err", text: res.error ?? "Could not create sale." }); setSubmitting(false); return; }
      saleId = res.data.id;

      // Brief confirmation if SMS was requested
      if (sendSms && customerMobile) {
        setMsg({ type: "ok", text: "Sale saved. SMS sent to customer." });
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    setSubmitting(false);
    setShowPayModal(false);
    router.push(`/sales/${saleId}/view?print=1`);
  }

  const PAYMENT_TYPES = ["Cash", "Card", "Bank Transfer"] as const;

  return (
    <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      <AppHeader title={editId ? "POS - Edit Sale" : "POS - Sales Invoice"} subtitle="" />

      <div className="flex flex-col lg:flex-row lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        {/* Left panel — invoice/cart (bottom on mobile, left on desktop) */}
        <div className="flex flex-col w-full border-b border-slate-200 bg-white order-2 lg:order-1 lg:w-[65%] lg:border-b-0 lg:border-r lg:overflow-hidden lg:min-h-0">

          {/* Invoice header */}
          <div className="px-4 pt-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-base mb-3">
              <ShoppingCart className="w-4 h-4" />
              Sales Invoice
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Customer selector */}
              <div className="relative flex-1" ref={dropRef}>
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDrop(true); }}
                  onFocus={() => setShowCustomerDrop(true)}
                  placeholder="Search customer..."
                  className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded text-sm outline-none focus:border-blue-400"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {customer.pk && (
                    <button type="button" onClick={() => applyCustomerDiscount(WALK_IN)}
                      className="text-slate-400 hover:text-slate-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>

                {showCustomerDrop && (
                  <div className="absolute z-30 top-full left-0 right-0 bg-white border border-slate-200 rounded shadow-lg mt-0.5 max-h-52 overflow-y-auto">
                    {filteredCustomers.map((c) => (
                      <div key={c.pk || "walkin"}
                        className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${c.pk === "" ? "bg-slate-50 border-b border-slate-100 font-medium text-blue-700" : "hover:bg-slate-50"}`}
                        onClick={() => applyCustomerDiscount(c)}>
                        <span>{c.name}</span>
                        {(c.mobile ?? c.phone) && <span className="text-slate-400 text-xs">{c.mobile ?? c.phone}</span>}
                      </div>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <div className="px-3 py-2 text-sm text-slate-400">No customers found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Add new customer button */}
              <button
                type="button"
                onClick={() => { setNewCustForm(INITIAL_NEW_CUST); setNewCustMsg(null); setShowNewCustModal(true); }}
                className="shrink-0 flex items-center justify-center w-9 h-9 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                title="Add new customer">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {customer.pk && customer.discountType && Number(customer.discount ?? 0) > 0 ? (
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5 font-medium">
                  Customer discount: {Number(customer.discount).toFixed(2)}{customer.discountType === "percentage" ? "%" : " fixed"}
                  {totalDiscount > 0 && <span className="text-blue-500">— applied: {totalDiscount.toFixed(2)}</span>}
                </span>
              ) : (
                <span>No customer discount</span>
              )}
            </div>
          </div>

          {/* Line items table */}
          <div className="overflow-x-auto lg:flex-1 lg:overflow-auto">
            <table className="w-full min-w-[520px] text-sm border-collapse">
              <thead className="sticky top-0 bg-blue-600 text-white text-xs z-10">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Item Name</th>
                  <th className="px-2 py-2 text-center font-semibold w-24">Qty</th>
                  <th className="px-2 py-2 text-center font-semibold w-20">Price</th>
                  <th className="px-2 py-2 text-center font-semibold w-20">Discount</th>
                  <th className="px-2 py-2 text-right font-semibold w-24">Subtotal</th>
                  <th className="px-1 py-2 w-7 bg-blue-700" />
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-20 text-center text-slate-400 text-sm">Click items on the right to add them</td></tr>
                ) : lines.map((l, i) => {
                  const lineUnit = getLineUnit(l);
                  const decimalQty = canUseDecimalQty(lineUnit);

                  return (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/70">
                      <td className="px-3 py-1.5 text-slate-800 font-medium">{l.description}</td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={decimalQty ? 0.01 : 1}
                          step={decimalQty ? 0.01 : 1}
                          value={l.qty}
                          onChange={(e) => setLineQty(i, Number(e.target.value))}
                          className="w-full text-center border border-slate-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:border-blue-400"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center text-slate-700">{l.unitPrice.toFixed(2)}</td>
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={l.discountStr !== undefined ? l.discountStr : (l.discount === 0 ? "" : String(l.discount))}
                          placeholder="0"
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                              const num = raw === "" || raw === "." ? 0 : parseFloat(raw);
                              setLine(i, { discountStr: raw, discount: isNaN(num) ? 0 : num });
                            }
                          }}
                          onBlur={() => {
                            const num = parseFloat(l.discountStr ?? "0") || 0;
                            setLine(i, { discountStr: undefined, discount: num });
                          }}
                          className="w-full text-center border border-slate-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:border-blue-400"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold text-slate-900">
                        {(l.qty * (l.unitPrice - l.discount)).toFixed(2)}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 p-0.5">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* SMS + Other charges */}
          <div className="px-4 py-2.5 border-t border-slate-100 flex flex-col gap-3 xl:flex-row xl:items-start">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                <input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} className="rounded" />
                Send SMS 
              </label>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 font-medium w-24">Delivery Date</span>
                  <DateInput
                    value={deliveryDate}
                    onChange={setDeliveryDate}
                    className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400 bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 font-medium w-24">Delivery Time</span>
                  <input
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-slate-600 font-semibold">Other Charges</span>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  list="charge-name-suggestions"
                  placeholder="Description"
                  value={newChargeDesc}
                  onChange={(e) => setNewChargeDesc(e.target.value)}
                  className="w-full sm:w-36 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                />
                <datalist id="charge-name-suggestions">
                  {chargeNameSuggestions.map((s) => <option key={s} value={s} />)}
                </datalist>
                <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={newChargeAmt}
                  onChange={(e) => setNewChargeAmt(e.target.value)}
                  className="w-full sm:w-20 border border-slate-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    const amt = parseFloat(newChargeAmt);
                    if (!newChargeDesc.trim() || isNaN(amt) || amt <= 0) return;
                    setOtherChargeItems(prev => [...prev, { id: `oc-${Date.now()}`, description: newChargeDesc.trim(), amount: amt }]);
                    setNewChargeDesc("");
                    setNewChargeAmt("");
                  }}
                  className="shrink-0 p-0.5 rounded border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                </div>
              </div>
              {otherChargeItems.length > 0 && (
                <div className="space-y-0.5 max-w-64">
                  {otherChargeItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 rounded px-2 py-0.5 border border-slate-100">
                      <span className="flex-1 truncate">{item.description}</span>
                      <span className="font-semibold shrink-0">{item.amount.toFixed(2)}</span>
                      <button type="button" onClick={() => setOtherChargeItems(prev => prev.filter(c => c.id !== item.id))}
                        className="text-red-400 hover:text-red-600 shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {otherChargeItems.length > 1 && (
                    <div className="text-xs font-bold text-slate-700 px-2">
                      Total: {otherCharges.toFixed(2)}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-start">
              <span className="text-sm text-slate-600 font-medium">POS Discount</span>
              <div className="flex items-center gap-1">
                <select
                  value={posDiscountType}
                  onChange={(e) => setPosDiscountType(e.target.value as "percentage" | "fixed")}
                  className="border border-slate-200 rounded px-1 py-1 text-sm focus:outline-none focus:border-blue-400 bg-white">
                  <option value="fixed">Fixed</option>
                  <option value="percentage">%</option>
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={posDiscountStr !== undefined ? posDiscountStr : (posDiscount === 0 ? "" : String(posDiscount))}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                      const num = raw === "" || raw === "." ? 0 : parseFloat(raw);
                      setPosDiscountStr(raw);
                      setPosDiscount(isNaN(num) ? 0 : num);
                    }
                  }}
                  onBlur={() => {
                    const num = parseFloat(posDiscountStr ?? "0") || 0;
                    setPosDiscountStr(undefined);
                    setPosDiscount(num);
                  }}
                  className="w-24 border border-slate-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:border-blue-400"
                />
                {posDiscountType === "percentage" && posDiscount > 0 && (
                  <span className="text-xs text-slate-500">= {posDiscountAmount.toFixed(2)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Totals bar */}
          <div className="border-t border-slate-200 bg-slate-100 px-4 py-2 grid grid-cols-2 gap-2 text-center sm:grid-cols-4 sm:divide-x sm:divide-slate-300">
            <div className="px-2"><div className="text-xs font-bold text-slate-600 mb-0.5">Quantity:</div><div className="text-xl font-bold text-slate-800">{totalQty}</div></div>
            <div className="px-2"><div className="text-xs font-bold text-slate-600 mb-0.5">Total Amount:</div><div className="text-xl font-bold text-slate-800">{totalAmount.toFixed(2)}</div></div>
            <div className="px-2">
              <div className="text-xs font-bold text-slate-600 mb-0.5">Total Discount:</div>
              <div className="text-xl font-bold text-slate-800">{(totalDiscount + posDiscountAmount).toFixed(2)}</div>
              {(totalDiscount > 0 || posDiscountAmount > 0) && (
                <div className="mt-0.5 space-y-0.5 text-left">
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Item disc.</span>
                      <span>{totalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {posDiscountAmount > 0 && (
                    <div className="flex justify-between text-xs text-amber-600 font-medium">
                      <span>{customer.pk ? "Cust. disc." : "POS disc."}{posDiscountType === "percentage" ? ` (${posDiscount}%)` : ""}</span>
                      <span>{posDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-2"><div className="text-xs font-bold text-slate-600 mb-0.5">Grand Total:</div><div className="text-xl font-bold text-blue-700">{grandTotal.toFixed(2)}</div></div>
          </div>

          {/* Action buttons */}
          {editId ? (
            <div className="grid grid-cols-2">
              <button type="button" onClick={openPayModal} disabled={lines.length === 0 || submitting}
                className="bg-green-600 hover:bg-green-700 text-white py-3.5 text-sm font-bold transition-colors disabled:opacity-50">
                Update &amp; Pay
              </button>
              <button type="button" onClick={() => router.push("/sales/list")}
                className="bg-slate-500 hover:bg-slate-600 text-white py-3.5 text-sm font-bold transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3">
              <button type="button" onClick={holdSale}
                className="bg-rose-500 hover:bg-rose-600 text-white py-3.5 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors border-r border-rose-400">
                Hold
              </button>
              <button type="button" onClick={handlePayLater} disabled={lines.length === 0 || submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white py-3.5 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors border-r border-blue-500 disabled:opacity-50">
                <Hourglass className="w-4 h-4" /> Pay Later
              </button>
              <button type="button" onClick={openPayModal} disabled={lines.length === 0 || submitting}
                className="bg-green-600 hover:bg-green-700 text-white py-3.5 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50">
                Multiple / Pay
              </button>
            </div>
          )}

          {msg && !showPayModal && (
            <div className={`px-4 py-2 text-sm text-center font-medium ${msg.type === "ok" ? "bg-green-50 text-green-700 border-t border-green-100" : "bg-red-50 text-red-700 border-t border-red-100"}`}>
              {msg.text}
            </div>
          )}
        </div>

        {/* Right panel — item catalog (top on mobile, right on desktop) */}
        <div className="flex flex-col bg-white order-1 lg:order-2 lg:flex-1 lg:overflow-hidden lg:min-h-0">
          <div className="px-3 pt-3 pb-2 border-b border-slate-100 space-y-2">
            <div className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_auto_1fr_auto]">
              <div className="relative flex-1">
                <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
                  className="w-full appearance-none border border-slate-300 rounded px-3 py-1.5 text-sm pr-7 outline-none focus:border-blue-400 bg-white">
                  <option value="all">All Services</option>
                  {categories.map(c => <option key={c.pk} value={c.pk}>{c.name}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <button type="button" onClick={() => setCatFilter("all")} className="p-1.5 border border-slate-300 rounded text-blue-600 hover:bg-blue-50">
                <RotateCcw className="w-4 h-4" />
              </button>
              <div className="relative flex-1">
                <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}
                  className="w-full appearance-none border border-slate-300 rounded px-3 py-1.5 text-sm pr-7 outline-none focus:border-blue-400 bg-white">
                  <option value="all">All Laundry Type</option>
                  {brands.map(b => <option key={b.pk} value={b.pk}>{b.name}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <button type="button" onClick={() => setBrandFilter("all")} className="p-1.5 border border-slate-300 rounded text-blue-600 hover:bg-blue-50">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <input value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder="Item Name"
                className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
              <button type="button" onClick={() => setItemSearch("")} className="p-1.5 border border-slate-300 rounded text-blue-600 hover:bg-blue-50">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-2 lg:flex-1 lg:overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-sm">{items.length === 0 ? "Loading items..." : "No items match filters"}</div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {filteredItems.map((item) => {
                  const lineQty = lines.find(l => l.itemId === item.pk)?.qty;
                  return (
                    <button key={item.pk} type="button" onClick={() => addItem(item)}
                      className="relative bg-green-500 hover:bg-green-600 active:scale-95 text-white rounded overflow-hidden text-center transition-all">
                      {lineQty !== undefined && (
                        <div className="absolute top-0 left-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-br z-10 leading-tight">Qty: {lineQty}</div>
                      )}
                      <div className="flex items-center justify-center py-5 bg-green-500">
                        <div className="w-12 h-12 rounded-full border-2 border-white/40 bg-white/20 flex items-center justify-center">
                          <Camera className="w-6 h-6 text-white/60" />
                        </div>
                      </div>
                      <div className="px-1 pb-2">
                        <div className="text-[11px] font-bold uppercase leading-tight text-white">{item.name}</div>
                        <div className="text-sm font-bold text-white mt-0.5">{item.price.toFixed(2)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Customer Modal */}
      {showNewCustModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowNewCustModal(false); }}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="font-bold text-lg text-slate-800">Add New Customer</h2>
              <button type="button" onClick={() => setShowNewCustModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveNewCustomer} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Customer Name<span className="text-red-500">*</span></label>
                  <input required value={newCustForm.name} onChange={(e) => setNewCustForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Mobile Number</label>
                  <input value={newCustForm.mobile} onChange={(e) => setNewCustForm(p => ({ ...p, mobile: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                  <input type="email" value={newCustForm.email} onChange={(e) => setNewCustForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Whatsapp Number</label>
                  <input value={newCustForm.phone} onChange={(e) => setNewCustForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
                  <select value={newCustForm.country} onChange={(e) => setNewCustForm(p => ({ ...p, country: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white">
                    {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                  <input value={newCustForm.city} onChange={(e) => setNewCustForm(p => ({ ...p, city: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Birthday</label>
                  <input type="date" value={newCustForm.dob} onChange={(e) => setNewCustForm(p => ({ ...p, dob: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                  <textarea value={newCustForm.address} onChange={(e) => setNewCustForm(p => ({ ...p, address: e.target.value }))}
                    rows={2} className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 resize-y" />
                </div>
              </div>
              {newCustMsg && (
                <div className={`px-3 py-2 rounded text-sm ${newCustMsg.type === "ok" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                  {newCustMsg.text}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={savingNewCust}
                  className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded text-sm disabled:opacity-60 transition-colors">
                  {savingNewCust ? "Saving..." : "Save & Select"}
                </button>
                <button type="button" onClick={() => setShowNewCustModal(false)}
                  className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowPayModal(false); }}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="font-bold text-lg text-slate-800">Payment</h2>
              <div className="text-sm font-semibold text-blue-700">Grand Total: LKR {grandTotal.toFixed(2)}</div>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {/* Payment type selector */}
              <div className="flex gap-2">
                {PAYMENT_TYPES.map(t => (
                  <button key={t} type="button"
                    onClick={() => { setPayType(t); setCardLast4(""); setPayNote(""); setPayAmount(Math.max(0, balance).toFixed(2)); }}
                    className={`flex-1 py-2 rounded text-xs sm:text-sm font-semibold border transition-colors flex items-center justify-center gap-1 sm:gap-1.5
                      ${payType === t ? "bg-blue-600 text-white border-blue-600" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
                    {t === "Cash" && <Banknote className="w-3.5 h-3.5 shrink-0" />}
                    {t === "Card" && <CreditCard className="w-3.5 h-3.5 shrink-0" />}
                    {t === "Bank Transfer" && <Building2 className="w-3.5 h-3.5 shrink-0" />}
                    {t === "Bank Transfer" ? (
                      <><span className="hidden sm:inline">Bank </span>Transfer</>
                    ) : t}
                  </button>
                ))}
              </div>

              {/* Amount + extra field */}
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

              {/* Payment entries list */}
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

              {/* Summary */}
              <div className="flex justify-between items-center text-sm font-semibold bg-slate-50 rounded px-3 py-2">
                <span>Total Paid: <span className="text-green-600">{multiTotalPaid.toFixed(2)}</span></span>
                <span>Balance: <span className={balance > 0.005 ? "text-red-600" : "text-green-600"}>{balance.toFixed(2)}</span></span>
              </div>

              {msg && (
                <div className={`px-3 py-2 rounded text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  {msg.text}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="p-4 border-t border-slate-200 flex gap-3 shrink-0">
              <button type="button" onClick={handlePayAll}
                disabled={submitting || multiPayments.length === 0}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded disabled:opacity-50 transition-colors">
                {submitting ? "Processing..." : "Pay All"}
              </button>
              <button type="button" onClick={() => setShowPayModal(false)}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Page wrapper with Suspense
export default function PosPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-400">Loading POS...</div>}>
      <PosInner />
    </Suspense>
  );
}
