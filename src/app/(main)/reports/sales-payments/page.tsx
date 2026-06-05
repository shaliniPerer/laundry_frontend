"use client";

import { StandardReportLayout } from "@/components/StandardReportLayout";
import { api } from "@/lib/api";

type Sale = { pk?: string; saleNumber?: string; deliveryDate?: string; total?: number; paidAmount?: number; paymentStatus?: string; customerId?: string; customerName?: string; payments?: { paymentType: string; amount: number }[]; entityType?: string };
type Customer = { pk?: string; name?: string };

export default function SalesPaymentsReportPage() {
  return (
    <StandardReportLayout
      title="Sales Payments Report"
      filters={[
        { key: "from", label: "From Date", type: "date" },
        { key: "to", label: "To Date", type: "date" },
        {
          key: "customerName", label: "Customer Name", type: "select",
          options: ["-All-"],
          fetchOptions: async () => {
            const res = await api<{ customers: Customer[] }>("/api/customers");
            return (res.data?.customers ?? []).map((c) => c.name ?? "").filter(Boolean);
          },
        },
        { key: "paymentType", label: "Payment Type", type: "select", options: ["-All-", "Cash", "Card", "Bank Transfer"] },
      ]}
      columns={[
        { key: "invoiceNumber", label: "Invoice Number" },
        { key: "paymentDate", label: "Payment Date" },
        { key: "customerName", label: "Customer Name"},
        { key: "invoiceTotal", label: "Invoice Total(LKR)"},
        { key: "paidAmount", label: "Paid Amount(LKR)"},
        { key: "paymentType", label: "Payment Type"},
      ]}
      fetchData={async (form) => {
        const res = await api<{ sales: Sale[] }>("/api/sales");
        if (!res.ok || !res.data?.sales) return [];
        const rows: Record<string, string>[] = [];
        for (const s of res.data.sales) {
          if (s.entityType !== "SALE") continue;
          if (!form.from || (s.deliveryDate ?? "") >= form.from) {
            if (!form.to || (s.deliveryDate ?? "") <= form.to) {
              if (!form.customerName || form.customerName === "-All-" ||
                (s.customerName ?? "").toLowerCase() === form.customerName.toLowerCase()) {
                for (const p of (s.payments ?? [])) {
                  if (!form.paymentType || form.paymentType === "-All-" || p.paymentType === form.paymentType) {
                    rows.push({
                      invoiceNumber: s.saleNumber || s.pk?.replace("SALE#", "").slice(0, 8) || "",
                      paymentDate: s.deliveryDate ? s.deliveryDate.split("-").reverse().join("-") : "",
                      customerName: s.customerName || "Walk-in",
                      invoiceTotal: Number(s.total ?? 0).toFixed(2),
                      paidAmount: Number(p.amount ?? 0).toFixed(2),
                      paymentType: p.paymentType || "",
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
