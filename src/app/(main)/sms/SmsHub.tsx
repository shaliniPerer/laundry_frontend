"use client";

import { useEffect, useState, useCallback } from "react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";
import {
  MessageSquare, Send, Calendar, Cake, RefreshCw,
  CheckCircle, XCircle, Clock, Eye, Play,
  Users, Edit2, Trash2, Plus, RotateCcw, Save, Phone, Gift, X,
  ChevronRight, Zap,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "log" | "customers" | "events" | "templates" | "birthdays";

type SmsRow = {
  pk?: string; phone?: string; message?: string; status?: string;
  createdAt?: string; error?: string; eventType?: string; provider?: string;
};

type Customer = {
  pk: string; name?: string; customerNumber?: string;
  phone?: string; mobile?: string; dob?: string; status?: string;
};

type SmsEvent = {
  pk: string; label: string; date: string;
  templateId: string; templateName?: string; promoCode?: string;
};

type Template = {
  id: string; name: string; body: string; defaultBody?: string;
  category: "realtime" | "scheduled" | "campaign";
  description?: string; shortCodes?: string[];
  isCustomized?: boolean; isCustom?: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  realtime:  { label: "Real-time",  color: "bg-blue-50 text-blue-700 border-blue-200"       },
  scheduled: { label: "Scheduled",  color: "bg-violet-50 text-violet-700 border-violet-200" },
  campaign:  { label: "Campaign",   color: "bg-amber-50 text-amber-700 border-amber-200"    },
};

const ALL_SHORTCODES = [
  "customer_name", "job_id", "status", "delivery_date",
  "amount", "due_date", "last_visit", "offer_details",
  "expiry_date", "promo_code", "business_name",
];

function todayMMDD(): string {
  const d = new Date();
  return String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function dobToMMDD(dob: string): string {
  return dob.length > 5 ? dob.slice(5, 10) : dob;
}

function isBirthdayToday(dob?: string): boolean {
  if (!dob) return false;
  return dobToMMDD(dob) === todayMMDD();
}

function daysUntilBirthday(dob: string): number {
  const mmdd = dobToMMDD(dob);
  const [mm, dd] = mmdd.split("-").map(Number);
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const thisYear = new Date(today.getFullYear(), mm - 1, dd);
  const nextYear = new Date(today.getFullYear() + 1, mm - 1, dd);
  const target = thisYear >= todayMid ? thisYear : nextYear;
  return Math.round((target.getTime() - todayMid.getTime()) / 86400000);
}

function fmtDob(dob: string): string {
  if (!dob) return "—";
  const parts = dob.split("-");
  if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dob;
}

function validateSection(s?: string): Tab | null {
  const valid: Tab[] = ["log", "customers", "events", "templates", "birthdays"];
  return (valid.includes(s as Tab) ? s : null) as Tab | null;
}

// ── Small components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const map: Record<string, string> = {
    sent:         "bg-emerald-50 text-emerald-700 border-emerald-200",
    failed:       "bg-red-50 text-red-700 border-red-200",
    "dev-logged": "bg-amber-50 text-amber-700 border-amber-200",
    queued:       "bg-blue-50 text-blue-700 border-blue-200",
  };
  const Icon = status === "sent" ? CheckCircle : status === "failed" ? XCircle : Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
      <Icon className="w-3 h-3" />{status}
    </span>
  );
}

function ShortCodePill({ code }: { code: string }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-md text-xs font-mono bg-slate-100 text-slate-600 border border-slate-200 cursor-default">
      {"{" + code + "}"}
    </span>
  );
}

function Note({ ok, text }: { ok?: boolean; text: string }) {
  return (
    <p className={`text-sm rounded-lg px-3 py-2 border ${ok
      ? "text-teal-800 bg-teal-50 border-teal-100"
      : "text-red-700 bg-red-50 border-red-200"}`}>{text}</p>
  );
}

// ── Template Preview / Fire Modal ─────────────────────────────────────────────

