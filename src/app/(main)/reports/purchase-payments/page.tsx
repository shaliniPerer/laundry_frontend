"use client";
import { StandardReportLayout } from "@/components/StandardReportLayout";
import { api } from "@/lib/api";

type Purchase = { pk?: string; purchaseCode?: string; purchaseDate?: string; total?: number; paymentStatus?: string; supplierName?: string; payments?: { paymentType: string; amount: number }[]; entityType?: string };
type Supplier = { pk?: string; name?: string };

export default function PurchasePaymentsReportPage() {
  return (
    <StandardReportLayout
      title="Purchase Payments Report"
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
        { key: "paymentType", label: "Payment Type", type: "select", options: ["-All-", "Cash", "Card", "Bank Transfer"] },
      ]}
      columns={[
        { key: "invoiceNumber", label: "Invoice Number" },
        { key: "paymentDate", label: "Payment Date" },
        { key: "supplierName", label: "Supplier Name" },
        { key: "invoiceTotal", label: "Invoice Total(LKR)", right: true },
        { key: "paidAmount", label: "Paid Amount(LKR)", right: true },
        { key: "paymentType", label: "Payment Type" },
      ]}
      fetchData={async (form) => {
        const res = await api<{ purchases: Purchase[] }>("/api/purchases");
        if (!res.ok || !res.data?.purchases) return [];
        const rows: Record<string, string>[] = [];
        for (const p of res.data.purchases) {
          if (p.entityType !== "PURCHASE") continue;
          if (!form.from || (p.purchaseDate ?? "").slice(0, 10) >= form.from) {
            if (!form.to || (p.purchaseDate ?? "").slice(0, 10) <= form.to) {
              if (!form.supplierName || form.supplierName === "-All-" ||
                (p.supplierName ?? "").toLowerCase() === form.supplierName.toLowerCase()) {
                for (const pay of (p.payments ?? [])) {
                  if (!form.paymentType || form.paymentType === "-All-" || pay.paymentType === form.paymentType) {
                    rows.push({
                      invoiceNumber: p.purchaseCode || p.pk?.replace("PURCHASE#", "").slice(0, 8) || "",
                      paymentDate: p.purchaseDate ? p.purchaseDate.slice(0, 10).split("-").reverse().join("-") : "",
                      supplierName: p.supplierName || "",
                      invoiceTotal: Number(p.total ?? 0).toFixed(2),
                      paidAmount: Number(pay.amount ?? 0).toFixed(2),
                      paymentType: pay.paymentType || "",
                    });
                  }
                }
              }
            }
          }
        }
        return rows;
      }}
    />
  );
}
