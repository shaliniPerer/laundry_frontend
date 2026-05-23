"use client";

import { StandardReportLayout } from "@/components/StandardReportLayout";
import { api } from "@/lib/api";

type Sale = { pk?: string; saleNumber?: string; deliveryDate?: string; total?: number; paidAmount?: number; paymentStatus?: string; customerId?: string; customerName?: string; customerMobile?: string; entityType?: string };
type Customer = { pk?: string; name?: string; customerNumber?: string };

export default function SalesReportPage() {
  return (
    <StandardReportLayout
      title="Sales Report"
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
        { key: "paymentStatus", label: "Payment Status", type: "select", options: ["-All-", "Paid", "Partial", "Unpaid"] },
      ]}
      columns={[
        { key: "invoiceNumber", label: "Invoice Number" },
        { key: "saleDate", label: "Sale Date" },
        { key: "customerId", label: "Customer ID" },
        { key: "customerName", label: "Customer Name" },
        { key: "invoiceTotal", label: "Invoice Total(LKR)", right: true },
        { key: "paidPayment", label: "Paid Payment(LKR)", right: true },
        { key: "dueAmount", label: "Due Amount(LKR)", right: true },
        { key: "dueDays", label: "Due Days" },
      ]}
      fetchData={async (form) => {
        const [salesRes, custRes] = await Promise.all([
          api<{ sales: Sale[] }>("/api/sales"),
          api<{ customers: Customer[] }>("/api/customers"),
        ]);
        if (!salesRes.ok || !salesRes.data?.sales) return [];
        const custMap: Record<string, string> = {};
        for (const c of custRes.data?.customers ?? []) {
          if (c.pk && c.customerNumber) custMap[c.pk.replace("CUSTOMER#", "")] = c.customerNumber;
        }
        return salesRes.data.sales
          .filter((s) => s.entityType === "SALE")
          .filter((s) => !form.from || (s.deliveryDate ?? "") >= form.from)
          .filter((s) => !form.to || (s.deliveryDate ?? "") <= form.to)
          .filter((s) => !form.customerName || form.customerName === "-All-" ||
            (s.customerName ?? "").toLowerCase() === form.customerName.toLowerCase())
          .filter((s) => !form.paymentStatus || form.paymentStatus === "-All-" ||
            s.paymentStatus === form.paymentStatus)
          .map((s) => {
            const total = Number(s.total ?? 0);
            const paid = Number(s.paidAmount ?? 0);
            const due = Math.max(0, total - paid);
            return {
              invoiceNumber: s.saleNumber || s.pk?.replace("SALE#", "").slice(0, 8) || "",
              saleDate: s.deliveryDate ? s.deliveryDate.split("-").reverse().join("-") : "",
              customerId: custMap[s.customerId || ""] || s.customerId?.slice(0, 8) || "",
              customerName: s.customerName || "Walk-in",
              invoiceTotal: total.toFixed(2),
              paidPayment: paid.toFixed(2),
              dueAmount: due.toFixed(2),
              dueDays: "",
            };
          });
      }}
    />
  );
}
