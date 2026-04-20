import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./features/auth/context/AuthProvider/AuthProvider";
import { ThemeProvider } from "./shared/context/ThemeContext";
import { AppRoutes } from "./app/routes/AppRoutes";
import { useDynamicTitle } from "./shared/hooks/useDynamicTitle";

export default function App() {
  useDynamicTitle();
  
  return (
    <ThemeProvider>
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 999999 }}
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontSize: '14px',
          },
        }}
      />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
