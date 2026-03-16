// paymentApi.ts — Manual online banking payment feature helpers.

const ADMIN_GET_SETTINGS = "/api/admin/users/payment-settings"; // GET
const ADMIN_PUT_SETTINGS = "/api/admin/users/settings";          // PUT
const PUBLIC_SETTINGS    = "/api/payment/settings";              // GET (customer)

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

function bearerOnly(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaymentSettings {
  bankName: string;
  accountName: string;
  accountNumber: string;
  qrCodeUrl?: string;
}

export interface PaymentSettingsPayload {
  bankName: string;
  accountName: string;
  accountNumber: string;
  qrCodeUrl?: string;
}

export interface PaymentSettingsResponse {
  code: number;
  message: string;
  data: PaymentSettings;
  error?: string;
}

export interface PaymentApiResult {
  code: number;
  message?: string;
  msg?: string;
  data?: any;
  error?: string;
}

// ── Customer: read bank info ───────────────────────────────────────────────────

export const getPublicPaymentSettings = async (): Promise<PaymentSettingsResponse> => {
  const res = await fetch(PUBLIC_SETTINGS, { headers: authHeaders() });
  return res.json();
};

// ── Admin: manage bank info ────────────────────────────────────────────────────

export const getAdminPaymentSettings = async (): Promise<PaymentSettingsResponse> => {
  const res = await fetch(ADMIN_GET_SETTINGS, { headers: authHeaders() });
  return res.json();
};

export const updatePaymentSettings = async (
  payload: PaymentSettingsPayload
): Promise<PaymentApiResult> => {
  const res = await fetch(ADMIN_PUT_SETTINGS, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return res.json();
};

// ── Admin: upload QR image ─────────────────────────────────────────────────────

export const uploadPaymentQR = async (file: File): Promise<PaymentApiResult> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/admin/users/payment-qr", {
    method: "POST",
    headers: bearerOnly(),
    body: formData,
  });
  return res.json();
};

// ── Customer: bank-transfer redemption (receipt sent together) ─────────────────

export const redeemProductBankTransfer = async (
  productId: number,
  addressId: number,
  receiptFile: File
): Promise<PaymentApiResult> => {
  const formData = new FormData();
  formData.append("productId", String(productId));
  formData.append("redeemType", "BANK_TRANSFER");
  formData.append("addressId", String(addressId));
  formData.append("receipt", receiptFile);
  const res = await fetch("/api/products/redeem", {
    method: "POST",
    headers: bearerOnly(),
    body: formData,
  });
  return res.json();
};

// ── Admin: verify / reject payment ────────────────────────────────────────────

export const approvePayment = async (requestId: number): Promise<PaymentApiResult> => {
  const res = await fetch(`/api/admin/requests/${requestId}/verify`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return res.json();
};

export const rejectPayment = async (requestId: number): Promise<PaymentApiResult> => {
  const res = await fetch(`/api/admin/requests/${requestId}/reject`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return res.json();
};
