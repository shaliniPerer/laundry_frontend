"use client";
import { StandardReportLayout } from "@/components/StandardReportLayout";
import { api } from "@/lib/api";

type Return = { pk?: string; originalPurchaseId?: string; total?: number; reason?: string; createdAt?: string; supplierName?: string };
type Supplier = { pk?: string; name?: string };

export default function PurchaseReturnReportPage() {
  return (
    <StandardReportLayout
      title="Purchase Return Report"
      filters={[
        { key: "from", label: "From Date", type: "date" },
        { key: "to", label: "To Date", type: "date" },
        {
          key: "supplierName", label: "Supplier Name", type: "select",
          options: ["-All-"],
          fetchOptions: async () => {
            const res = await api<{ suppliers: Supplier[] }>("/api/suppliers");
            return (res.data?.suppliers ?? []).map((s) => s.name ?? "").filter(Boolean);
          },
        },
        { key: "paymentStatus", label: "Payment Status", type: "select", options: ["-All-", "Paid", "Partial", "Unpaid"] },
      ]}
      columns={[
        { key: "returnNumber", label: "Return Number" },
        { key: "returnDate", label: "Return Date" },
        { key: "supplierName", label: "Supplier Name" },
        { key: "total", label: "Total Amount(LKR)", right: true },
        { key: "reason", label: "Reason" },
      ]}
      fetchData={async (form) => {
        const res = await api<{ returns: Return[] }>("/api/purchases/returns/list");
        if (!res.ok || !res.data?.returns) return [];
        return res.data.returns
          .filter((r) => {
            const d = (r.createdAt ?? "").slice(0, 10);
            return (!form.from || d >= form.from) && (!form.to || d <= form.to);
          })
          .filter((r) => !form.supplierName || form.supplierName === "-All-" ||
            (r.supplierName ?? "").toLowerCase() === form.supplierName.toLowerCase())
          .map((r, i) => ({
            returnNumber: r.pk?.replace("PURCHASE_RETURN#", "").slice(0, 8) || String(i + 1),
            returnDate: r.createdAt ? r.createdAt.slice(0, 10).split("-").reverse().join("-") : "",
            supplierName: r.supplierName || "",
            total: Number(r.total ?? 0).toFixed(2),
            reason: r.reason || "",
          }));
      }}
    />
  );
}
