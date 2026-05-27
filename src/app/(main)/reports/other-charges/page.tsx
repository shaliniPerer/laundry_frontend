"use client";

import { StandardReportLayout } from "@/components/StandardReportLayout";
import { api } from "@/lib/api";

type OtherChargeItem = { description: string; amount: number };
type Sale = {
  pk?: string;
  saleNumber?: string;
  deliveryDate?: string;
  customerName?: string;
  otherChargeItems?: OtherChargeItem[];
  otherCharges?: number;
  entityType?: string;
};

export default function OtherChargesReportPage() {
  return (
    <StandardReportLayout
      title="Other Charges Report"
      filters={[
        { key: "from", label: "From Date", type: "date", defaultValue: "" },
        { key: "to", label: "To Date", type: "date", defaultValue: "" },
        { key: "chargeName", label: "Charge Name", type: "text", placeholder: "Search charge name",
          fetchOptions: async () => {
            const r = await api<{ sales: Sale[] }>("/api/sales");
            const names = new Set<string>();
            for (const s of r.data?.sales ?? []) {
              if (s.entityType !== "SALE") continue;
              if (Array.isArray(s.otherChargeItems) && s.otherChargeItems.length > 0) {
                for (const c of s.otherChargeItems) { if (c.description) names.add(c.description); }
              } else if ((s.otherCharges ?? 0) > 0) {
                names.add("Other Charges");
              }
            }
            return Array.from(names).sort();
          },
        },
      ]}
      columns={[
        { key: "invoiceNumber", label: "Invoice #" },
        { key: "date", label: "Date" },
        { key: "customerName", label: "Customer Name" },
        { key: "chargeName", label: "Charge Name" },
        { key: "amount", label: "Amount(LKR)", right: true },
      ]}
      fetchData={async (form) => {
        const res = await api<{ sales: Sale[] }>("/api/sales");
        if (!res.ok || !res.data?.sales) return [];

        const rows: Record<string, string | number>[] = [];
        for (const sale of res.data.sales) {
          if (sale.entityType !== "SALE") continue;
          if (form.from && (sale.deliveryDate ?? "") < form.from) continue;
          if (form.to && (sale.deliveryDate ?? "") > form.to) continue;

          const charges: OtherChargeItem[] = Array.isArray(sale.otherChargeItems) && sale.otherChargeItems.length > 0
            ? sale.otherChargeItems
            : (sale.otherCharges ?? 0) > 0
              ? [{ description: "Other Charges", amount: sale.otherCharges! }]
              : [];

          for (const charge of charges) {
            if (form.chargeName && !charge.description.toLowerCase().includes(form.chargeName.toLowerCase())) continue;
            rows.push({
              invoiceNumber: sale.saleNumber || sale.pk?.replace("SALE#", "").slice(0, 8) || "",
              date: sale.deliveryDate ? sale.deliveryDate.split("-").reverse().join("-") : "",
              customerName: sale.customerName || "Walk-in",
              chargeName: charge.description,
              amount: Number(charge.amount ?? 0).toFixed(2),
            });
          }
        }
        return rows;
      }}
    />
  );
}
