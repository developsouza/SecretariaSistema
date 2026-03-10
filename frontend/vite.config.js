import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
        port: 3000,
        proxy: {
            "/api": { target: "http://localhost:3001", changeOrigin: true },
            "/uploads": { target: "http://localhost:3001", changeOrigin: true },
        },
    },
    build: {
        sourcemap: false,
        chunkSizeWarningLimit: 1200,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ["react", "react-dom", "react-router-dom"],
                    charts: ["recharts"],
                    stripe: ["@stripe/stripe-js"],
                    forms: ["react-hook-form"],
                    query: ["@tanstack/react-query"],
                },
            },
        },
    },
});
