"use client";

import { StandardReportLayout } from "@/components/StandardReportLayout";
import { api } from "@/lib/api";

type Item = { pk?: string; name?: string; sku?: string; openingStock?: number; purchasePrice?: number; salesPrice?: number; price?: number; entityType?: string; status?: string };

export default function StockReportPage() {
  return (
    <StandardReportLayout
      title="Stock Report"
      filters={[
        { key: "from", label: "From Date", type: "date" },
        { key: "to", label: "To Date", type: "date" },
        { key: "itemName", label: "Item Name", type: "text", placeholder: "Search Item" },
        { key: "status", label: "Status", type: "select", options: ["-All-", "Active", "Inactive"] },
      ]}
      columns={[
        { key: "itemName", label: "Item Name" },
        { key: "itemCode", label: "Item Code" },
        { key: "openingStock", label: "Opening Stock", right: true },
        { key: "purchasePrice", label: "Purchase Price(LKR)", right: true },
        { key: "salesPrice", label: "Sales Price(LKR)", right: true },
      ]}
      fetchData={async (form) => {
        const res = await api<{ items: Item[] }>("/api/items");
        if (!res.ok || !res.data?.items) return [];
        return res.data.items
          .filter((i) => i.entityType === "ITEM")
          .filter((i) => !form.itemName || (i.name ?? "").toLowerCase().includes(form.itemName.toLowerCase()))
          .filter((i) => form.status === "-All-" || !form.status || (i.status ?? "active") === form.status.toLowerCase())
          .map((i) => ({
            itemName: i.name || "",
            itemCode: i.sku || i.pk?.replace("ITEM#", "").slice(0, 8) || "",
            openingStock: Number(i.openingStock ?? 0).toFixed(2),
            purchasePrice: Number(i.purchasePrice ?? 0).toFixed(2),
            salesPrice: Number(i.salesPrice ?? i.price ?? 0).toFixed(2),
          }));
      }}
    />
  );
}
