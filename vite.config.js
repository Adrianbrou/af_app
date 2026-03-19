import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: true },
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "AF_APP - Workout Tracker",
        short_name: "AF_APP",
        description: "Adrian Fit Workout Tracker PWA",
        theme_color: "#000000",
        background_color: "#0a0a0a",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  // 👇 This part fixes the “@” imports issue
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/jspdf") || id.includes("node_modules/html2canvas")) return "pdf";
          if (id.includes("node_modules/recharts")) return "charts";
          if (id.includes("node_modules/@supabase")) return "supabase";
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router-dom")) return "react";
        },
      },
    },
  },
});