function TemplateModal({ tpl, mode, onClose }: {
  tpl: Template; mode: "preview" | "fire"; onClose: () => void;
}) {
  const [data, setData]       = useState<Record<string, string>>({});
  const [phone, setPhone]     = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<string | null>(null);

  function livePreview() {
    return tpl.body.replace(/\{(\w+)\}/g, (_, k) => data[k] ? `[${data[k]}]` : `{${k}}`);
  }

  async function fetchPreview() {
    setLoading(true);
    const res = await api<{ preview: string }>("/api/sms/preview", {
      method: "POST", body: JSON.stringify({ templateId: tpl.id, data }),
    });
    setLoading(false);
    if (res.ok && res.data) setPreview(res.data.preview);
  }

  async function fire() {
    if (!phone) { setResult("Phone number required."); return; }
    setLoading(true);
    const res = await api("/api/sms/fire", {
      method: "POST", body: JSON.stringify({ templateId: tpl.id, phone, data }),
    });
    setLoading(false);
    setResult(res.ok ? "✓ Message fired successfully!" : `✗ ${res.error}`);
  }

  const shortCodes = tpl.shortCodes?.filter((c) => c !== "business_name") ?? [];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">{tpl.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{mode === "preview" ? "Fill shortcodes to preview" : "Fire a test message"}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>

        {shortCodes.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {shortCodes.filter((c) => c !== "promo_code").map((code) => (
              <div key={code}>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{code.replace(/_/g, " ")}</label>
                <input value={data[code] ?? ""} onChange={(e) => setData((d) => ({ ...d, [code]: e.target.value }))}
                  placeholder={`{${code}}`}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            ))}
          </div>
        )}

        <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-xs text-slate-700 leading-relaxed border border-slate-100 italic min-h-12">
          {preview ?? livePreview()}
        </div>

        {mode === "fire" && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+94771234567"
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        )}

        {result && <Note ok={result.startsWith("✓")} text={result} />}

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Close</button>
          {mode === "preview" ? (
            <button onClick={fetchPreview} disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-60">
              <Eye className="w-4 h-4" />{loading ? "Loading…" : "Server Preview"}
            </button>
          ) : (
            <button onClick={fire} disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60">
              <Play className="w-4 h-4" />{loading ? "Firing…" : "Fire Now"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Hub ─────────────────────────────────────────────────────────────────

export default function SmsHub({ initialSection }: { initialSection?: string }) {
  const [tab, setTab] = useState<Tab>(validateSection(initialSection) ?? "log");

  // ── Message Log state
  const [rows, setRows]         = useState<SmsRow[]>([]);
  const [msgPhone, setMsgPhone] = useState("");
  const [msgBody, setMsgBody]   = useState("");
  const [msgNote, setMsgNote]   = useState<{ ok: boolean; text: string } | null>(null);
  const [msgSending, setMsgSending] = useState(false);

  // ── Customer state
  const [customers, setCustomers] = useState<Customer[]>([]);

  // ── Events state
  const [events, setEvents]   = useState<SmsEvent[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  // Add-event form
  const [evtLabel, setEvtLabel] = useState("");
  const [evtDate, setEvtDate]   = useState("");
  const [evtTplId, setEvtTplId] = useState("");
  const [evtPromo, setEvtPromo] = useState("");
  const [evtNote, setEvtNote]   = useState<string | null>(null);
  const [evtSaving, setEvtSaving] = useState(false);

  // Inline-edit event
  const [editEvt, setEditEvt]   = useState<SmsEvent | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDate, setEditDate]   = useState("");
  const [editTplId, setEditTplId] = useState("");
  const [editPromo, setEditPromo] = useState("");
  const [editNote, setEditNote]   = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // ── Templates state
  const [filterCat, setFilterCat] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody]   = useState("");
  const [editName, setEditName]   = useState("");
  const [editCat, setEditCat]     = useState<Template["category"]>("campaign");
  const [editDesc, setEditDesc]   = useState("");
  const [tplSaving, setTplSaving] = useState(false);
  const [tplNote, setTplNote]     = useState<string | null>(null);
  const [modal, setModal]         = useState<{ tpl: Template; mode: "preview" | "fire" } | null>(null);

  // New custom template form
  const [showNewTpl, setShowNewTpl]   = useState(false);
  const [newName, setNewName]         = useState("");
  const [newCat, setNewCat]           = useState<Template["category"]>("campaign");
  const [newDesc, setNewDesc]         = useState("");
  const [newBody, setNewBody]         = useState("");
  const [newTplNote, setNewTplNote]   = useState<string | null>(null);
  const [newTplSaving, setNewTplSaving] = useState(false);

  // Birthday send state
  const [bdSending, setBdSending] = useState<string | null>(null);
  const [bdMsg, setBdMsg]         = useState<{ pk: string; ok: boolean; text: string } | null>(null);

  // ── Loaders ───────────────────────────────────────────────────────

  const loadLog = useCallback(async () => {
    const res = await api<{ messages: SmsRow[] }>("/api/sms");
    if (res.ok && res.data?.messages) setRows(res.data.messages);
  }, []);

  const loadCustomers = useCallback(async () => {
    const res = await api<{ customers: Customer[] }>("/api/sms/customers");
    if (res.ok && res.data?.customers) setCustomers(res.data.customers);
  }, []);

  const loadTemplates = useCallback(async () => {
    const res = await api<{ templates: Template[] }>("/api/sms/templates");
    if (res.ok && res.data?.templates) setTemplates(res.data.templates);
  }, []);

  const loadEvents = useCallback(async () => {
    const res = await api<{ events: SmsEvent[] }>("/api/sms/events");
    if (res.ok && res.data?.events) setEvents(res.data.events);
  }, []);

  useEffect(() => {
    loadLog();
    loadTemplates();
    loadEvents();
  }, [loadLog, loadTemplates, loadEvents]);

  useEffect(() => {
    if ((tab === "customers" || tab === "birthdays") && customers.length === 0) loadCustomers();
  }, [tab, customers.length, loadCustomers]);

  // ── Message Log actions ───────────────────────────────────────────

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setMsgNote(null); setMsgSending(true);
    const res = await api("/api/sms", { method: "POST", body: JSON.stringify({ phone: msgPhone, message: msgBody }) });
    setMsgSending(false);
    if (!res.ok) { setMsgNote({ ok: false, text: res.error || "Failed to send" }); return; }
    setMsgNote({ ok: true, text: "Message dispatched." });
    setMsgPhone(""); setMsgBody(""); loadLog();
  }

  // ── Event actions ─────────────────────────────────────────────────

  async function addEvent(e: React.FormEvent) {
    e.preventDefault(); setEvtNote(null); setEvtSaving(true);
    const res = await api("/api/sms/events", {
      method: "POST",
      body: JSON.stringify({ label: evtLabel, date: evtDate, templateId: evtTplId, promoCode: evtPromo }),
    });
    setEvtSaving(false);
    if (!res.ok) { setEvtNote(res.error || "Failed to save"); return; }
    setEvtLabel(""); setEvtDate(""); setEvtTplId(""); setEvtPromo(""); loadEvents();
  }

  function startEditEvent(ev: SmsEvent) {
    setEditEvt(ev); setEditLabel(ev.label); setEditDate(ev.date);
    setEditTplId(ev.templateId); setEditPromo(ev.promoCode ?? ""); setEditNote(null);
  }

  async function saveEditEvent(e: React.FormEvent) {
    e.preventDefault(); if (!editEvt) return;
    setEditNote(null); setEditSaving(true);
    const id = editEvt.pk.replace("SMSEVENT#", "");
    const res = await api(`/api/sms/events/${id}`, {
      method: "PUT",
      body: JSON.stringify({ label: editLabel, date: editDate, templateId: editTplId, promoCode: editPromo }),
    });
    setEditSaving(false);
    if (!res.ok) { setEditNote(res.error || "Failed to update"); return; }
    setEditEvt(null); loadEvents();
  }

  async function deleteEvent(pk: string) {
    if (!confirm("Delete this event?")) return;
    const id = pk.replace("SMSEVENT#", "");
    await api(`/api/sms/events/${id}`, { method: "DELETE" });
    loadEvents();
  }

  // ── Template actions ──────────────────────────────────────────────

  function startEdit(tpl: Template) {
    setEditingId(tpl.id); setEditBody(tpl.body);
    setEditName(tpl.name); setEditCat(tpl.category);
    setEditDesc(tpl.description ?? ""); setTplNote(null);
  }

  async function saveTemplate(tpl: Template) {
    setTplSaving(true);
    const body: Record<string, string> = { body: editBody };
    if (tpl.isCustom) { body.name = editName; body.category = editCat; body.description = editDesc; }
    const res = await api(`/api/sms/templates/${tpl.id}`, { method: "PUT", body: JSON.stringify(body) });
    setTplSaving(false);
    if (!res.ok) { setTplNote(res.error || "Failed to save"); return; }
    setEditingId(null); setTplNote(null); loadTemplates();
  }

  async function resetTemplate(id: string) {
    if (!confirm("Reset to default template body?")) return;
    await api(`/api/sms/templates/${id}`, { method: "DELETE" });
    setEditingId(null); loadTemplates();
  }

  async function deleteCustomTemplate(id: string) {
    if (!confirm("Permanently delete this custom template?")) return;
    const res = await api(`/api/sms/templates/${id}`, { method: "DELETE" });
    if (!res.ok) { setTplNote(res.error || "Failed to delete"); return; }
    setEditingId(null); loadTemplates();
  }

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault(); setNewTplNote(null); setNewTplSaving(true);
    const res = await api("/api/sms/templates", {
      method: "POST",
      body: JSON.stringify({ name: newName, category: newCat, description: newDesc, body: newBody }),
    });
    setNewTplSaving(false);
    if (!res.ok) { setNewTplNote(res.error || "Failed to create"); return; }
    setNewName(""); setNewCat("campaign"); setNewDesc(""); setNewBody("");
    setShowNewTpl(false); loadTemplates();
  }

  function insertShortcode(code: string, setter: React.Dispatch<React.SetStateAction<string>>) {
    setter((prev) => prev + `{${code}}`);
  }

  // ── Birthday send ─────────────────────────────────────────────────

  async function sendBirthdaySms(c: Customer) {
    const phone = c.phone || c.mobile;
    if (!phone) return;
    setBdSending(c.pk); setBdMsg(null);
    const res = await api("/api/sms", {
      method: "POST",
      body: JSON.stringify({ phone, message: `Happy Birthday ${c.name ?? ""}! 🎂 Warm wishes from us.` }),
    });
    setBdSending(null);
    setBdMsg({ pk: c.pk, ok: res.ok, text: res.ok ? "Birthday SMS sent!" : res.error || "Failed" });
  }

  // ── Derived ───────────────────────────────────────────────────────

  const sentCount      = rows.filter((r) => r.status === "sent").length;
  const failedCount    = rows.filter((r) => r.status === "failed").length;
  const devCount       = rows.filter((r) => r.status === "dev-logged").length;
  const todayBirthdays = customers.filter((c) => isBirthdayToday(c.dob)).length;

  const filteredTemplates = filterCat === "all"
    ? templates
    : templates.filter((t) => t.category === filterCat);

  const tplCountBy = (cat: string) => templates.filter((t) => t.category === cat).length;

  // Customers with dob, sorted by days until birthday
  const birthdayCustomers = customers
    .filter((c) => c.dob)
    .sort((a, b) => daysUntilBirthday(a.dob!) - daysUntilBirthday(b.dob!));



  return (
    <PageScaffold title="SMS Automation" subtitle="Manage events, templates, customers and message history">
      {modal && <TemplateModal tpl={modal.tpl} mode={modal.mode} onClose={() => setModal(null)} />}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total logged", value: rows.length,  color: "text-slate-700"    },
          { label: "Sent",         value: sentCount,    color: "text-emerald-600"  },
          { label: "Failed",       value: failedCount,  color: "text-red-600"      },
          { label: "Dev logged",   value: devCount,     color: "text-amber-600"    },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 card-shadow">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

     

      {/* ════════════════════════════════════════════════════════════
          TAB: Message Log
      ════════════════════════════════════════════════════════════ */}
      {tab === "log" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={send} className="bg-white rounded-2xl border border-slate-200 card-shadow p-6 space-y-4 self-start">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <MessageSquare className="w-5 h-5 text-teal-600" />Compose Manual Message
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone</label>
              <input required value={msgPhone} onChange={(e) => setMsgPhone(e.target.value)} placeholder="+94771234567"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Message</label>
              <textarea required value={msgBody} onChange={(e) => setMsgBody(e.target.value)} rows={4}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <button type="submit" disabled={msgSending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold text-sm">
              <Send className="w-4 h-4" />{msgSending ? "Sending…" : "Send Message"}
            </button>
            {msgNote && <Note ok={msgNote.ok} text={msgNote.text} />}
          </form>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden card-shadow">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="font-semibold text-slate-800 text-sm">Recent Messages</span>
              <button onClick={loadLog} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"><RefreshCw className="w-4 h-4" /></button>
            </div>
            {rows.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />No messages yet.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {rows.map((r, i) => (
                  <li key={r.pk || i} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">{r.phone}</span>
                        {r.eventType && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{r.eventType}</span>}
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-slate-700 leading-snug">{r.message}</div>
                    {r.error && <div className="text-xs text-red-500 mt-1">{r.error}</div>}
                    <div className="flex items-center gap-2 mt-1">
                      {r.createdAt && <span className="text-xs text-slate-400">{(() => { const d = new Date(r.createdAt); const dd = String(d.getDate()).padStart(2,"0"); const mm = String(d.getMonth()+1).padStart(2,"0"); const h = d.getHours(); const hh = String(h % 12 || 12).padStart(2,"0"); const min = String(d.getMinutes()).padStart(2,"0"); const ampm = h < 12 ? "AM" : "PM"; return `${dd}-${mm}-${d.getFullYear()} ${hh}:${min} ${ampm}`; })()}</span>}
                      {r.provider  && <span className="text-xs text-slate-400">via {r.provider}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: Customer Sync
      ════════════════════════════════════════════════════════════ */}
      {tab === "customers" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Total customers",   value: customers.length,                                    color: "text-slate-700",  icon: <Users className="w-4 h-4" /> },
              { label: "Reachable (phone)", value: customers.filter((c) => c.phone || c.mobile).length, color: "text-teal-600",   icon: <Phone className="w-4 h-4" /> },
              { label: "Birthdays today",   value: todayBirthdays,                                      color: "text-pink-600",   icon: <Gift  className="w-4 h-4" /> },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 card-shadow flex items-center gap-3">
                <div className={s.color}>{s.icon}</div>
                <div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 card-shadow overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                <span className="font-semibold text-slate-800 text-sm">SMS Recipients</span>
                <span className="text-xs text-slate-400">— customers with a phone number</span>
              </div>
              <button onClick={loadCustomers} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"><RefreshCw className="w-4 h-4" /></button>
            </div>
            {customers.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />No customers with phone numbers.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase">
                      <th className="px-5 py-3 text-left">#</th>
                      <th className="px-5 py-3 text-left">Name</th>
                      <th className="px-5 py-3 text-left">Phone</th>
                      <th className="px-5 py-3 text-left">Date of Birth</th>
                      <th className="px-5 py-3 text-left">Birthday</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map((c) => (
                      <tr key={c.pk} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-xs text-slate-400">{c.customerNumber ?? "—"}</td>
                        <td className="px-5 py-3 font-medium text-slate-800">{c.name ?? "—"}</td>
                        <td className="px-5 py-3 font-mono text-slate-600 text-xs">{c.phone || c.mobile || "—"}</td>
                        <td className="px-5 py-3 text-slate-600 text-xs">{c.dob ? fmtDob(c.dob) : <span className="text-slate-300">not set</span>}</td>
                        <td className="px-5 py-3">
                          {isBirthdayToday(c.dob)
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-pink-50 text-pink-700 border border-pink-200"><Cake className="w-3 h-3" />Today!</span>
                            : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: Event Manager
      ════════════════════════════════════════════════════════════ */}
      {tab === "events" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 card-shadow p-6">
            <div className="flex items-center gap-2 font-semibold text-slate-800 mb-4">
              <Plus className="w-5 h-5 text-teal-600" />Add New Event
            </div>
            <form onSubmit={addEvent} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Event Label</label>
                <input required value={evtLabel} onChange={(e) => setEvtLabel(e.target.value)} placeholder="e.g. New Year Promo"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date (MM-DD)</label>
                <input required value={evtDate} onChange={(e) => setEvtDate(e.target.value)} placeholder="01-01" pattern="\d{2}-\d{2}" maxLength={5}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Template</label>
                <select required value={evtTplId} onChange={(e) => setEvtTplId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                  <option value="">— select —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.isCustom ? " ★" : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Promo Code (optional)</label>
                <div className="flex gap-2">
                  <input value={evtPromo} onChange={(e) => setEvtPromo(e.target.value)} placeholder="PROMO20"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  <button type="submit" disabled={evtSaving}
                    className="shrink-0 flex items-center gap-1 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold text-sm">
                    <Plus className="w-4 h-4" />{evtSaving ? "…" : "Add"}
                  </button>
                </div>
              </div>
            </form>
            {evtNote && <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{evtNote}</p>}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 card-shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span className="font-semibold text-slate-800">All Events</span>
                <span className="text-xs text-slate-400">{events.length} event{events.length !== 1 ? "s" : ""}</span>
              </div>
              <button onClick={loadEvents} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"><RefreshCw className="w-4 h-4" /></button>
            </div>

            {events.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />No events yet. Create one above.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {events.map((ev) => {
                  const isEditingThis = editEvt?.pk === ev.pk;
                  return (
                    <div key={ev.pk} className="px-5 py-3">
                      {isEditingThis ? (
                        <form onSubmit={saveEditEvent} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Label</label>
                            <input required value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                              className="w-full rounded-lg border border-teal-400 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Date (MM-DD)</label>
                            <input required value={editDate} onChange={(e) => setEditDate(e.target.value)} pattern="\d{2}-\d{2}" maxLength={5}
                              className="w-full rounded-lg border border-teal-400 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Template</label>
                            <select required value={editTplId} onChange={(e) => setEditTplId(e.target.value)}
                              className="w-full rounded-lg border border-teal-400 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                              <option value="">— select —</option>
                              {templates.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}{t.isCustom ? " ★" : ""}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Promo Code</label>
                            <div className="flex gap-2">
                              <input value={editPromo} onChange={(e) => setEditPromo(e.target.value)} placeholder="optional"
                                className="w-full rounded-lg border border-teal-400 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                              <button type="submit" disabled={editSaving}
                                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium disabled:opacity-60">
                                <Save className="w-3.5 h-3.5" />{editSaving ? "…" : "Save"}
                              </button>
                              <button type="button" onClick={() => setEditEvt(null)}
                                className="shrink-0 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {editNote && <p className="col-span-full text-xs text-red-600">{editNote}</p>}
                        </form>
                      ) : (
                        <div className="flex items-center gap-4">
                          <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 min-w-14 text-center shrink-0">
                            {ev.date}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-700">{ev.label}</div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              Template: <span className="font-medium text-slate-600">{ev.templateName ?? ev.templateId}</span>
                              {ev.promoCode && <span className="ml-2 text-teal-600 font-mono">{ev.promoCode}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => startEditEvent(ev)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-teal-600" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteEvent(ev.pk)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-white rounded-2xl border border-slate-200 card-shadow overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Cake className="w-4 h-4 text-pink-500" />
                <span className="font-semibold text-slate-800">Birthday Engine</span>
                <span className="ml-auto text-xs text-slate-400">Daily at 09:00</span>
              </div>
              <div className="px-5 py-4 text-sm text-slate-600 leading-relaxed">
                Customers whose <code className="bg-slate-100 px-1 rounded">dob</code> matches today&apos;s{" "}
                <code className="bg-slate-100 px-1 rounded">MM-DD</code> automatically receive the{" "}
                <strong>BIRTHDAY</strong> template. Store dates as <code className="bg-slate-100 px-1 rounded">YYYY-MM-DD</code>.
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 card-shadow overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-teal-600" />
                <span className="font-semibold text-slate-800">Job Status Triggers</span>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  ["Placed", "JOB_PLACED"], ["Ready", "JOB_READY"], ["Done", "JOB_COMPLETED"],
                  ["Cancelled", "JOB_CANCELLED"], ["Delayed", "JOB_DELAYED"],
                ].map(([s, e]) => (
                  <div key={s} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full min-w-20 text-center">{s}</span>
                    <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                    <span className="text-xs font-mono text-slate-500">{e}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: Templates
      ════════════════════════════════════════════════════════════ */}
      {tab === "templates" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            {["all", "realtime", "scheduled", "campaign"].map((cat) => (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors capitalize ${
                  filterCat === cat ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}>
                {cat === "all" ? `All (${templates.length})` : `${cat} (${tplCountBy(cat)})`}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={loadTemplates} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"><RefreshCw className="w-4 h-4" /></button>
              <button onClick={() => { setShowNewTpl((v) => !v); setNewTplNote(null); }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold">
                <Plus className="w-4 h-4" />{showNewTpl ? "Cancel" : "New Template"}
              </button>
            </div>
          </div>

          {tplNote && <Note ok={false} text={tplNote} />}

          {showNewTpl && (
            <form onSubmit={createTemplate} className="bg-teal-50 border border-teal-200 rounded-2xl p-6 space-y-4">
              <div className="font-semibold text-teal-800 flex items-center gap-2">
                <Plus className="w-4 h-4" />Create New Custom Template
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Template Name</label>
                  <input required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Ramadan Greetings"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Category</label>
                  <select value={newCat} onChange={(e) => setNewCat(e.target.value as Template["category"])}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                    <option value="realtime">Real-time</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="campaign">Campaign</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description (optional)</label>
                <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="When does this fire?"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Message Body</label>
                  <div className="flex flex-wrap gap-1">
                    {ALL_SHORTCODES.map((c) => (
                      <button key={c} type="button" onClick={() => insertShortcode(c, setNewBody)}
                        className="px-1.5 py-0.5 rounded text-xs font-mono bg-white text-teal-700 border border-teal-200 hover:bg-teal-100">
                        {"{" + c + "}"}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea required value={newBody} onChange={(e) => setNewBody(e.target.value)} rows={4}
                  placeholder="Hi {customer_name}, ..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              {newTplNote && <Note ok={false} text={newTplNote} />}
              <div className="flex gap-2">
                <button type="submit" disabled={newTplSaving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold text-sm">
                  <Save className="w-4 h-4" />{newTplSaving ? "Creating…" : "Create Template"}
                </button>
                <button type="button" onClick={() => setShowNewTpl(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-sm">Cancel</button>
              </div>
            </form>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredTemplates.map((tpl) => {
              const cat = CATEGORY_META[tpl.category] ?? CATEGORY_META.realtime;
              const isEditing = editingId === tpl.id;
              return (
                <div key={tpl.id} className="bg-white rounded-2xl border border-slate-200 p-5 card-shadow flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isEditing ? (
                          tpl.isCustom ? (
                            <input value={editName} onChange={(e) => setEditName(e.target.value)}
                              className="rounded-lg border border-teal-400 px-2 py-1 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 w-full" />
                          ) : (
                            <span className="font-semibold text-slate-800 text-sm">{tpl.name}</span>
                          )
                        ) : (
                          <span className="font-semibold text-slate-800 text-sm">{tpl.name}</span>
                        )}
                        {tpl.isCustom && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 shrink-0">custom</span>}
                        {tpl.isCustomized && !tpl.isCustom && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 shrink-0">edited</span>}
                      </div>
                      {isEditing && tpl.isCustom ? (
                        <div className="mt-1.5 flex gap-2">
                          <select value={editCat} onChange={(e) => setEditCat(e.target.value as Template["category"])}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none bg-white">
                            <option value="realtime">Real-time</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="campaign">Campaign</option>
                          </select>
                        </div>
                      ) : (
                        tpl.description && <div className="text-xs text-slate-500 mt-0.5">{tpl.description}</div>
                      )}
                    </div>
                    <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${isEditing && tpl.isCustom ? CATEGORY_META[editCat]?.color : cat.color}`}>
                      {isEditing && tpl.isCustom ? CATEGORY_META[editCat]?.label : cat.label}
                    </span>
                  </div>

                  {isEditing && tpl.isCustom && (
                    <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description (optional)"
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  )}

                  {isEditing ? (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1">
                        {ALL_SHORTCODES.map((c) => (
                          <button key={c} type="button" onClick={() => insertShortcode(c, setEditBody)}
                            className="px-1.5 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-600 border border-slate-200 hover:bg-teal-50 hover:border-teal-300">
                            {"{" + c + "}"}
                          </button>
                        ))}
                      </div>
                      <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={5}
                        className="w-full rounded-xl border border-teal-400 px-3 py-2.5 text-xs text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-xs text-slate-700 leading-relaxed border border-slate-100 italic">
                      {tpl.body}
                    </div>
                  )}

                  {!isEditing && tpl.shortCodes && tpl.shortCodes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tpl.shortCodes.map((c) => <ShortCodePill key={c} code={c} />)}
                    </div>
                  )}

                  <div className="flex gap-2 mt-auto pt-1 flex-wrap">
                    {isEditing ? (
                      <>
                        <button onClick={() => saveTemplate(tpl)} disabled={tplSaving}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60">
                          <Save className="w-3.5 h-3.5" />{tplSaving ? "Saving…" : "Save"}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200">
                          Cancel
                        </button>
                        {tpl.isCustom ? (
                          <button onClick={() => deleteCustomTemplate(tpl.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 ml-auto">
                            <Trash2 className="w-3.5 h-3.5" />Delete
                          </button>
                        ) : tpl.isCustomized ? (
                          <button onClick={() => resetTemplate(tpl.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 ml-auto">
                            <RotateCcw className="w-3.5 h-3.5" />Reset to Default
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(tpl)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200">
                          <Edit2 className="w-3.5 h-3.5" />Edit
                        </button>
                        <button onClick={() => setModal({ tpl, mode: "preview" })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200">
                          <Eye className="w-3.5 h-3.5" />Preview
                        </button>
                        <button onClick={() => setModal({ tpl, mode: "fire" })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 ml-auto">
                          <Play className="w-3.5 h-3.5" />Test
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: Customer Birthday
      ════════════════════════════════════════════════════════════ */}
      {tab === "birthdays" && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "With Birthday Set",  value: birthdayCustomers.length, color: "text-slate-700",  icon: <Cake className="w-4 h-4" /> },
              { label: "Birthdays Today",    value: todayBirthdays,           color: "text-pink-600",   icon: <Gift className="w-4 h-4" /> },
              { label: "This Month",         value: birthdayCustomers.filter((c) => { const m = dobToMMDD(c.dob!).split("-")[0]; return m === String(new Date().getMonth() + 1).padStart(2, "0"); }).length, color: "text-teal-600", icon: <Calendar className="w-4 h-4" /> },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 card-shadow flex items-center gap-3">
                <div className={s.color}>{s.icon}</div>
                <div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 card-shadow overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cake className="w-4 h-4 text-pink-500" />
                <span className="font-semibold text-slate-800 text-sm">Customer Birthdays</span>
                <span className="text-xs text-slate-400">— sorted by upcoming birthday</span>
              </div>
              <button onClick={loadCustomers} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"><RefreshCw className="w-4 h-4" /></button>
            </div>

            {birthdayCustomers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                <Cake className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No customers with birthday set. Add a birthday when creating or editing a customer.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase">
                      <th className="px-5 py-3 text-left">#</th>
                      <th className="px-5 py-3 text-left">Name</th>
                      <th className="px-5 py-3 text-left">Phone</th>
                      <th className="px-5 py-3 text-left">Birthday</th>
                      <th className="px-5 py-3 text-left">Days Until</th>
                      <th className="px-5 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {birthdayCustomers.map((c, i) => {
                      const isToday = isBirthdayToday(c.dob);
                      const days = daysUntilBirthday(c.dob!);
                      const phone = c.phone || c.mobile;
                      return (
                        <tr key={c.pk} className={`hover:bg-slate-50 ${isToday ? "bg-pink-50/60" : ""}`}>
                          <td className="px-5 py-3 text-xs text-slate-400">{i + 1}</td>
                          <td className="px-5 py-3 font-medium text-slate-800 flex items-center gap-2">
                            {isToday && <Cake className="w-3.5 h-3.5 text-pink-500 shrink-0" />}
                            {c.name ?? "—"}
                          </td>
                          <td className="px-5 py-3 font-mono text-slate-600 text-xs">{phone ?? <span className="text-slate-300">no phone</span>}</td>
                          <td className="px-5 py-3 text-slate-600 text-xs">{fmtDob(c.dob!)}</td>
                          <td className="px-5 py-3">
                            {isToday
                              ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-pink-100 text-pink-700 border border-pink-200">🎂 Today!</span>
                              : <span className="text-slate-600 text-xs">{days} day{days !== 1 ? "s" : ""}</span>
                            }
                          </td>
                          <td className="px-5 py-3">
                            {phone ? (
                              <button
                                onClick={() => sendBirthdaySms(c)}
                                disabled={bdSending === c.pk}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-pink-500 hover:bg-pink-600 text-white disabled:opacity-60 transition-colors"
                              >
                                <Send className="w-3 h-3" />
                                {bdSending === c.pk ? "Sending…" : "Send Wishes"}
                              </button>
                            ) : (
                              <span className="text-slate-300 text-xs">no phone</span>
                            )}
                            {bdMsg?.pk === c.pk && (
                              <span className={`ml-2 text-xs ${bdMsg.ok ? "text-teal-600" : "text-red-500"}`}>{bdMsg.text}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </PageScaffold>
  );
}
