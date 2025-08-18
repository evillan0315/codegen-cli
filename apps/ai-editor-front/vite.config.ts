import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@components": path.resolve(__dirname, "src/components"),
        "@contexts": path.resolve(__dirname, "src/contexts"),
        "@hooks": path.resolve(__dirname, "src/hooks"),
        "@utils": path.resolve(__dirname, "src/utils"),
        "@services": path.resolve(__dirname, "src/services"),
        "@stores": path.resolve(__dirname, "src/stores"),
        "@providers": path.resolve(__dirname, "src/providers"),
        "@types": path.resolve(__dirname, "src/types"),
        "@styles": path.resolve(__dirname, "src/styles"),
        "@libs": path.resolve(__dirname, "src/libs"),
        "@routes": path.resolve(__dirname, "src/routes"),
        "@themes": path.resolve(__dirname, "src/themes"),
        "@constants": path.resolve(__dirname, "src/constants"),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_API_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },

        "/socket.io": {
          target: env.VITE_API_URL,
          changeOrigin: true,
          ws: true,
        },
      },
      cors: {
        origin: ["*"],
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
      },
      allowedHosts: ["board-api.duckdns.org", "localhost"],
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
      "import.meta.env.BASE_URL_API": JSON.stringify(env.BASE_URL),
      "import.meta.env.PROJECT_ROOT": JSON.stringify(process.cwd()), // Renamed for clarity
      "import.meta.env.GITHUB_CALLBACK_URL": JSON.stringify(
        env.GITHUB_CALLBACK_URL,
      ),
      "import.meta.env.GOOGLE_CALLBACK_URL": JSON.stringify(
        env.GOOGLE_CALLBACK_URL,
      ),
    },
  };
});
