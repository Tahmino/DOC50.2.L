import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/DOC50/",
  build: {
    rollupOptions: {
      input: {
        main:    resolve(__dirname, "index.html"),
        anfrage: resolve(__dirname, "anfrage.html"),
      },
    },
  },
});
