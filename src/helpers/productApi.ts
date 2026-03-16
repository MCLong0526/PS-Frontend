// productApi.ts — Product redemption and request tracking API helpers.

const PRODUCT_BASE = "/api/products";
const ADMIN_BASE = "/api/admin/products";
const ADDRESS_BASE = "/api/addresses";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProductImage {
  id: number;
  imageUrl: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  priceWallet: number;
  pricePoints: number;
  quantity: number;
  images: ProductImage[];
}

export interface ProductsPage {
  content: Product[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export interface ProductsResponse {
  code: number;
  msg: string;
  data: ProductsPage;
}

export interface MyRequest {
  id: number;
  requestType: string;
  productId: number;
  productName?: string;
  productImages?: ProductImage[];
  redeemType: string;
  amountWallet: number | null;
  amountPoints: number | null;
  status: string;
  paymentStatus?: string;
  createTime: string;
  trackingNumber: string | null;
}

export interface RequestsPage {
  content: MyRequest[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export interface RequestsResponse {
  code: number;
  msg: string;
  data: RequestsPage;
}

export interface AdminRequest extends MyRequest {
  userId: number;
  username?: string;
  email?: string;
  productName?: string;
  productImages?: ProductImage[];
  completedTime?: string;
  // Flat delivery address fields (returned directly from backend)
  addressId?: number;
  receiverName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  // Manual banking payment
  receiptUrl?: string;
  paymentMethod?: string;
  paymentStatus?: string;
}

export interface WalletLog {
  id?: number;
  createTime: string;
  amount: number;
  type: string;
  description?: string;
}

export interface WalletHistoryResponse {
  code: number;
  msg: string;
  data: WalletLog[];
}

export interface AdminRequestsPage {
  content: AdminRequest[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export interface AdminRequestsResponse {
  code: number;
  msg: string;
  data: AdminRequestsPage;
}

export interface ApiResult {
  code: number;
  msg: string;
  data?: any;
}

export interface ProductPayload {
  name: string;
  description: string;
  priceWallet: number;
  pricePoints: number;
  quantity: number;
}

export interface Address {
  id: number;
  receiverName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface AddressPayload {
  receiverName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface AddressesResponse {
  code: number;
  msg: string;
  data: Address[];
}

// ── Customer APIs ─────────────────────────────────────────────────────────────

export interface ProductResponse {
  code: number;
  msg: string;
  data: Product;
}

export const getProducts = async (page = 0, size = 9): Promise<ProductsResponse> => {
  const res = await fetch(`${PRODUCT_BASE}?page=${page}&size=${size}`, {
    headers: authHeaders(),
  });
  return res.json();
};

export const getProductById = async (id: number): Promise<ProductResponse> => {
  const res = await fetch(`${PRODUCT_BASE}/${id}`, { headers: authHeaders() });
  return res.json();
};

export const redeemProduct = async (
  productId: number,
  redeemType: "POINT" | "WALLET",
  addressId: number
): Promise<ApiResult> => {
  const res = await fetch(
    `${PRODUCT_BASE}/redeem?productId=${productId}&redeemType=${redeemType}&addressId=${addressId}`,
    { method: "POST", headers: authHeaders() }
  );
  return res.json();
};

export const getMyRequests = async (page = 0, size = 10): Promise<RequestsResponse> => {
  const res = await fetch(`${PRODUCT_BASE}/my-requests?page=${page}&size=${size}`, {
    headers: authHeaders(),
  });
  return res.json();
};

export const completeRequest = async (id: number): Promise<ApiResult> => {
  const res = await fetch(`${PRODUCT_BASE}/complete/${id}`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return res.json();
};

// ── Address APIs ──────────────────────────────────────────────────────────────

export const getAddresses = async (): Promise<AddressesResponse> => {
  const res = await fetch(ADDRESS_BASE, { headers: authHeaders() });
  return res.json();
};

export const createAddress = async (payload: AddressPayload): Promise<ApiResult> => {
  const res = await fetch(ADDRESS_BASE, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return res.json();
};

// ── Admin APIs ────────────────────────────────────────────────────────────────

export const adminCreateProduct = async (payload: ProductPayload): Promise<ApiResult> => {
  const res = await fetch(ADMIN_BASE, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const adminUpdateProduct = async (
  id: number,
  payload: ProductPayload
): Promise<ApiResult> => {
  const res = await fetch(`${ADMIN_BASE}/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const adminDeleteProduct = async (id: number): Promise<ApiResult> => {
  const res = await fetch(`${ADMIN_BASE}/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return res.json();
};

export const adminUploadProductImage = async (
  productId: number,
  file: File
): Promise<ApiResult> => {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${ADMIN_BASE}/${productId}/images`, {
    method: "POST",
    // No Content-Type header — browser sets it automatically with the correct boundary
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return res.json();
};

export const adminDeleteProductImage = async (imageId: number): Promise<ApiResult> => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${ADMIN_BASE}/images/${imageId}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
};

export interface AdminRequestFilters {
  status?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

export const getAdminRequests = async (
  page = 0,
  size = 10,
  filters?: AdminRequestFilters
): Promise<AdminRequestsResponse> => {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (filters?.status)    params.set("status",    filters.status);
  if (filters?.keyword)   params.set("keyword",   filters.keyword);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate)   params.set("endDate",   filters.endDate);
  const res = await fetch(`${ADMIN_BASE}/requests?${params}`, { headers: authHeaders() });
  return res.json();
};

export const getAdminWalletHistory = async (userId: number): Promise<WalletHistoryResponse> => {
  const res = await fetch(`/api/admin/users/${userId}/wallet`, { headers: authHeaders() });
  return res.json();
};

export const shipRequest = async (id: number, trackingNumber: string): Promise<ApiResult> => {
  const res = await fetch(
    `/api/admin/requests/${id}/ship?trackingNumber=${encodeURIComponent(trackingNumber)}`,
    { method: "PUT", headers: authHeaders() }
  );
  return res.json();
};
