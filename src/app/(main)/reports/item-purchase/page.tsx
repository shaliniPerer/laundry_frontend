"use client";
import { StandardReportLayout } from "@/components/StandardReportLayout";
import { api } from "@/lib/api";

type Purchase = { pk?: string; purchaseDate?: string; lines?: { itemId?: string; description?: string; qty: number; unitPrice?: number; lineTotal: number }[]; entityType?: string };
type Item = { pk?: string; name?: string; entityType?: string };

export default function ItemPurchaseReportPage() {
  return (
    <StandardReportLayout
      title="Item Purchase Report"
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
        { key: "supplierName", label: "Supplier Name", type: "text", placeholder: "Search Supplier" },
      ]}
      columns={[
        { key: "itemName", label: "Item Name" },
        { key: "unit", label: "Unit" },
        { key: "qty", label: "Purchase Quantity", right: true },
        { key: "purchasePrice", label: "Purchase Price(LKR)", right: true },
        { key: "total", label: "Total(LKR)", right: true },
      ]}
      fetchData={async (form) => {
        const [purchasesRes, itemsRes] = await Promise.all([
          api<{ purchases: Purchase[] }>("/api/purchases"),
          api<{ items: Item[] }>("/api/items"),
        ]);
        if (!purchasesRes.ok) return [];
        const purchases = (purchasesRes.data?.purchases ?? []).filter((p) =>
          p.entityType === "PURCHASE" &&
          (!form.from || (p.purchaseDate ?? "").slice(0, 10) >= form.from) &&
          (!form.to || (p.purchaseDate ?? "").slice(0, 10) <= form.to)
        );
        const itemMap: Record<string, Item> = Object.fromEntries(
          (itemsRes.data?.items ?? []).filter((i) => i.entityType === "ITEM").map((i) => [i.pk?.replace("ITEM#", "") ?? "", i])
        );
        const agg: Record<string, { name: string; qty: number; unitPrice: number; total: number }> = {};
        for (const purchase of purchases) {
          for (const line of (purchase.lines ?? [])) {
            const key = line.itemId || line.description || "";
            if (!agg[key]) {
              const item = line.itemId ? itemMap[line.itemId] : null;
              agg[key] = { name: item?.name || line.description || key, qty: 0, unitPrice: Number(line.unitPrice ?? 0), total: 0 };
            }
            agg[key].qty += line.qty;
            agg[key].total += line.lineTotal;
          }
        }
        return Object.values(agg)
          .filter((r) => !form.itemName || form.itemName === "-All-" || r.name.toLowerCase() === form.itemName.toLowerCase())
          .map((r) => ({
            itemName: r.name,
            unit: "",
            qty: r.qty.toFixed(2),
            purchasePrice: r.qty > 0 ? (r.total / r.qty).toFixed(2) : "0.00",
            total: r.total.toFixed(2),
          }));
      }}
    />
  );
}
