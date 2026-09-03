import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function entropyStageRoute() {
  const rewrite = (request: { url?: string }) => {
    if (!request.url) return;
    const [pathname, query] = request.url.split("?", 2);
    if (pathname === "/entropy-stage" || pathname === "/entropy-stage/") {
      request.url = `/entropy-stage/index.html${query ? `?${query}` : ""}`;
    }
  };

  return {
    name: "entropy-stage-route",
    configureServer(server: {
      middlewares: {
        use: (
          handler: (request: { url?: string }, response: unknown, next: () => void) => void,
        ) => void;
      };
    }) {
      server.middlewares.use((request, _response, next) => {
        rewrite(request);
        next();
      });
    },
    configurePreviewServer(server: {
      middlewares: {
        use: (
          handler: (request: { url?: string }, response: unknown, next: () => void) => void,
        ) => void;
      };
    }) {
      server.middlewares.use((request, _response, next) => {
        rewrite(request);
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [entropyStageRoute(), react()],
  base: "./",
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
