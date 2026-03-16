// adminApi.ts — Admin user management API helpers using native fetch().
// Uses fetch() directly so requests are NOT intercepted by axios-mock-adapter.

const BASE = "/api/admin/users";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  wallet: number | string | null;
  points: number;
  role: string;
  status: string;
  referralCode: string | null;
  invitedBy: number | null;
  createTime: string | null;
  updateTime: string | null;
}

export interface AdminUsersPage {
  content: AdminUser[];
  totalPages: number;
  totalElements: number;
  number: number;  // current page index (0-based)
  size: number;
}

export interface AdminUsersResponse {
  code: number;
  msg: string;
  data: AdminUsersPage;
}

export interface UpdateUserPayload {
  username: string;
  email: string;
  phone: string;
}

export interface ApiResult {
  code: number;
  msg: string;
}

export interface WalletTransaction {
  id?: number;
  createTime: string;
  amount: number;
  type: string;
  description: string;
}

export interface WalletLogsPage {
  content: WalletTransaction[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export interface WalletLogsResponse {
  code: number;
  msg: string;
  data: WalletLogsPage | WalletTransaction[];  // handles both paginated and flat response
}

export interface WalletLogsParams {
  page?: number;
  size?: number;
  startDate?: string;
  endDate?: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const getAdminUsers = async (
  page: number,
  size: number,
  keyword: string
): Promise<AdminUsersResponse> => {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (keyword.trim()) params.set("keyword", keyword.trim());

  const response = await fetch(`${BASE}?${params}`, {
    headers: authHeaders(),
  });
  return response.json();
};

export const updateAdminUser = async (
  id: number,
  payload: UpdateUserPayload
): Promise<ApiResult> => {
  const response = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const deactivateAdminUser = async (id: number): Promise<ApiResult> => {
  const response = await fetch(`${BASE}/${id}/deactivate`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return response.json();
};

export const getWalletLogs = async (
  userId: number,
  params: WalletLogsParams = {}
): Promise<WalletLogsResponse> => {
  const { page = 0, size = 10, startDate, endDate } = params;
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (startDate) query.set("startDate", startDate);
  if (endDate) query.set("endDate", endDate);

  const response = await fetch(`${BASE}/${userId}/wallet?${query}`, {
    headers: authHeaders(),
  });
  return response.json();
};

export const getAdminUserQR = async (id: number): Promise<string | null> => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const response = await fetch(`${BASE}/${id}/qr`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
};
