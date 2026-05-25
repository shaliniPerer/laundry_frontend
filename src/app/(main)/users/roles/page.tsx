"use client";

import { useEffect, useState, useMemo } from "react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";
import {
  Shield, LayoutDashboard, Users, ShoppingCart, UserCheck, Package,
  Tag, Bookmark, Receipt, BarChart2, MessageSquare,
  Settings, ChevronDown, ChevronUp, Search, Save, Plus,
  Check, Loader2, Trash2, X, LucideIcon,
} from "lucide-react";

// ─── Permission definitions ────────────────────────────────────────────────
type Module = { id: string; label: string; icon: LucideIcon; actions: string[]; color: string };

const MODULES: Module[] = [
  {
    id: "dashboard", label: "Dashboard", icon: LayoutDashboard,
    color: "text-blue-600 bg-blue-50",
    actions: ["view"],
  },
  {
    id: "sales", label: "Sales / POS", icon: ShoppingCart,
    color: "text-emerald-600 bg-emerald-50",
    actions: ["view", "add", "edit", "delete", "print", "export", "holds", "returns"],
  },
  {
    id: "customers", label: "Customers", icon: UserCheck,
    color: "text-cyan-600 bg-cyan-50",
    actions: ["view", "add", "edit", "delete", "import", "export"],
  },
  {
    id: "items", label: "Items & Services", icon: Package,
    color: "text-amber-600 bg-amber-50",
    actions: ["view", "add", "edit", "delete", "import", "export", "print-labels"],
  },
  {
    id: "item-categories", label: "Services (Categories)", icon: Tag,
    color: "text-pink-600 bg-pink-50",
    actions: ["view", "add", "edit", "delete"],
  },
  {
    id: "item-brands", label: "Laundry Types (Brands)", icon: Bookmark,
    color: "text-rose-600 bg-rose-50",
    actions: ["view", "add", "edit", "delete"],
  },
  {
    id: "expenses", label: "Expenses", icon: Receipt,
    color: "text-red-600 bg-red-50",
    actions: ["view", "add", "edit", "delete", "export"],
  },
  {
    id: "expense-categories", label: "Expense Categories", icon: Tag,
    color: "text-orange-600 bg-orange-50",
    actions: ["view", "add", "edit", "delete"],
  },
  {
    id: "reports", label: "Reports", icon: BarChart2,
    color: "text-sky-600 bg-sky-50",
    actions: [
      "item-sales", "item-purchase", "sales", "sales-return",
      "sales-payments", "expense",
    ],
  },
  {
    id: "sms", label: "SMS", icon: MessageSquare,
    color: "text-lime-600 bg-lime-50",
    actions: ["view", "send", "manage"],
  },
  {
    id: "users", label: "Users", icon: Users,
    color: "text-violet-600 bg-violet-50",
    actions: ["view", "add", "edit", "delete"],
  },
  {
    id: "roles", label: "Roles & Permissions", icon: Shield,
    color: "text-indigo-600 bg-indigo-50",
    actions: ["view", "add", "edit", "delete", "manage"],
  },
  {
    id: "settings", label: "Settings / Company Profile", icon: Settings,
    color: "text-slate-600 bg-slate-100",
    actions: ["view", "edit"],
  },
];

const ACTION_LABEL: Record<string, string> = {
  // Common CRUD
  view: "View", add: "Add", edit: "Edit", delete: "Delete",
  import: "Import", export: "Export", print: "Print",
  manage: "Manage", send: "Send", approve: "Approve",
  // Sales-specific
  holds: "Hold Orders", returns: "Sales Returns",
  // Items-specific
  "print-labels": "Print Labels",
  // Reports — each listed individually
  "item-sales": "Item Sales", "item-purchase": "Item Purchase",
  sales: "Sales", "sales-return": "Sales Return",
  "sales-payments": "Sales Payments", expense: "Expense Report",
  "profit-loss": "Profit & Loss", stock: "Stock",
  purchase: "Purchase", "purchase-payments": "Purchase Payments",
  "purchase-return": "Purchase Return", "expired-items": "Expired Items",
  other: "Other",
};

