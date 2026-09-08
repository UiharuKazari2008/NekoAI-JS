import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  clean: true,
  external: ["fs", "path", "canvas", "node:fs", "node:path"], // Mark Node.js built-ins as external
  noExternal: [
    "jszip",
    "pako",
    "png-chunks-extract",
    "png-chunk-text",
    "exifreader",
    "@msgpack/msgpack",
  ], // Bundle these dependencies
  target: "es2020",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
