"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

type Row = {
  pk?: string;
  total?: number;
  reason?: string;
  originalSaleId?: string;
  createdAt?: string;
};

type Sale = {
  pk?: string;
  saleNumber?: string;
  customerName?: string;
  total?: number;
  deliveryDate?: string;
  status?: string;
};

export default function SalesReturnListPage() {
  const searchParams = useSearchParams();
  const saleId = searchParams.get("saleId") ?? "";
  const saleCode = searchParams.get("saleCode") ?? "";
  const [rows, setRows] = useState<Row[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [sale, setSale] = useState<Sale | null>(null);

  useEffect(() => {
    (async () => {
      const [returnsRes, salesRes] = await Promise.all([
        api<{ returns: Row[] }>("/api/sales/returns/list"),
        api<{ sales: Sale[] }>("/api/sales"),
      ]);
      if (returnsRes.ok && returnsRes.data?.returns) setRows(returnsRes.data.returns);
      if (salesRes.ok && salesRes.data?.sales) setSales(salesRes.data.sales);
    })();
  }, []);

  useEffect(() => {
    if (!saleId) {
      setSale(null);
      return;
    }
    (async () => {
      const res = await api<Sale>(`/api/sales/${saleId}`);
      if (res.ok && res.data) setSale(res.data);
    })();
  }, [saleId]);

  const filteredRows = useMemo(
    () => (!saleId ? rows : rows.filter((row) => row.originalSaleId === saleId)),
    [rows, saleId]
  );

  const salesById = useMemo(() => {
    const map = new Map<string, Sale>();
    for (const item of sales) {
      if (item.pk) map.set(item.pk.replace("SALE#", ""), item);
    }
    return map;
  }, [sales]);

  function formatDate(value?: string) {
    if (!value) return "-";
    // Try YYYY-MM-DD string split first (avoids timezone issues)
    const parts = value.slice(0, 10).split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}-${date.getFullYear()}`;
  }

  return (
    <PageScaffold
      title="Sales return list"
      subtitle={saleCode ? `Recorded returns for ${saleCode}` : "Recorded returns"}
    >
      {sale && (
        <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-orange-900">
                Original Sale: {sale.saleNumber || saleCode || saleId}
              </div>
              <div className="mt-1 text-sm text-orange-800">
                Customer: {sale.customerName || "Walk-in Customer"}
              </div>
              <div className="text-sm text-orange-800">
                Delivery Date: {sale.deliveryDate || "-"} | Status: {sale.status || "-"}
              </div>
              <div className="text-sm text-orange-800">
                Total: LKR {Number(sale.total ?? 0).toFixed(2)}
              </div>
            </div>
            <Link
              href={`/sales/returns/new?saleId=${saleId}`}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              Record Return
            </Link>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden card-shadow">
        {filteredRows.length === 0 ? (
          <p className="p-8 text-center text-slate-500 text-sm">
            {saleId ? "No returns recorded for this sale yet." : "No returns yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600">
                <th className="px-4 py-3 font-medium">Return Date</th>
                <th className="px-4 py-3 font-medium">Customer Name</th>
                <th className="px-4 py-3 font-medium">Sales ID</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => {
                const originalSale = row.originalSaleId
                  ? salesById.get(row.originalSaleId)
                  : undefined;

                return (
                  <tr key={row.pk || index} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-700">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      {originalSale?.customerName || "Walk-in Customer"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {originalSale?.saleNumber || row.originalSaleId || "-"}
                    </td>
                    <td className="px-4 py-3">{row.reason || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      LKR {Number(row.total ?? 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </PageScaffold>
  );
}
