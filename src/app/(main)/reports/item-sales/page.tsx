"use client";

import { StandardReportLayout } from "@/components/StandardReportLayout";
import { api } from "@/lib/api";

type Sale = { pk?: string; deliveryDate?: string; lines?: { itemId?: string; description: string; qty: number; lineTotal: number }[]; entityType?: string };
type Item = { pk?: string; name?: string; purchasePrice?: number; entityType?: string };

export default function ItemSalesReportPage() {
  return (
    <StandardReportLayout
      title="Item Sales Report"
      filters={[
        { key: "from", label: "From Date", type: "date" },
        { key: "to", label: "To Date", type: "date" },
        {
          key: "itemName", label: "Item Name", type: "select",
          options: ["-All-"],
          fetchOptions: async () => {
            const res = await api<{ items: Item[] }>("/api/items");
            return (res.data?.items ?? []).filter((i) => i.entityType === "ITEM").map((i) => i.name ?? "").filter(Boolean);
          },
        },
        { key: "category", label: "Category", type: "text", placeholder: "Search Category" },
      ]}
      columns={[
        { key: "itemName", label: "Item Name" },
        { key: "unit", label: "Unit" },
        { key: "qty", label: "Sales Quantity", right: true },
        { key: "salesPrice", label: "Sales Price(LKR)", right: true },
        { key: "purchasePrice", label: "Purchase Price(LKR)", right: true },
        { key: "grossProfit", label: "Gross Profit(LKR)", right: true },
      ]}
      fetchData={async (form) => {
        const [salesRes, itemsRes] = await Promise.all([
          api<{ sales: Sale[] }>("/api/sales"),
          api<{ items: Item[] }>("/api/items"),
        ]);
        if (!salesRes.ok) return [];
        const sales = (salesRes.data?.sales ?? []).filter((s) =>
          s.entityType === "SALE" &&
          (!form.from || (s.deliveryDate ?? "") >= form.from) &&
          (!form.to || (s.deliveryDate ?? "") <= form.to)
        );
        const itemMap: Record<string, Item> = Object.fromEntries(
          (itemsRes.data?.items ?? []).filter((i) => i.entityType === "ITEM").map((i) => [i.pk?.replace("ITEM#", "") ?? "", i])
        );
        const agg: Record<string, { name: string; qty: number; salesPrice: number; purchasePrice: number }> = {};
        for (const sale of sales) {
          for (const line of (sale.lines ?? [])) {
            const key = line.itemId || line.description;
            if (!agg[key]) {
              const item = line.itemId ? itemMap[line.itemId] : null;
              agg[key] = { name: item?.name || line.description, qty: 0, salesPrice: 0, purchasePrice: 0 };
            }
            agg[key].qty += line.qty;
            agg[key].salesPrice += line.lineTotal;
            if (line.itemId && itemMap[line.itemId]) {
              agg[key].purchasePrice += Number(itemMap[line.itemId].purchasePrice ?? 0) * line.qty;
            }
          }
        }
        return Object.values(agg)
          .filter((r) => !form.itemName || form.itemName === "-All-" || r.name.toLowerCase() === form.itemName.toLowerCase())
          .map((r) => ({
            itemName: r.name,
            unit: "",
            qty: r.qty.toFixed(2),
            salesPrice: r.salesPrice.toFixed(2),
            purchasePrice: r.purchasePrice.toFixed(2),
            grossProfit: (r.salesPrice - r.purchasePrice).toFixed(2),
          }));
      }}
    />
  );
}
