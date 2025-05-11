import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  clean: true,
  external: ["fs", "path", "canvas"], // Mark Node.js built-ins as external
  noExternal: ["jszip"], // 👈 THIS tells tsup to force-bundle `jszip`
  target: "es2020",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
