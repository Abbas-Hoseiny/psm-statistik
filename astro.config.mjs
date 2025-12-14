// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://st.digitale-psm.de",
  // Kein base path nötig bei Custom Domain!
  vite: {
    optimizeDeps: {
      exclude: ["sql.js"],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            echarts: ["echarts"],
            sqljs: ["sql.js"],
          },
        },
      },
    },
  },
});