function permKey(mod: string, action: string) { return `${mod}:${action}`; }

// ─── Subcomponents ─────────────────────────────────────────────────────────
function PermChip({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 select-none ${
        checked
          ? "bg-amber-50 border-amber-300 text-amber-700 shadow-sm"
          : "bg-white border-slate-200 text-slate-500 hover:border-amber-200 hover:text-amber-600 hover:bg-amber-50/50"
      }`}
    >
      <span className={`flex-shrink-0 w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${
        checked ? "bg-amber-500" : "border border-slate-300 bg-white group-hover:border-amber-300"
      }`}>
        {checked && <Check className="w-2 h-2 text-white" strokeWidth={3.5} />}
      </span>
      {label}
    </button>
  );
}

function FullAccessSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="inline-flex items-center gap-2 group select-none"
      title={checked ? "Revoke full access" : "Grant full access"}
    >
      <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${checked ? "bg-amber-500" : "bg-slate-200 group-hover:bg-slate-300"}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${checked ? "left-[18px]" : "left-0.5"}`} />
      </div>
      <span className={`text-xs font-semibold transition-colors ${checked ? "text-amber-600" : "text-slate-400 group-hover:text-slate-500"}`}>
        Full Access
      </span>
    </button>
  );
}

function GlobalCheckbox({ checked, indeterminate, onChange, label }: {
  checked: boolean; indeterminate?: boolean; onChange: () => void; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${
        checked || indeterminate
          ? "bg-amber-50 border-amber-300 text-amber-700"
          : "bg-white border-slate-200 text-slate-600 hover:border-amber-200 hover:bg-amber-50/50"
      }`}
    >
      <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
        checked ? "bg-amber-500 border-amber-500" : indeterminate ? "bg-amber-200 border-amber-300" : "border-slate-300"
      }`}>
        {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />}
        {!checked && indeterminate && <div className="w-2 h-0.5 bg-amber-600 rounded" />}
      </span>
      {label}
    </button>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────
type Role = { pk?: string; name?: string; permissions?: string[] };

// ─── Page ──────────────────────────────────────────────────────────────────
export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [creatingRole, setCreatingRole] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showNewRole, setShowNewRole] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadRoles() {
    const res = await api<{ roles: Role[] }>("/api/admin/roles");
    if (res.ok && res.data?.roles) { setRoles(res.data.roles); return res.data.roles; }
    return [];
  }

  useEffect(() => {
    loadRoles().then((r) => { if (r.length > 0) setSelectedRoleId(r[0].pk ?? ""); });
  }, []);

  useEffect(() => {
    const role = roles.find((r) => r.pk === selectedRoleId);
    setPermissions(new Set(role?.permissions ?? []));
    setSaveMsg(null);
  }, [selectedRoleId, roles]);

  function toggle(key: string) {
    setPermissions((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  }

  function toggleModule(modId: string, actions: string[]) {
    const keys = actions.map((a) => permKey(modId, a));
    const allOn = keys.every((k) => permissions.has(k));
    setPermissions((prev) => { const n = new Set(prev); if (allOn) keys.forEach((k) => n.delete(k)); else keys.forEach((k) => n.add(k)); return n; });
  }

  function toggleAll() {
    const allKeys = MODULES.flatMap((m) => m.actions.map((a) => permKey(m.id, a)));
    const allOn = allKeys.every((k) => permissions.has(k));
    setPermissions(allOn ? new Set() : new Set(allKeys));
  }

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function save() {
    if (!selectedRoleId) return;
    setSaving(true); setSaveMsg(null);
    const id = selectedRoleId.replace("ROLE#", "");
    const res = await api(`/api/admin/roles/${id}`, { method: "PATCH", body: JSON.stringify({ permissions: Array.from(permissions) }) });
    setSaving(false);
    if (res.ok) {
      setRoles((prev) => prev.map((r) => r.pk === selectedRoleId ? { ...r, permissions: Array.from(permissions) } : r));
      setSaveMsg({ type: "ok", text: "Permissions saved successfully." });
      setTimeout(() => setSaveMsg(null), 3000);
    } else {
      setSaveMsg({ type: "err", text: res.error ?? "Failed to save." });
    }
  }

  async function createRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setCreatingRole(true); setCreateMsg(null);
    const res = await api<{ pk: string }>("/api/admin/roles", { method: "POST", body: JSON.stringify({ name: newRoleName.trim(), permissions: [] }) });
    setCreatingRole(false);
    if (res.ok) {
      setCreateMsg({ type: "ok", text: "Role created." });
      setNewRoleName("");
      const updated = await loadRoles();
      const last = updated[updated.length - 1];
      if (last?.pk) setSelectedRoleId(last.pk);
      setTimeout(() => { setCreateMsg(null); setShowNewRole(false); }, 1500);
    } else {
      setCreateMsg({ type: "err", text: res.error ?? "Failed to create role." });
    }
  }

  async function deleteRole() {
    if (!selectedRoleId || !confirm(`Delete role "${selectedRole?.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await api(`/api/admin/roles/${selectedRoleId.replace("ROLE#", "")}`, { method: "DELETE" });
    setDeleting(false);
    const updated = await loadRoles();
    setSelectedRoleId(updated[0]?.pk ?? "");
  }

  // Computed
  const allKeys = MODULES.flatMap((m) => m.actions.map((a) => permKey(m.id, a)));
  const checkedTotal = allKeys.filter((k) => permissions.has(k)).length;
  const allChecked = checkedTotal === allKeys.length;
  const someChecked = checkedTotal > 0 && !allChecked;
  const selectedRole = roles.find((r) => r.pk === selectedRoleId);

  const filteredModules = useMemo(() => {
    if (!search.trim()) return MODULES;
    const q = search.toLowerCase();
    return MODULES.filter((m) => m.label.toLowerCase().includes(q) || m.actions.some((a) => ACTION_LABEL[a]?.toLowerCase().includes(q)));
  }, [search]);

  return (
    <PageScaffold title="Role & Permission Management" subtitle="Configure role-based access control for your team">
      <div className="space-y-5 max-w-5xl">

        {/* ── Role Selector Card ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Role Configuration</h2>
              <p className="text-xs text-slate-500">Select a role to view and edit its permissions</p>
            </div>
          </div>

          <div className="px-6 py-4 flex flex-wrap items-end gap-4">
            {/* Role selector */}
            <div className="flex-1 min-w-52">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Active Role</label>
              <div className="relative">
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm font-semibold text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                >
                  <option value="">— Select a role —</option>
                  {roles.map((r) => (
                    <option key={r.pk} value={r.pk}>{r.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Permission count */}
            {selectedRole && (
              <div className="flex flex-col items-center px-5 py-2 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-xl font-black text-amber-600">{checkedTotal}</span>
                <span className="text-xs text-amber-500 font-medium">/ {allKeys.length} permissions</span>
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => { setShowNewRole((v) => !v); setCreateMsg(null); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 text-white hover:bg-slate-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> New Role
              </button>
              {selectedRoleId && (
                <button
                  type="button"
                  onClick={deleteRole}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* New role form */}
          {showNewRole && (
            <div className="px-6 pb-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-amber-700">Create New Role</span>
                  <button type="button" onClick={() => { setShowNewRole(false); setCreateMsg(null); }}>
                    <X className="w-4 h-4 text-amber-500 hover:text-amber-700" />
                  </button>
                </div>
                <form onSubmit={createRole} className="flex items-center gap-3">
                  <input
                    required
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="e.g. Manager, Cashier, Staff…"
                    className="flex-1 rounded-xl border border-amber-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  />
                  <button
                    type="submit"
                    disabled={creatingRole || !newRoleName.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
                  >
                    {creatingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Create
                  </button>
                </form>
                {createMsg && (
                  <p className={`mt-2 text-xs font-medium ${createMsg.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
                    {createMsg.text}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Permission Matrix ── */}
        {selectedRoleId && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Sticky toolbar */}
            <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-6 py-3 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-48 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search modules or actions…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white transition-all"
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <GlobalCheckbox
                checked={allChecked}
                indeterminate={someChecked}
                onChange={toggleAll}
                label="Select All Permissions"
              />

              <button
                type="button"
                onClick={() => setCollapsed(collapsed.size > 0 ? new Set() : new Set(MODULES.map((m) => m.id)))}
                className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
              >
                {collapsed.size > 0 ? "Expand All" : "Collapse All"}
              </button>
            </div>

            {/* Module rows */}
            <div>
              {filteredModules.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-sm">No modules match your search.</div>
              )}
              {filteredModules.map((mod, idx) => {
                const modKeys = mod.actions.map((a) => permKey(mod.id, a));
                const checkedCount = modKeys.filter((k) => permissions.has(k)).length;
                const allModOn = checkedCount === modKeys.length && modKeys.length > 0;
                const someModOn = checkedCount > 0 && !allModOn;
                const isCollapsed = collapsed.has(mod.id);
                const Icon = mod.icon;

                return (
                  <div
                    key={mod.id}
                    className={`border-b border-slate-100 last:border-0 transition-colors ${checkedCount > 0 ? "bg-amber-50/20" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                  >
                    {/* Module header */}
                    <div className="flex items-center gap-3 px-6 py-3">
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(mod.id)}
                        className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                      >
                        {isCollapsed
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronUp className="w-4 h-4" />}
                      </button>

                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${mod.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">{mod.label}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            allModOn
                              ? "bg-amber-100 text-amber-700"
                              : someModOn
                              ? "bg-amber-50 text-amber-500"
                              : "bg-slate-100 text-slate-400"
                          }`}>
                            {checkedCount}/{modKeys.length}
                          </span>
                        </div>
                        {!isCollapsed && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {mod.actions.map((a) => ACTION_LABEL[a] || a).join(", ")}
                          </p>
                        )}
                      </div>

                      <FullAccessSwitch checked={allModOn} onChange={() => toggleModule(mod.id, mod.actions)} />
                    </div>

                    {/* Permission chips */}
                    {!isCollapsed && (
                      <div className="px-6 pb-4 flex flex-wrap gap-2 pl-[72px]">
                        {/* Select all for module */}
                        <button
                          type="button"
                          onClick={() => toggleModule(mod.id, mod.actions)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            allModOn
                              ? "bg-slate-100 border-slate-200 text-slate-500"
                              : someModOn
                              ? "bg-amber-100 border-amber-300 text-amber-700"
                              : "bg-slate-50 border-slate-200 text-slate-500 hover:border-amber-200 hover:bg-amber-50/50"
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${
                            allModOn ? "border border-slate-300 bg-white" : someModOn ? "bg-amber-200 border border-amber-300" : "border border-slate-300 bg-white"
                          }`}>
                            {allModOn && <X className="w-2 h-2 text-slate-500" strokeWidth={3} />}
                            {someModOn && <div className="w-2 h-0.5 bg-amber-600 rounded" />}
                          </span>
                          {allModOn ? "Deselect All" : "Select All"}
                        </button>

                        {/* Individual action chips */}
                        {mod.actions.map((action) => {
                          const key = permKey(mod.id, action);
                          return (
                            <PermChip
                              key={action}
                              checked={permissions.has(key)}
                              onChange={() => toggle(key)}
                              label={ACTION_LABEL[action] || action}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Save bar */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {saveMsg ? (
                  <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold ${
                    saveMsg.type === "ok"
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                      : "bg-red-50 border border-red-200 text-red-700"
                  }`}>
                    {saveMsg.type === "ok" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {saveMsg.text}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-amber-600">{checkedTotal}</span> of{" "}
                    <span className="font-semibold">{allKeys.length}</span> permissions enabled for{" "}
                    <span className="font-semibold text-slate-700">{selectedRole?.name}</span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-sm shadow-amber-200 hover:shadow-amber-300 transition-all disabled:opacity-60 active:scale-95"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Permissions</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selectedRoleId && roles.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">No roles yet</h3>
            <p className="text-sm text-slate-500">Create your first role using the &quot;New Role&quot; button above.</p>
          </div>
        )}
      </div>
    </PageScaffold>
  );
}
