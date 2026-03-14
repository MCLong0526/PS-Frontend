// logoutApi.ts — Call the backend logout endpoint.
// Uses native fetch() to bypass the axios-mock-adapter fake backend.

const LOGOUT_URL = "/api/users/logout";

/**
 * POST /api/users/logout with the stored Bearer token.
 * Clears localStorage and sessionStorage on completion regardless of the
 * server response (token is disposable once the client drops it).
 */
export const logoutWithApi = async (): Promise<void> => {
  const token = localStorage.getItem("token");

  try {
    await fetch(LOGOUT_URL, {
      method: "POST",
      headers: {
        // Send the JWT so the server can invalidate the session server-side
        "Authorization": token ? `Bearer ${token}` : "",
      },
    });
  } catch {
    // Network failure on logout is non-critical — clear storage anyway
  } finally {
    // Always remove credentials from the client regardless of server response
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    sessionStorage.removeItem("authUser");
  }
};
