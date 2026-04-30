const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

export async function api<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let data: T | undefined;
  try {
    data = text ? (JSON.parse(text) as T) : undefined;
  } catch {
    data = undefined;
  }
  if (res.status === 401) {
    setToken(null);
  }
  const err = data && typeof data === "object" && "error" in data ? String((data as { error?: string }).error) : undefined;
  return { ok: res.ok, status: res.status, data, error: err };
}
