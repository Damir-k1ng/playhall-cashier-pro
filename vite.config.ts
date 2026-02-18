import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.jpg", "favicon.ico"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,svg,woff2}"],
      },
      manifest: {
        name: "PlayStation club SVOY — Касса",
        short_name: "SVOY Касса",
        description: "Система кассы PlayStation клуба SVOY",
        theme_color: "#2563eb",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "/logo.jpg",
            sizes: "192x192",
            type: "image/jpeg",
          },
          {
            src: "/logo.jpg",
            sizes: "512x512",
            type: "image/jpeg",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
