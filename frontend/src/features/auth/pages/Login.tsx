// ✅ src/features/auth/pages/Login.tsx

import { Link } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import OTPForm from "../components/OTPForm";
import ToastRenderer from "../components/ToastRenderer";
import GoogleButton from "../components/GoogleButton";
import { useLoginVM } from "../hooks/useLoginVM";

export default function Login() {
  const {
    /* core */
    otpRequired,
    role,
    setRole,
    username,
    setUsername,
    password,
    setPassword,
    isLoading,
    isUnderCooldown,

    /* otp */
    otp,
    setOTP,
    doVerifyOTP,

    /* primary action */
    doLogin,

    /* toasts */
    toasts,
    removeToast,
  } = useLoginVM();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>

        {!otpRequired ? (
          <>
            <LoginForm
              role={role}
              setRole={setRole}
              username={username}
              setUsername={setUsername}
              password={password}
              setPassword={setPassword}
              isLoading={isLoading}
              isUnderCooldown={isUnderCooldown}
              doLogin={doLogin}
            />

            {/* ✅ Google login */}
            <div className="mt-4">
              <GoogleButton />
            </div>
          </>
        ) : (
          <OTPForm
            otp={otp}
            setOTP={setOTP}
            doVerifyOTP={doVerifyOTP}
            isLoading={isLoading}
            isUnderCooldown={isUnderCooldown}
          />
        )}

        <div className="mt-4 text-center">
          <Link
            to="/reset-password"
            className="text-sm text-blue-500 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      {/* ✅ toast layer */}
      <ToastRenderer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
