import { getFirebaseBackend } from "../../../helpers/firebase_helper";
import { postFakeLogin, postJwtLogin } from "../../../helpers/fakebackend_helper";

// Real backend helpers (native fetch — bypasses axios-mock-adapter)
import { loginWithApi } from "../../../helpers/loginApi";
import { logoutWithApi } from "../../../helpers/logoutApi";

// Velzon-styled toast notifications
import { showToast } from "../../../helpers/appToast";

import { loginSuccess, logoutUserSuccess, apiError, reset_login_flag } from './reducer';

export const loginUser = (user: any, history: any) => async (dispatch: any) => {
  try {
    if (process.env.REACT_APP_DEFAULTAUTH === "api") {
      // ── POST /api/users/login ─────────────────────────────────────────────
      let loginData;
      try {
        loginData = await loginWithApi({ email: user.email, password: user.password });
      } catch {
        const msg = "Network error: unable to reach the server. Please check your connection.";
        dispatch(apiError({ data: msg }));
        showToast.error(msg);
        return;
      }

      if (loginData.code !== 200) {
        // Server returned an application error (e.g. "Invalid password")
        dispatch(apiError({ data: loginData.msg }));
        showToast.error(loginData.msg);
        return;
      }

      // Persist the JWT for authenticated requests
      localStorage.setItem("token", loginData.token!);
      const authUser = { token: loginData.token };
      sessionStorage.setItem("authUser", JSON.stringify(authUser));

      dispatch(loginSuccess(authUser));
      showToast.success("Logged in successfully! Welcome back.");
      history('/dashboard');

    } else if (process.env.REACT_APP_DEFAULTAUTH === "firebase") {
      const fireBaseBackend: any = getFirebaseBackend();
      const response = await fireBaseBackend.loginUser(user.email, user.password);
      sessionStorage.setItem("authUser", JSON.stringify(response));
      dispatch(loginSuccess(response));
      showToast.success("Logged in successfully!");
      history('/dashboard');

    } else if (process.env.REACT_APP_DEFAULTAUTH === "jwt") {
      const response = await postJwtLogin({ email: user.email, password: user.password });
      sessionStorage.setItem("authUser", JSON.stringify(response));
      dispatch(loginSuccess(response));
      showToast.success("Logged in successfully!");
      history('/dashboard');

    } else {
      // Fake backend fallback
      const response: any = await postFakeLogin({ email: user.email, password: user.password });
      const finallogin: any = JSON.parse(JSON.stringify(response));
      if (finallogin.status === "success") {
        sessionStorage.setItem("authUser", JSON.stringify(finallogin.data));
        dispatch(loginSuccess(finallogin.data));
        showToast.success("Logged in successfully!");
        history('/dashboard');
      } else {
        dispatch(apiError(finallogin));
        showToast.error("Login failed. Please check your credentials.");
      }
    }

  } catch (error) {
    dispatch(apiError(error));
    showToast.error("An unexpected error occurred. Please try again.");
  }
};

export const logoutUser = () => async (dispatch: any) => {
  try {
    if (process.env.REACT_APP_DEFAULTAUTH === "api") {
      // Call POST /api/users/logout and clear storage
      await logoutWithApi();
    } else if (process.env.REACT_APP_DEFAULTAUTH === "firebase") {
      const fireBaseBackend: any = getFirebaseBackend();
      await fireBaseBackend.logout;
      sessionStorage.removeItem("authUser");
      localStorage.removeItem("token");
    } else {
      sessionStorage.removeItem("authUser");
      localStorage.removeItem("token");
    }

    showToast.info("You have been logged out.");
    dispatch(logoutUserSuccess(true));

  } catch (error) {
    // Even on error, clear local credentials and proceed with logout
    sessionStorage.removeItem("authUser");
    localStorage.removeItem("token");
    dispatch(logoutUserSuccess(true));
  }
};

export const socialLogin = (type: any, history: any) => async (dispatch: any) => {
  try {
    let response;
    if (process.env.REACT_APP_DEFAULTAUTH === "firebase") {
      const fireBaseBackend: any = getFirebaseBackend();
      response = fireBaseBackend.socialLoginUser(type);
    }
    const socialdata = await response;
    if (socialdata) {
      sessionStorage.setItem("authUser", JSON.stringify(response));
      dispatch(loginSuccess(response));
      showToast.success("Logged in successfully!");
      history('/dashboard');
    }
  } catch (error) {
    dispatch(apiError(error));
    showToast.error("Social login failed. Please try again.");
  }
};

export const resetLoginFlag = () => async (dispatch: any) => {
  try {
    const response = dispatch(reset_login_flag());
    return response;
  } catch (error) {
    dispatch(apiError(error));
  }
};
