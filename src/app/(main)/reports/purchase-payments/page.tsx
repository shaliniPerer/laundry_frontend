"use client";
import { StandardReportLayout } from "@/components/StandardReportLayout";

export default function PurchasePaymentsReportPage() {
  return (
    <StandardReportLayout
      title="Purchase Payments Report"
      filters={[
        { key: "from", label: "From Date", type: "date" },
        { key: "to", label: "To Date", type: "date" },
        { key: "supplierName", label: "Supplier Name", type: "text", placeholder: "Search Name/Mobile" },
        { key: "paymentType", label: "Payment Type", type: "select", options: ["-All-", "Cash", "Card", "Online"] },
      ]}
      columns={[
        { key: "invoiceNumber", label: "Invoice Number" },
        { key: "paymentDate", label: "Payment Date" },
        { key: "supplierName", label: "Supplier Name" },
        { key: "invoiceTotal", label: "Invoice Total(LKR)", right: true },
        { key: "paidAmount", label: "Paid Amount(LKR)", right: true },
        { key: "paymentType", label: "Payment Type" },
      ]}
      fetchData={async () => []}
    />
  );
}
