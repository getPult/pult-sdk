import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    db: "src/db.ts",
    auth: "src/auth.ts",
    realtime: "src/realtime.ts",
    redis: "src/redis.ts",
    queue: "src/queue.ts",
    react: "src/react/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  target: "es2020",
  splitting: true,
})
