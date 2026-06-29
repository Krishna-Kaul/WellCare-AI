import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import fs from "fs";

export default defineConfig({
  vite: {
    server: {
      https: {
        key: fs.readFileSync("./192.168.1.11+2-key.pem"),
        cert: fs.readFileSync("./192.168.1.11+2.pem"),
      },
      proxy: {
        "/api": {
          target: "http://localhost:8000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  },
});