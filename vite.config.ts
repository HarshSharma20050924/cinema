import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      react: path.resolve(import.meta.dirname, "node_modules/react"),
      "react-dom": path.resolve(import.meta.dirname, "node_modules/react-dom"),
    },
  },
  server: {
    port: 5174,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (err, _req, res: any) => {
            console.warn("[Vite Proxy Warning]:", err.message);
            try {
              if (res && !res.headersSent && typeof res.writeHead === "function") {
                res.writeHead(500, { "Content-Type": "text/plain" });
              }
              if (res && typeof res.end === "function") {
                res.end();
              }
            } catch {
              // Ignore
            }
          });
        },
      },
    },
  },
});
