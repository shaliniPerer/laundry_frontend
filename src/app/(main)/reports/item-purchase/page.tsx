"use client";
import { StandardReportLayout } from "@/components/StandardReportLayout";

export default function ItemPurchaseReportPage() {
  return (
    <StandardReportLayout
      title="Item Purchase Report"
      filters={[
        { key: "from", label: "From Date", type: "date" },
        { key: "to", label: "To Date", type: "date" },
        { key: "itemName", label: "Item Name", type: "text", placeholder: "Search Item" },
        { key: "supplierName", label: "Supplier Name", type: "text", placeholder: "Search Supplier" },
      ]}
      columns={[
        { key: "itemName", label: "Item Name" },
        { key: "unit", label: "Unit" },
        { key: "qty", label: "Purchase Quantity", right: true },
        { key: "purchasePrice", label: "Purchase Price(LKR)", right: true },
        { key: "total", label: "Total(LKR)", right: true },
      ]}
      fetchData={async () => []}
    />
  );
}
