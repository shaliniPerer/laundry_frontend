"use client";

import { StandardReportLayout } from "@/components/StandardReportLayout";
import { api } from "@/lib/api";

type Sale = { pk?: string; saleNumber?: string; deliveryDate?: string; total?: number; paymentStatus?: string; customerId?: string; entityType?: string };

export default function SalesReportPage() {
  return (
    <StandardReportLayout
      title="Sales Report"
      filters={[
        { key: "from", label: "From Date", type: "date" },
        { key: "to", label: "To Date", type: "date" },
        { key: "customerName", label: "Customer Name", type: "text", placeholder: "Search Name/Mobile" },
        { key: "paymentStatus", label: "Payment Status", type: "select", options: ["-All-", "Fully Paid", "Due"] },
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
        const res = await api<{ sales: Sale[] }>("/api/sales");
        if (!res.ok || !res.data?.sales) return [];
        return res.data.sales
          .filter((s) => s.entityType === "SALE")
          .filter((s) => !form.from || (s.deliveryDate ?? "") >= form.from)
          .filter((s) => !form.to || (s.deliveryDate ?? "") <= form.to)
          .filter((s) => form.paymentStatus === "-All-" || !form.paymentStatus ||
            (form.paymentStatus === "Fully Paid" && s.paymentStatus === "fully_paid") ||
            (form.paymentStatus === "Due" && s.paymentStatus !== "fully_paid"))
          .map((s) => ({
            invoiceNumber: s.saleNumber || s.pk?.replace("SALE#", "").slice(0, 8) || "",
            saleDate: s.deliveryDate ? s.deliveryDate.split("-").reverse().join("-") : "",
            customerId: s.customerId || "",
            customerName: s.customerId || "Walk-in",
            invoiceTotal: Number(s.total ?? 0).toFixed(2),
            paidPayment: s.paymentStatus === "fully_paid" ? Number(s.total ?? 0).toFixed(2) : "0.00",
            dueAmount: s.paymentStatus !== "fully_paid" ? Number(s.total ?? 0).toFixed(2) : "0.00",
            dueDays: "",
          }));
      }}
    />
  );
}
