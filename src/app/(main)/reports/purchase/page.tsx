"use client";
import { StandardReportLayout } from "@/components/StandardReportLayout";

export default function PurchaseReportPage() {
  return (
    <StandardReportLayout
      title="Purchase Report"
      filters={[
        { key: "from", label: "From Date", type: "date" },
        { key: "to", label: "To Date", type: "date" },
        { key: "supplierName", label: "Supplier Name", type: "text", placeholder: "Search Name/Mobile" },
        { key: "paymentStatus", label: "Payment Status", type: "select", options: ["-All-", "Fully Paid", "Due"] },
      ]}
      columns={[
        { key: "invoiceNumber", label: "Invoice Number" },
        { key: "purchaseDate", label: "Purchase Date" },
        { key: "supplierId", label: "Supplier ID" },
        { key: "supplierName", label: "Supplier Name" },
        { key: "invoiceTotal", label: "Invoice Total(LKR)", right: true },
        { key: "paidPayment", label: "Paid Payment(LKR)", right: true },
        { key: "dueAmount", label: "Due Amount(LKR)", right: true },
        { key: "dueDays", label: "Due Days" },
      ]}
      fetchData={async () => []}
    />
  );
}
