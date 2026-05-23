"use client";
import { StandardReportLayout } from "@/components/StandardReportLayout";
import { api } from "@/lib/api";

type Purchase = { pk?: string; purchaseCode?: string; purchaseDate?: string; total?: number; paidAmount?: number; paymentStatus?: string; supplierId?: string; supplierName?: string; entityType?: string };
type Supplier = { pk?: string; name?: string };

export default function PurchaseReportPage() {
  return (
    <StandardReportLayout
      title="Purchase Report"
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
        { key: "invoiceNumber", label: "Invoice Number" },
        { key: "purchaseDate", label: "Purchase Date" },
        { key: "supplierId", label: "Supplier ID" },
        { key: "supplierName", label: "Supplier Name" },
        { key: "invoiceTotal", label: "Invoice Total(LKR)", right: true },
        { key: "paidPayment", label: "Paid Payment(LKR)", right: true },
        { key: "dueAmount", label: "Due Amount(LKR)", right: true },
      ]}
      fetchData={async (form) => {
        const res = await api<{ purchases: Purchase[] }>("/api/purchases");
        if (!res.ok || !res.data?.purchases) return [];
        return res.data.purchases
          .filter((p) => p.entityType === "PURCHASE")
          .filter((p) => !form.from || (p.purchaseDate ?? "").slice(0, 10) >= form.from)
          .filter((p) => !form.to || (p.purchaseDate ?? "").slice(0, 10) <= form.to)
          .filter((p) => !form.supplierName || form.supplierName === "-All-" ||
            (p.supplierName ?? "").toLowerCase() === form.supplierName.toLowerCase())
          .filter((p) => !form.paymentStatus || form.paymentStatus === "-All-" ||
            p.paymentStatus === form.paymentStatus)
          .map((p) => {
            const total = Number(p.total ?? 0);
            const paid = Number(p.paidAmount ?? 0);
            return {
              invoiceNumber: p.purchaseCode || p.pk?.replace("PURCHASE#", "").slice(0, 8) || "",
              purchaseDate: p.purchaseDate ? p.purchaseDate.slice(0, 10).split("-").reverse().join("-") : "",
              supplierId: p.supplierId || "",
              supplierName: p.supplierName || "",
              invoiceTotal: total.toFixed(2),
              paidPayment: paid.toFixed(2),
              dueAmount: Math.max(0, total - paid).toFixed(2),
            };
          });
      }}
    />
  );
}
