// loginApi.ts — Real backend login integration using native fetch().
//
// We intentionally use fetch() instead of Axios here so that this request
// is NOT intercepted by the axios-mock-adapter fake backend that is active
// for the rest of the app. This lets us reach the real server while keeping
// all other mocked endpoints working.

const LOGIN_URL = "/api/users/login";

export interface LoginApiPayload {
  email: string;
  password: string;
}

export interface LoginUserData {
  id: number;
  username: string;
  email: string;
  role: string;
  phone: string | null;
  points: number;
  wallet: number | null;
  referralCode: string | null;
}

export interface LoginApiResponse {
  code: number;   // HTTP-style status code returned in the body (e.g. 200, 401)
  msg: string;    // Human-readable message (e.g. "success" or "Invalid password")
  token?: string; // JWT token, present only on success
  data?: LoginUserData; // Full user object returned on success
}

/**
 * Send login credentials to the backend and return the parsed response.
 *
 * Throws a descriptive Error on network-level failures (server unreachable,
 * no internet, JSON parse failure, etc.).  The caller is responsible for
 * handling application-level errors (non-200 codes) by inspecting the
 * returned `code` and `msg` fields.
 */
export const loginWithApi = async (
  payload: LoginApiPayload
): Promise<LoginApiResponse> => {
  // POST the credentials as a JSON body
  const response = await fetch(LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
    }),
  });

  // Parse and return the server's JSON response.
  // Both success and application-level error bodies are valid JSON here.
  const data: LoginApiResponse = await response.json();
  return data;
};
