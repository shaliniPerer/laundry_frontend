"use client";

import { StandardReportLayout } from "@/components/StandardReportLayout";
import { api } from "@/lib/api";

type Item = { pk?: string; name?: string; sku?: string; expireDate?: string; openingStock?: number; entityType?: string };

export default function ExpiredItemsReportPage() {
  return (
    <StandardReportLayout
      title="Expired Items Report"
      filters={[
        { key: "from", label: "From Date", type: "date" },
        { key: "to", label: "To Date", type: "date" },
        { key: "itemName", label: "Item Name", type: "text", placeholder: "Search Item" },
        { key: "status", label: "Status", type: "select", options: ["-All-", "Expired", "Expiring Soon"] },
      ]}
      columns={[
        { key: "itemName", label: "Item Name" },
        { key: "itemCode", label: "Item Code" },
        { key: "expireDate", label: "Expire Date" },
        { key: "stock", label: "Stock", right: true },
      ]}
      fetchData={async (form) => {
        const res = await api<{ items: Item[] }>("/api/items");
        if (!res.ok || !res.data?.items) return [];
        const today = new Date().toISOString().slice(0, 10);
        return res.data.items
          .filter((i) => i.entityType === "ITEM" && i.expireDate)
          .filter((i) => !form.itemName || (i.name ?? "").toLowerCase().includes(form.itemName.toLowerCase()))
          .filter((i) => {
            if (form.status === "Expired") return (i.expireDate ?? "") < today;
            if (form.status === "Expiring Soon") return (i.expireDate ?? "") >= today;
            return true;
          })
          .map((i) => ({
            itemName: i.name || "",
            itemCode: i.sku || i.pk?.replace("ITEM#", "").slice(0, 8) || "",
            expireDate: i.expireDate ? i.expireDate.split("-").reverse().join("-") : "",
            stock: Number(i.openingStock ?? 0).toFixed(2),
          }));
      }}
    />
  );
}
