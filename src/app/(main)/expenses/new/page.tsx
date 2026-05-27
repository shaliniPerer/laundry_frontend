"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";
import { DateInput } from "@/components/DateInput";

type Category = { pk: string; name: string };
type AttachmentDraft = { fileName: string; mimeType: string; size: number; dataUrl: string };

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function NewExpensePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [date, setDate] = useState(todayISO());
  const [referenceNo, setReferenceNo] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [expenseFor, setExpenseFor] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await api<{ categories: Category[] }>("/api/expenses/categories/list");
      if (res.ok && res.data?.categories) setCategories(res.data.categories.filter((c) => c.pk?.startsWith("EXPENSE_CAT#")));
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!expenseFor.trim()) { setMsg({ type: "err", text: "Expense For is required" }); return; }
    if (!amount) { setMsg({ type: "err", text: "Amount is required" }); return; }
    setMsg(null);
    setSaving(true);
    const selectedCat = categories.find((c) => c.pk === categoryId);
    const res = await api("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        date, referenceNo, categoryId: categoryId || undefined,
        categoryName: selectedCat?.name,
        note, expenseFor, amount: Number(amount), attachment: attachment || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) { setMsg({ type: "err", text: res.error || "Failed to save expense" }); return; }
    setMsg({ type: "ok", text: "Expense saved successfully." });
    setReferenceNo(""); setCategoryId(""); setNote(""); setExpenseFor(""); setAmount(""); setAttachment(null);
  }

  function handleAttachment(file?: File) {
    setMsg(null);
    if (!file) {
      setAttachment(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMsg({ type: "err", text: "Attachment must be 5 MB or smaller." });
      setAttachment(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setAttachment({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: reader.result,
      });
    };
    reader.onerror = () => setMsg({ type: "err", text: "Could not read selected file." });
    reader.readAsDataURL(file);
  }

  const inputCls = "w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-400";
  const labelCls = "w-28 text-right pr-4 text-sm text-slate-600 shrink-0";

  return (
    <PageScaffold title="Expense" subtitle="Add/Update Expense">
      <div className="bg-white border border-slate-200 rounded-sm p-6">
        <p className="text-sm font-semibold text-slate-700 mb-5">Please Enter Valid Data</p>
        <form onSubmit={submit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 max-w-4xl">
            {/* Left column */}
            <div className="flex items-center">
              <label className={`${labelCls}`}>Expense Date<span className="text-red-500">*</span></label>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex items-center border border-slate-300 rounded overflow-hidden flex-1">
                  <span className="px-2.5 py-1.5 bg-slate-100 border-r border-slate-300">
                    <Calendar className="w-4 h-4 text-slate-500" />
                  </span>
                  <DateInput required value={date} onChange={setDate} wrapperClassName="flex-1" className="w-full px-3 py-1.5 text-sm outline-none bg-slate-50 text-slate-500" />
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="flex items-center">
              <label className={`${labelCls}`}>Reference No.</label>
              <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} className={`flex-1 ${inputCls}`} />
            </div>

            <div className="flex items-center">
              <label className={`${labelCls}`}>Category<span className="text-red-500">*</span></label>
              <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`flex-1 ${inputCls} bg-white`}>
                <option value="">-Select-</option>
                {categories.map((c) => <option key={c.pk} value={c.pk}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex items-start">
              <label className={`${labelCls} pt-1.5`}>Note</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={`flex-1 ${inputCls} resize-y`} />
            </div>

            <div className="flex items-center">
              <label className={`${labelCls}`}>Expense for<span className="text-red-500">*</span></label>
              <input required value={expenseFor} onChange={(e) => setExpenseFor(e.target.value)} className={`flex-1 ${inputCls}`} />
            </div>

            <div className="flex items-center">
              <label className={`${labelCls}`}>Amount<span className="text-red-500">*</span></label>
              <input required type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} className={`flex-1 ${inputCls}`} />
            </div>

            <div className="flex items-center md:col-span-2">
              <label className={`${labelCls}`}>Attachment</label>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={(e) => handleAttachment(e.target.files?.[0])}
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-slate-700"
                />
                {attachment && (
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span>{attachment.fileName} ({(attachment.size / 1024).toFixed(1)} KB)</span>
                    <button type="button" onClick={() => setAttachment(null)} className="text-red-600 hover:text-red-700">Remove</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {msg && <div className={`mt-4 px-3 py-2 rounded text-sm max-w-xl ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>{msg.text}</div>}

          <div className="flex justify-center gap-4 pt-6">
            <button type="submit" disabled={saving} className="w-44 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded text-sm disabled:opacity-60 transition-colors">{saving ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => router.push("/expenses/list")} className="w-44 py-2.5 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded text-sm transition-colors">Close</button>
          </div>
        </form>
      </div>
    </PageScaffold>
  );
}
