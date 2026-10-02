import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const rawPort = process.env.PORT;

// Artifacts are served at the root. BASE_PATH is still read from the managed
// service so local builds and published builds use the same URL contract.
const basePath = process.env.BASE_PATH?.trim() || "/";

export default defineConfig(({ command, isPreview }) => {
  const requiresPort = command !== "build";
  if (requiresPort && !rawPort) {
    throw new Error("PORT environment variable is required.");
  }
  const port = rawPort ? Number(rawPort) : undefined;
  if (rawPort && (!Number.isInteger(port) || port <= 0 || port > 65535)) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  return {
    root,
    base: basePath,
    server: {
      host: "0.0.0.0",
      port,
      strictPort: true,
      allowedHosts: true,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
    preview: {
      host: "0.0.0.0",
      port,
      strictPort: true,
      allowedHosts: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(root, "src"),
      },
      dedupe: ["react", "react-dom"],
    },
    plugins: [
      tailwindcss(),
      tanstackStart(),
      ...(command === "build" || isPreview
        ? [
            nitro({
              // The artifact production service runs the generated Node server,
              // rather than serving an SPA fallback. No old platform middleware
              // is auto-registered here.
              preset: "node-server",
              // Hashed `/assets/**` are already immutable. Everything else under
              // `public/` was served without a max-age, so browsers revalidated
              // product photos, the logo and crawler files on every visit. The
              // photo URLs carry a `?v=` version, so a week is safe; crawler
              // files regenerate on each publish, so keep them to an hour.
              routeRules: {
                "/product-images/**": { headers: { "cache-control": "public, max-age=604800, stale-while-revalidate=86400" } },
                "/brand/**": { headers: { "cache-control": "public, max-age=604800, stale-while-revalidate=86400" } },
                "/og/**": { headers: { "cache-control": "public, max-age=86400" } },
                "/ads/**": { headers: { "cache-control": "public, max-age=86400" } },
                "/coa/**": { headers: { "cache-control": "public, max-age=3600" } },
                "/favicon.svg": { headers: { "cache-control": "public, max-age=86400" } },
                "/favicon.png": { headers: { "cache-control": "public, max-age=86400" } },
                "/robots.txt": { headers: { "cache-control": "public, max-age=3600" } },
                "/sitemap.xml": { headers: { "cache-control": "public, max-age=3600" } },
                "/llms.txt": { headers: { "cache-control": "public, max-age=3600" } },
              },
            }),
          ]
        : []),
      viteReact(),
    ],
  };
});