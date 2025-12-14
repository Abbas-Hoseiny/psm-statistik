// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://abbas-hoseiny.github.io",
  base: "/psm-statistik",
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
