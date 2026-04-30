"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  CheckCircle2,
  Loader2,
  Package,
  Search,
  Shirt,
  ThumbsUp,
} from "lucide-react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type SaleWithCustomer = {
  pk: string;
  saleNumber: string;
  customerName: string;
  deliveryDate: string;
  total: number;
  status: string;
  lines: { description: string; qty: number; unitPrice: number; lineTotal: number }[];
};

type Stats = {
  statusCounts: {
    pending: number;
    processing: number;
    ready_to_deliver: number;
    delivered: number;
    returned: number;
  };
  paymentCounts: { not_paid: number; partially_paid: number; fully_paid: number };
  monthlyData: { month: string; revenue: number; expenses: number }[];
  monthlySales: { month: string; total: number }[];
};

type OverviewRangeType = "today" | "this_week" | "this_month" | "custom";
type DeliveryRangeType = OverviewRangeType | "tomorrow";

// ─── Charts ──────────────────────────────────────────────────────────────────

function BarChart({
  bars,
  showLine = false,
}: {
  bars: { label: string; value: number; color: string }[];
  showLine?: boolean;
}) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  const W = 400;
  const H = 200;
  const padT = 10;
  const padB = 36;
  const padL = 40;
  const padR = 10;
  const cW = W - padL - padR;
  const cH = H - padT - padB;
  const slot = cW / bars.length;
  const barW = slot * 0.55;

  const yLines = [0, 25, 50, 75, 100].map((pct) => ({
    y: padT + (1 - pct / 100) * cH,
    val: Math.round((max * pct) / 100),
  }));

  // Bezier line through bar tops
  const pts = bars.map((b, i) => ({
    x: padL + i * slot + slot / 2,
    y: padT + (1 - b.value / max) * cH,
  }));
  let linePath = "";
  if (showLine && pts.length > 1) {
    linePath = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cx = (pts[i - 1].x + pts[i].x) / 2;
      linePath += ` C ${cx} ${pts[i - 1].y}, ${cx} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {yLines.map((l) => (
        <g key={l.y}>
          <line
            x1={padL}
            y1={l.y}
            x2={W - padR}
            y2={l.y}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          <text x={padL - 5} y={l.y + 4} textAnchor="end" fontSize="9" fill="#94a3b8">
            {l.val}
          </text>
        </g>
      ))}
      {bars.map((b, i) => {
        const bH = Math.max((b.value / max) * cH, b.value > 0 ? 2 : 0);
        const x = padL + i * slot + (slot - barW) / 2;
        const y = padT + cH - bH;
        return (
          <g key={b.label}>
            <rect x={x} y={y} width={barW} height={bH} fill={b.color} rx="3" />
            <text
              x={padL + i * slot + slot / 2}
              y={H - padB + 16}
              textAnchor="middle"
              fontSize="9"
              fill="#64748b"
            >
              {b.label}
            </text>
          </g>
        );
      })}
      {showLine && linePath && (
        <path d={linePath} fill="none" stroke="#1e293b" strokeWidth="1.5" />
      )}
    </svg>
  );
}

function GroupedBarChart({
  data,
}: {
  data: { month: string; revenue: number; expenses: number }[];
}) {
  const max = Math.max(...data.flatMap((d) => [d.revenue, d.expenses]), 1);
  const W = 600;
  const H = 220;
  const padT = 10;
  const padB = 30;
  const padL = 55;
  const padR = 10;
  const cW = W - padL - padR;
  const cH = H - padT - padB;
  const n = Math.max(data.length, 1);
  const slot = cW / n;
  const barW = slot * 0.28;

  const yLines = [0, 25, 50, 75, 100].map((pct) => ({
    y: padT + (1 - pct / 100) * cH,
    val: Math.round((max * pct) / 100),
  }));

  const fmtMonth = (m: string) => {
    const parts = m.split("-");
    const mo = parseInt(parts[1] || "1") - 1;
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][mo] ?? m;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {yLines.map((l) => (
        <g key={l.y}>
          <line x1={padL} y1={l.y} x2={W - padR} y2={l.y} stroke="#e2e8f0" strokeWidth="1" />
          <text x={padL - 5} y={l.y + 4} textAnchor="end" fontSize="9" fill="#94a3b8">
            {l.val}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const rH = Math.max((d.revenue / max) * cH, d.revenue > 0 ? 2 : 0);
        const eH = Math.max((d.expenses / max) * cH, d.expenses > 0 ? 2 : 0);
        const slotX = padL + i * slot;
        const gap = (slot - barW * 2) / 3;
        const rx = slotX + gap;
        const ex = rx + barW + gap;
        return (
          <g key={d.month}>
            <rect x={rx} y={padT + cH - rH} width={barW} height={rH} fill="#f43f5e" rx="2" />
            <rect x={ex} y={padT + cH - eH} width={barW} height={eH} fill="#3b82f6" rx="2" />
            <text
              x={slotX + slot / 2}
              y={H - padB + 14}
              textAnchor="middle"
              fontSize="9"
              fill="#64748b"
            >
              {fmtMonth(d.month)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function MonthlySalesChart({ data }: { data: { month: string; total: number }[] }) {
  const bars = data.map((item) => ({
    label:
      ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
        Math.max(0, Number(item.month) - 1)
      ] ?? item.month,
    value: item.total,
    color: "#14b8a6",
  }));

  return <BarChart bars={bars} />;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getDateRange(
  rangeType: OverviewRangeType,
  fromDate: string,
  toDate: string
) {
  const now = new Date();
  const today = toISODate(now);
  if (rangeType === "today") return { start: today, end: today };
  if (rangeType === "this_week") {
    const startDate = new Date(now);
    const day = startDate.getDay();
    const diffToMonday = (day + 6) % 7;
    startDate.setDate(startDate.getDate() - diffToMonday);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    return { start: toISODate(startDate), end: toISODate(endDate) };
  }
  if (rangeType === "this_month") {
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: toISODate(startDate), end: toISODate(endDate) };
  }
  return { start: fromDate, end: toDate };
}

function statusBadgeClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "delivered") return "bg-green-100 text-green-700";
  if (s === "processing") return "bg-purple-100 text-purple-700";
  if (s === "ready_to_deliver" || s === "ready to deliver") return "bg-cyan-100 text-cyan-700";
  if (s === "returned") return "bg-red-100 text-red-700";
  return "bg-orange-100 text-orange-700";
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: "Pending",
    processing: "Processing",
    ready_to_deliver: "Ready To Deliver",
    "ready to deliver": "Ready To Deliver",
    delivered: "Delivered",
    returned: "Returned",
  };
  return map[s.toLowerCase()] ?? s;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = useMemo(() => toISODate(new Date()), []);
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  }, []);
  const [sales, setSales] = useState<SaleWithCustomer[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [rangeType, setRangeType] = useState<DeliveryRangeType>("today");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [overviewRangeType, setOverviewRangeType] = useState<OverviewRangeType>("this_month");
  const [overviewFromDate, setOverviewFromDate] = useState(today);
  const [overviewToDate, setOverviewToDate] = useState(today);
  const [salesYear, setSalesYear] = useState(new Date().getFullYear());

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () =>
      rangeType === "tomorrow"
        ? { start: tomorrow, end: tomorrow }
        : getDateRange(rangeType, fromDate, toDate),
    [rangeType, fromDate, toDate, tomorrow]
  );

  const { start: overviewStart, end: overviewEnd } = useMemo(
    () => getDateRange(overviewRangeType, overviewFromDate, overviewToDate),
    [overviewRangeType, overviewFromDate, overviewToDate]
  );

  const load = useCallback(async () => {
    if (!rangeStart || !rangeEnd) {
      setSales([]);
      return;
    }
    setLoading(true);
    const [salesRes, statsRes] = await Promise.all([
      api<{ sales: SaleWithCustomer[] }>(
        `/api/dashboard/deliveries?start=${rangeStart}&end=${rangeEnd}`
      ),
      api<Stats>(
        `/api/dashboard/stats?start=${overviewStart}&end=${overviewEnd}&year=${salesYear}`
      ),
    ]);
    setLoading(false);
    if (salesRes.ok && salesRes.data?.sales) setSales(salesRes.data.sales);
    if (statsRes.ok && statsRes.data) setStats(statsRes.data);
  }, [overviewEnd, overviewStart, rangeEnd, rangeStart, salesYear]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredSales = sales.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (s.saleNumber || "").toLowerCase().includes(q) ||
      (s.customerName || "").toLowerCase().includes(q);
    return matchSearch;
  });

  const sc = stats?.statusCounts;
  const pc = stats?.paymentCounts;

  const statCards = [
    {
      label: "Pending Order",
      value: sc?.pending ?? 0,
      gradient: "from-blue-50 to-sky-100/60",
      iconBg: "bg-blue-500",
      Icon: Package,
    },
    {
      label: "Processing Order",
      value: sc?.processing ?? 0,
      gradient: "from-purple-50 to-purple-100/60",
      iconBg: "bg-purple-500",
      Icon: Loader2,
    },
    {
      label: "Ready To Deliver",
      value: sc?.ready_to_deliver ?? 0,
      gradient: "from-cyan-50 to-cyan-100/60",
      iconBg: "bg-cyan-500",
      Icon: ThumbsUp,
    },
    {
      label: "Delivered Orders",
      value: sc?.delivered ?? 0,
      gradient: "from-green-50 to-green-100/60",
      iconBg: "bg-green-500",
      Icon: CheckCircle2,
    },
  ];

  const statusBars = [
    { label: "Pending", value: sc?.pending ?? 0, color: "#94a3b8" },
    { label: "Processing", value: sc?.processing ?? 0, color: "#f59e0b" },
    { label: "Ready To Deliver", value: sc?.ready_to_deliver ?? 0, color: "#22c55e" },
    { label: "Delivered", value: sc?.delivered ?? 0, color: "#3b82f6" },
    { label: "Returned", value: sc?.returned ?? 0, color: "#ef4444" },
  ];

  const paymentBars = [
    { label: "Not Paid", value: pc?.not_paid ?? 0, color: "#f43f5e" },
    { label: "Partially Paid", value: pc?.partially_paid ?? 0, color: "#3b82f6" },
    { label: "Fully Paid", value: pc?.fully_paid ?? 0, color: "#22c55e" },
  ];

  const selectableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - i);
  }, []);

  function DateRangeToolbar<T extends DeliveryRangeType>({
    value,
    from,
    to,
    onValueChange,
    onFromChange,
    onToChange,
    includeTomorrow = false,
  }: {
    value: T;
    from: string;
    to: string;
    onValueChange: (value: T) => void;
    onFromChange: (value: string) => void;
    onToChange: (value: string) => void;
    includeTomorrow?: boolean;
  }) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={value}
            onChange={(e) =>
              onValueChange(e.target.value as T)
            }
            className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-slate-400 bg-white"
          >
            <option value="today">Today</option>
            {includeTomorrow && <option value="tomorrow">Tomorrow</option>}
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        {value === "custom" && (
          <>
            <input
              type="date"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-slate-400"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-slate-400"
            />
          </>
        )}
      </div>
    );
  }

  return (
    <PageScaffold title="Dashboard" subtitle="">
      <div className="space-y-6">
        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, gradient, iconBg, Icon }) => (
            <div
              key={label}
              className={`bg-linear-to-br ${gradient} rounded-2xl p-5 flex items-center justify-between border border-white/80 shadow-sm`}
            >
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-4xl font-bold text-slate-800 mt-1">{value}</p>
              </div>
              <div
                className={`w-14 h-14 ${iconBg} rounded-full flex items-center justify-center shadow-md`}
              >
                <Icon className="w-7 h-7 text-white" />
              </div>
            </div>
          ))}
        </div>

        {/* ── Today's Delivery ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="text-lg font-semibold text-slate-800">Delivery Details</h2>
            <div className="flex items-center gap-3">
              <DateRangeToolbar
                value={rangeType}
                from={fromDate}
                to={toDate}
                onValueChange={setRangeType}
                onFromChange={setFromDate}
                onToChange={setToDate}
                includeTomorrow
              />
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Here"
                  className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-slate-400"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <p className="text-slate-500 text-sm py-10 text-center">Loading…</p>
          ) : filteredSales.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
              No deliveries in selected range
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSales.map((s) => (
                <div
                  key={s.pk}
                  className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-bold text-slate-800 text-sm">{s.saleNumber}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadgeClass(s.status)}`}
                    >
                      {statusLabel(s.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-3">
                    <span className="text-slate-400 text-base">👤</span>
                    <span>
                      Customer:{" "}
                      <strong className="text-slate-800">{s.customerName}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Shirt className="w-7 h-7 text-slate-400" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {s.deliveryDate}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Charts row ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Monthly Sales</h3>
            <div className="relative">
              <select
                value={salesYear}
                onChange={(e) => setSalesYear(Number(e.target.value))}
                className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-slate-400 bg-white"
              >
                {selectableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          {!stats?.monthlySales || stats.monthlySales.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">No sales data yet</div>
          ) : (
            <MonthlySalesChart data={stats.monthlySales} />
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Status Overview</h3>
              <DateRangeToolbar
                value={overviewRangeType}
                from={overviewFromDate}
                to={overviewToDate}
                onValueChange={setOverviewRangeType}
                onFromChange={setOverviewFromDate}
                onToChange={setOverviewToDate}
              />
            </div>
            <BarChart bars={statusBars} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
              {statusBars.map((b) => (
                <div key={b.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: b.color }} />
                  {b.label}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Payment Overview</h3>
              <DateRangeToolbar
                value={overviewRangeType}
                from={overviewFromDate}
                to={overviewToDate}
                onValueChange={setOverviewRangeType}
                onFromChange={setOverviewFromDate}
                onToChange={setOverviewToDate}
              />
            </div>
            <BarChart bars={paymentBars} showLine />
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
              {paymentBars.map((b) => (
                <div key={b.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: b.color }} />
                  {b.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Payment vs Expense ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Payment vs Expense</h3>
            <DateRangeToolbar
              value={overviewRangeType}
              from={overviewFromDate}
              to={overviewToDate}
              onValueChange={setOverviewRangeType}
              onFromChange={setOverviewFromDate}
              onToChange={setOverviewToDate}
            />
          </div>
          {!stats?.monthlyData || stats.monthlyData.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              No monthly data yet
            </div>
          ) : (
            <>
              <GroupedBarChart data={stats.monthlyData} />
              <div className="flex gap-5 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-3 h-3 rounded-sm bg-rose-500" />
                  Payment (Revenue)
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-3 h-3 rounded-sm bg-blue-500" />
                  Expenses
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PageScaffold>
  );
}
