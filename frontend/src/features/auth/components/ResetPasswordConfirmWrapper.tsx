// ✅ src/features/auth/components/ResetPasswordConfirmWrapper.tsx
import { useParams } from "react-router-dom";
import { ResetPasswordConfirmForm } from "./ResetPasswordConfirmForm";

export const ResetPasswordConfirmWrapper = () => {
  const { token } = useParams<{ token: string }>();

  // no token → dead link
  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="max-w-md text-center bg-red-50 border border-red-300 rounded-xl p-6 shadow-sm">
          <p className="text-lg font-semibold text-red-600">
            Bruh… that reset link is busted.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            It might be expired or malformed. Hit request reset again to keep
            the security hygiene on-point.
          </p>
        </div>
      </div>
    );
  }

  return <ResetPasswordConfirmForm token={token} />;
};

export default ResetPasswordConfirmWrapper;
