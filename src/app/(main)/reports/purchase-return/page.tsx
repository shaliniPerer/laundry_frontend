"use client";
import { StandardReportLayout } from "@/components/StandardReportLayout";

export default function PurchaseReturnReportPage() {
  return (
    <StandardReportLayout
      title="Purchase Return Report"
      filters={[
        { key: "from", label: "From Date", type: "date" },
        { key: "to", label: "To Date", type: "date" },
        { key: "supplierName", label: "Supplier Name", type: "text", placeholder: "Search Name/Mobile" },
        { key: "paymentStatus", label: "Payment Status", type: "select", options: ["-All-", "Fully Paid", "Due"] },
      ]}
      columns={[
        { key: "returnNumber", label: "Return Number" },
        { key: "returnDate", label: "Return Date" },
        { key: "supplierId", label: "Supplier ID" },
        { key: "supplierName", label: "Supplier Name" },
        { key: "invoiceTotal", label: "Invoice Total(LKR)", right: true },
        { key: "paidPayment", label: "Paid Payment(LKR)", right: true },
        { key: "dueAmount", label: "Due Amount(LKR)", right: true },
      ]}
      fetchData={async () => []}
    />
  );
}
