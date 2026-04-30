"use client";

import { StandardReportLayout } from "@/components/StandardReportLayout";
import { api } from "@/lib/api";

type Return = { pk?: string; originalSaleId?: string; total?: number; reason?: string; createdAt?: string };

export default function SalesReturnReportPage() {
  return (
    <StandardReportLayout
      title="Sales Return Report"
      filters={[
        { key: "from", label: "From Date", type: "date" },
        { key: "to", label: "To Date", type: "date" },
        { key: "customer", label: "Customer Name", type: "text", placeholder: "Search Name/Mobile" },
        { key: "status", label: "Payment Status", type: "select", options: ["-All-"] },
      ]}
      columns={[
        { key: "returnNumber", label: "Return Number" },
        { key: "returnDate", label: "Return Date" },
        { key: "originalInvoice", label: "Original Invoice" },
        { key: "reason", label: "Reason" },
        { key: "total", label: "Total Amount(LKR)", right: true },
      ]}
      fetchData={async (form) => {
        const res = await api<{ returns: Return[] }>("/api/sales/returns/list");
        if (!res.ok || !res.data?.returns) return [];
        return res.data.returns
          .filter((r) => {
            const d = (r.createdAt ?? "").slice(0, 10);
            return (!form.from || d >= form.from) && (!form.to || d <= form.to);
          })
          .map((r, i) => ({
            returnNumber: r.pk?.replace("SALE_RETURN#", "").slice(0, 8) || String(i + 1),
            returnDate: r.createdAt ? r.createdAt.slice(0, 10).split("-").reverse().join("-") : "",
            originalInvoice: r.originalSaleId || "",
            reason: r.reason || "",
            total: Number(r.total ?? 0).toFixed(2),
          }));
      }}
    />
  );
}
