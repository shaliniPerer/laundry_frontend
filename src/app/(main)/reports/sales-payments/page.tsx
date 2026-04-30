"use client";

import { StandardReportLayout } from "@/components/StandardReportLayout";
import { api } from "@/lib/api";

type Sale = { pk?: string; saleNumber?: string; deliveryDate?: string; total?: number; paymentStatus?: string; customerId?: string; entityType?: string };

export default function SalesPaymentsReportPage() {
  return (
    <StandardReportLayout
      title="Sales Payments Report"
      filters={[
        { key: "from", label: "From Date", type: "date" },
        { key: "to", label: "To Date", type: "date" },
        { key: "customerName", label: "Customer Name", type: "text", placeholder: "Search Name/Mobile" },
        { key: "paymentType", label: "Payment Type", type: "select", options: ["-All-", "Cash", "Card", "Online"] },
      ]}
      columns={[
        { key: "invoiceNumber", label: "Invoice Number" },
        { key: "paymentDate", label: "Payment Date" },
        { key: "customerName", label: "Customer Name" },
        { key: "invoiceTotal", label: "Invoice Total(LKR)", right: true },
        { key: "paidAmount", label: "Paid Amount(LKR)", right: true },
        { key: "paymentType", label: "Payment Type" },
      ]}
      fetchData={async (form) => {
        const res = await api<{ sales: Sale[] }>("/api/sales");
        if (!res.ok || !res.data?.sales) return [];
        return res.data.sales
          .filter((s) => s.entityType === "SALE" && s.paymentStatus === "fully_paid")
          .filter((s) => !form.from || (s.deliveryDate ?? "") >= form.from)
          .filter((s) => !form.to || (s.deliveryDate ?? "") <= form.to)
          .map((s) => ({
            invoiceNumber: s.saleNumber || s.pk?.replace("SALE#", "").slice(0, 8) || "",
            paymentDate: s.deliveryDate ? s.deliveryDate.split("-").reverse().join("-") : "",
            customerName: s.customerId || "Walk-in",
            invoiceTotal: Number(s.total ?? 0).toFixed(2),
            paidAmount: Number(s.total ?? 0).toFixed(2),
            paymentType: "Cash",
          }));
      }}
    />
  );
}
