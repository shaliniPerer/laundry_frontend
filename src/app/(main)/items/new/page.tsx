"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

type Brand = { pk: string; name: string };
type Category = { pk: string; name: string };
type Item = {
  pk: string;
  name: string;
  itemNumber?: string;
  brandId?: string;
  categoryId?: string;
  unit?: string;
  price?: number;
};
type ItemCountRow = { pk?: string };

const UNITS = ["Pieces", "Kg", "Pair", "Set"];

export default function NewItemPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = !!editId;
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemCount, setItemCount] = useState(0);
  const [editingItemNumber, setEditingItemNumber] = useState("");

  // Item Info
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState<number | "">("");
 



  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [br, cr, ir] = await Promise.all([
        api<{ brands: Brand[] }>("/api/items/brands"),
        api<{ categories: Category[] }>("/api/items/categories?kind=item"),
        api<{ items: ItemCountRow[] }>("/api/items"),
      ]);
      if (br.ok && br.data?.brands) setBrands(br.data.brands.filter((b) => b.pk?.startsWith("BRAND#")));
      if (cr.ok && cr.data?.categories) setCategories(cr.data.categories.filter((c) => c.pk?.startsWith("CATEGORY#")));
      if (ir.ok && ir.data?.items) setItemCount(ir.data.items.filter((i) => i.pk?.startsWith("ITEM#")).length);
    })();
  }, []);

  const itemNumber = useMemo(() => `IT${String(itemCount + 1).padStart(4, "0")}`, [itemCount]);
  const displayedItemNumber = isEditMode ? editingItemNumber || "—" : itemNumber;

  useEffect(() => {
    if (!editId) return;
    (async () => {
      const res = await api<Item>(`/api/items/${editId}`);
      if (!res.ok || !res.data) {
        setMsg({ type: "err", text: res.error || "Failed to load item for editing." });
        return;
      }
      const item = res.data;
      setName(item.name || "");
      setBrandId(item.brandId || "");
      setCategoryId(item.categoryId || "");
      setUnit(item.unit || "");
      setPrice(item.price ?? "");
      setEditingItemNumber(item.itemNumber || "");
    })();
  }, [editId]);

 
 

  const inputCls = "w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white";
  const readonlyCls = "w-full border border-slate-200 rounded px-3 py-1.5 text-sm bg-slate-100 text-slate-500 outline-none";
  const labelCls = "block text-xs font-medium text-slate-600 mb-1";

  // Submit handler
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        name: name.trim(),
        brandId,
        categoryId,
        unit,
        price,
      };
      const res = await api(isEditMode ? `/api/items/${editId}` : "/api/items", {
        method: isEditMode ? "PATCH" : "POST",
        body: JSON.stringify({
          ...payload,
        }),
      });
      if (res.ok) {
        setMsg({ type: "ok", text: isEditMode ? "Item updated successfully." : "Item created successfully." });
        if (!isEditMode) {
          setName("");
          setBrandId("");
          setCategoryId("");
          setUnit("");
          setPrice("");
          setItemCount((c) => c + 1);
        }
      } else {
        setMsg({ type: "err", text: res.error || (isEditMode ? "Failed to update item." : "Failed to create item.") });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error.";
      setMsg({ type: "err", text: message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageScaffold title="Items" subtitle={isEditMode ? "Edit Item" : "Add/Update Items"}>
      <form onSubmit={submit}>
        <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-5">
          <p className="text-sm font-semibold text-slate-700">Please Enter Valid Data</p>

          {/* ── Item Info ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Item Code (Auto generated)</label>
              <input readOnly value={displayedItemNumber} className={readonlyCls} />
            </div>
            <div className="col-span-2 sm:col-span-2">
              <label className={labelCls}>Item Name<span className="text-red-500">*</span></label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>

             <div>
              <label className={labelCls}>Service<span className="text-red-500">*</span></label>
              <div className="flex gap-1.5">
                <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`${inputCls} flex-1`}>
                  <option value="">— Select —</option>
                  {categories.map((c) => <option key={c.pk} value={c.pk}>{c.name}</option>)}
                </select>
                <button type="button" onClick={() => window.open("/items/categories/new", "_blank")} className="bg-blue-600 text-white px-2.5 rounded hover:bg-blue-700 shrink-0"><Plus className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div>
              <label className={labelCls}>Laundry Type</label>
              <div className="flex gap-1.5">
                <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={`${inputCls} flex-1`}>
                  <option value="">— Select —</option>
                  {brands.map((b) => <option key={b.pk} value={b.pk}>{b.name}</option>)}
                </select>
                <button type="button" onClick={() => window.open("/items/brands/new", "_blank")} className="bg-blue-600 text-white px-2.5 rounded hover:bg-blue-700 shrink-0"><Plus className="w-3.5 h-3.5" /></button>
              </div>
            </div>
           
            <div>
              <label className={labelCls}>Unit<span className="text-red-500">*</span></label>
              <select required value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
                <option value="">— Select —</option>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            
          </div>

          {/* ── Pricing ── */}
          <div className="border-t border-slate-200 pt-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Pricing</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Price<span className="text-red-500">*</span></label>
                <input required type="number" min={0} step={0.01} placeholder="Price of Item " value={price} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} className={inputCls} />
              </div>
              
            </div>
          </div>

          {msg && <div className={`px-3 py-2 rounded text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>{msg.text}</div>}

          <div className="flex justify-center gap-4 pt-2">
            <button type="submit" disabled={saving} className="w-44 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded text-sm disabled:opacity-60 transition-colors">{saving ? "Saving…" : isEditMode ? "Update" : "Save"}</button>
            <button type="button" onClick={() => router.push("/items/list")} className="w-44 py-2.5 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded text-sm transition-colors">Close</button>
          </div>
        </div>
      </form>
    </PageScaffold>
  );
}
