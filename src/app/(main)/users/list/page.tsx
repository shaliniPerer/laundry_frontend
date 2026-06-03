"use client";

import { useEffect, useState } from "react";
import { PageScaffold } from "@/components/PageScaffold";
import { api } from "@/lib/api";

type Row = { id?: string; name?: string; email?: string; phone?: string; roleId?: string; userNumber?: string };
type Role = { pk?: string; name?: string };

export default function UsersListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const [usersRes, rolesRes] = await Promise.all([
        api<{ users: Row[] }>("/api/admin/users"),
        api<{ roles: Role[] }>("/api/admin/roles"),
      ]);
      if (usersRes.ok && usersRes.data?.users) setRows(usersRes.data.users);
      if (rolesRes.ok && rolesRes.data?.roles) {
        const map: Record<string, string> = {};
        for (const r of rolesRes.data.roles) {
          if (r.pk) {
            // Index by both "ROLE#uuid" and plain "uuid" to handle both storage formats
            map[r.pk] = r.name ?? r.pk;
            map[r.pk.replace("ROLE#", "")] = r.name ?? r.pk;
          }
        }
        setRoleMap(map);
      }
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
              <tr className="bg-blue-600 text-left text-white text-xs uppercase">
                <th className="px-4 py-3 font-medium">User ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id || i} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{r.userNumber || `USER${String(i + 1).padStart(3, "0")}`}</td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3">{r.phone || "—"}</td>
                  <td className="px-4 py-3">{r.roleId ? (roleMap[r.roleId] || r.roleId) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageScaffold>
  );
}

