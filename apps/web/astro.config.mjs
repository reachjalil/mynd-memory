import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://myndmemory.com",
  output: "server",
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  devToolbar: {
    enabled: false,
  },
  integrations: [react()],
  vite: {
    cacheDir: "../../node_modules/.vite/mynd-memory-web",
    optimizeDeps: {
      include: [
        "@ai-sdk/gateway",
        "@ai-sdk/google",
        "@ai-sdk/openai",
        "ai",
        "lucide-react",
        "recharts",
      ],
    },
    plugins: [tailwindcss()],
  },
});
