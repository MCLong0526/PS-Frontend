// userApi.ts — Fetch the authenticated user's profile from the backend.
//
// Uses native fetch() (not Axios) so the request is NOT intercepted by the
// axios-mock-adapter fake backend that is still active for other endpoints.

const ME_URL = "/api/users/me";

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  points: number;
  phone: string | null;
  wallet: string | null;
  referralCode: string | null;
  createTime: string | null;
  updateTime: string | null;
}

interface MeApiResponse {
  code: number;
  msg: string;
  data?: UserProfile;
}

/**
 * Retrieve the logged-in user's profile from GET /api/users/me.
 *
 * Reads the JWT from localStorage (key: "token") and attaches it as a
 * Bearer Authorization header.
 *
 * Returns the UserProfile on success.
 * Returns null when the token is missing or the server rejects it —
 * the CALLER is responsible for redirecting to login in that case.
 * Throws on network-level failures so the caller can handle the error.
 */
/**
 * Fetch the authenticated user's referral QR code from GET /api/users/my-qr.
 *
 * Returns an object URL (blob URL) that can be set as an <img> src.
 * Returns null when the token is missing, the request fails, or the response
 * is not an image.  The caller is responsible for revoking the object URL
 * (URL.revokeObjectURL) when the component unmounts.
 */
export const fetchReferralQR = async (): Promise<string | null> => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const response = await fetch("/api/users/my-qr", {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
};

export interface WalletHistoryItem {
  createTime: string;
  type: string;
  description: string;
  amount: number;
}

export interface WalletHistoryPage {
  content: WalletHistoryItem[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export interface WalletHistoryResponse {
  code: number;
  msg: string;
  data: WalletHistoryPage;
}

export interface WalletHistoryParams {
  page?: number;
  size?: number;
  startDate?: string;
  endDate?: string;
}

export const fetchWalletHistory = async (
  params: WalletHistoryParams = {}
): Promise<WalletHistoryResponse | null> => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const { page = 0, size = 10, startDate, endDate } = params;
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (startDate) query.set("startDate", startDate);
  if (endDate) query.set("endDate", endDate);

  const response = await fetch(`/api/wallet/history?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return response.json();
};

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  // Read the JWT saved during login
  const token = localStorage.getItem("token");

  if (!token) {
    // No token — signal the caller to redirect to login
    return null;
  }

  // Call the profile endpoint with the Bearer token
  const response = await fetch(ME_URL, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data: MeApiResponse = await response.json();

  if (data.code === 200 && data.data) {
    // Keep localStorage role in sync so sidebar always reflects the correct role.
    if (data.data.role) {
      localStorage.setItem("role", data.data.role);
    }
    return data.data;
  }

  // Token was rejected — return null so the caller can redirect
  return null;
};
