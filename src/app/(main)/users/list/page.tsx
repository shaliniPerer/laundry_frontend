"use client";

import { useEffect, useState } from "react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

type Row = { id?: string; name?: string; email?: string };

export default function UsersListPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const res = await api<{ users: Row[] }>("/api/admin/users");
      if (res.ok && res.data?.users) setRows(res.data.users);
    })();
  }, []);

  return (
    <PageScaffold title="Users list" subtitle="Accounts that can sign in">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden card-shadow">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-slate-500 text-sm">No users.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id || i} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageScaffold>
  );
}
