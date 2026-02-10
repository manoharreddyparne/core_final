import { googleLogin } from "../api/socialApi";

export default function GoogleButton() {
  const handleGoogleLogin = async () => {
    /* @ts-ignore */
    const client = google.accounts.oauth2.initCodeClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      ux_mode: "popup",
      callback: async (response: any) => {
        if (!response?.code) {
          console.error("No Google auth code received");
          return;
        }

        try {
          await googleLogin(response.code);
        } catch (e) {
          console.error("Google Login API failed", e);
        }
      },
    });

    client.requestCode();
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className="w-full bg-red-600 text-white py-2 px-4 rounded shadow hover:bg-red-700"
    >
      Continue with Google
    </button>
  );
}
