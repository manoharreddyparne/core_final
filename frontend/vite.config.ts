import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    origin: "http://localhost:3000",
    hmr: {
      // Ensure HMR WebSocket connects to the correct host/port
      // (fixes Docker / WSL / port-forwarding scenarios)
      host: "localhost",
      port: 3000,
      clientPort: 3000,
    },
    watch: {
      usePolling: true,
    },
  },
});
