//Include Both Helper File with needed methods
import { getFirebaseBackend } from "../../../helpers/firebase_helper";
import {
  postFakeRegister,
  postJwtRegister,
} from "../../../helpers/fakebackend_helper";

// Real backend helper (native fetch — bypasses axios-mock-adapter)
import { registerWithApi } from "../../../helpers/registerApi";

// Velzon-styled toast notifications
import { showToast } from "../../../helpers/appToast";

// action
import {
  registerUserSuccessful,
  registerUserFailed,
  resetRegisterFlagChange,
} from "./reducer";

// initialize relavant method of both Auth
const fireBaseBackend: any = getFirebaseBackend();

// Is user register successfull then direct plot user in redux.
export const registerUser = (user: any) => async (dispatch: any) => {
  try {
    if (process.env.REACT_APP_DEFAULTAUTH === "api") {
      // ── POST /api/users/register ─────────────────────────────────────────
      let registerData;
      try {
        registerData = await registerWithApi({
          username: user.username,
          email: user.email,
          phone: user.phone,
          password: user.password,
          referralCode: user.referralCode || undefined,
        });
      } catch {
        const msg = "Network error: unable to reach the server. Please check your connection.";
        dispatch(registerUserFailed({ message: msg } as any));
        showToast.error(msg);
        return;
      }

      if (registerData.code === 200) {
        dispatch(registerUserSuccessful({ message: "success" } as any));
        showToast.success("Registration successful! Redirecting to login...");
      } else {
        dispatch(registerUserFailed({ message: registerData.msg } as any));
        showToast.error(registerData.msg);
      }

    } else if (process.env.REACT_APP_DEFAULTAUTH === "firebase") {
      const response = fireBaseBackend.registerUser(user.email, user.password);
      dispatch(registerUserSuccessful(response as any));

    } else if (process.env.REACT_APP_DEFAULTAUTH === "jwt") {
      const response = postJwtRegister('/post-jwt-register', user);
      dispatch(registerUserSuccessful(response as any));

    } else if (process.env.REACT_APP_API_URL) {
      const response = postFakeRegister(user);
      const data: any = await response;

      if (data.message === "success") {
        dispatch(registerUserSuccessful(data));
      } else {
        dispatch(registerUserFailed(data));
      }
    }
  } catch (error: any) {
    dispatch(registerUserFailed(error));
  }
};

export const resetRegisterFlag = () => {
  try {
    const response = resetRegisterFlagChange();
    return response;
  } catch (error) {
    return error;
  }
};
