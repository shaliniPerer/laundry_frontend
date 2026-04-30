"use client";

import { StandardReportLayout } from "@/components/StandardReportLayout";
import { api } from "@/lib/api";

type Expense = { pk?: string; date?: string; categoryName?: string; referenceNo?: string; expenseFor?: string; amount?: number; note?: string; createdBy?: string; entityType?: string };

export default function ExpenseReportPage() {
  return (
    <StandardReportLayout
      title="Expense Report"
      filters={[
        { key: "from", label: "From Date", type: "date" },
        { key: "to", label: "To Date", type: "date" },
        { key: "category", label: "Category", type: "text", placeholder: "Search Category" },
        { key: "expenseFor", label: "Expense For", type: "text", placeholder: "Search" },
      ]}
      columns={[
        { key: "date", label: "Date" },
        { key: "category", label: "Category" },
        { key: "referenceNo", label: "Reference No." },
        { key: "expenseFor", label: "Expense for" },
        { key: "amount", label: "Amount(LKR)", right: true },
        { key: "note", label: "Note" },
        { key: "createdBy", label: "Created by" },
      ]}
      fetchData={async (form) => {
        const res = await api<{ expenses: Expense[] }>("/api/expenses");
        if (!res.ok || !res.data?.expenses) return [];
        return res.data.expenses
          .filter((e) => e.entityType === "EXPENSE")
          .filter((e) => !form.from || (e.date ?? "") >= form.from)
          .filter((e) => !form.to || (e.date ?? "") <= form.to)
          .filter((e) => !form.category || (e.categoryName ?? "").toLowerCase().includes(form.category.toLowerCase()))
          .filter((e) => !form.expenseFor || (e.expenseFor ?? "").toLowerCase().includes(form.expenseFor.toLowerCase()))
          .map((e) => ({
            date: e.date ? e.date.split("-").reverse().join("-") : "",
            category: e.categoryName || "",
            referenceNo: e.referenceNo || "",
            expenseFor: e.expenseFor || "",
            amount: Number(e.amount ?? 0).toFixed(2),
            note: e.note || "",
            createdBy: e.createdBy || "",
          }));
      }}
    />
  );
}
