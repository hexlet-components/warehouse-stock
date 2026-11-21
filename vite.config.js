import { defineConfig } from "vite";
import { readFile } from "node:fs/promises";

const release = process.env.RELEASE_ID ?? "A";
const configure = (server) => {
  server.middlewares.use(async (request, response, next) => {
    if (request.url?.split("?")[0]?.endsWith("/app-config.json")) {
      try {
        const config = await readFile(new URL("./app-config.json", import.meta.url), "utf8");
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Cache-Control", "no-cache");
        response.end(config);
      } catch (error) {
        next(error);
      }
      return;
    }
    next();
  });
};

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  define: { __APP_VERSION__: JSON.stringify(release) },
  build: { sourcemap: process.env.SOURCEMAP === "true", assetsInlineLimit: 0 },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:8081" },
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:8081" },
  },
  plugins: [
    {
      name: "catalog-example",
      configureServer: configure,
      configurePreviewServer: configure,
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "release.json",
          source: JSON.stringify({ release }),
        });
      },
    },
  ],
});
