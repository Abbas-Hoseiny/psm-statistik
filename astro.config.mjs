// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://st.digitale-psm.de",
  integrations: [sitemap()],
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
