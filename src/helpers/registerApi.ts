// registerApi.ts — Real backend register integration using native fetch().
//
// We intentionally use fetch() instead of Axios here so that this request
// is NOT intercepted by the axios-mock-adapter fake backend that is active
// for the rest of the app.

const REGISTER_URL = "/api/users/register";

export interface RegisterApiPayload {
  username: string;
  email: string;
  phone: string;
  password: string;
  referralCode?: string;
}

export interface RegisterApiResponse {
  code: number;  // HTTP-style status code returned in the body (e.g. 200, 400)
  msg: string;   // Human-readable message
}

export const registerWithApi = async (
  payload: RegisterApiPayload
): Promise<RegisterApiResponse> => {
  const body: Record<string, string> = {
    username: payload.username,
    email: payload.email,
    phone: payload.phone,
    password: payload.password,
  };

  if (payload.referralCode) {
    body.referralCode = payload.referralCode;
  }

  const response = await fetch(REGISTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data: RegisterApiResponse = await response.json();
  return data;
};
