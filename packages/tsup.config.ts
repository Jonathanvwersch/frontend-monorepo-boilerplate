import { defineConfig, Options } from "tsup";
import { spawnSync } from "child_process";

const env = process.env.NODE_ENV ?? "production";
const tscParams = ["--emitDeclarationOnly", "--incremental"];
const entries = ["src/**/*.{ts,tsx}", "!src/**/*.spec.{ts,tsx}"];

const isWatchMode = process.argv.includes("--watch");

if (!isWatchMode) {
  console.log(`Building package in ${env.toUpperCase()} mode...`);
}

export default defineConfig((_: Options) => ({
  dts: false,
  onSuccess: async () => {
    const start = Date.now();
    try {
      console.log("Build successful");
      console.log("Generating type files...");

      spawnSync(
        "tsc",
        env === "development" ? [...tscParams, "--declarationMap"] : tscParams,
        { stdio: "inherit" }
      );
      const end = Date.now();

      console.log(
        `Successfully generated type files in ${(end - start) / 1000} seconds`
      );
      console.log("Build and type generation completed");

      if (isWatchMode) {
        console.log("-------------------------------------------");
      }
    } catch (e) {
      const end = Date.now();
      console.error(`Time taken ${(end - start) / 1000} seconds`);
      if (e instanceof Error) {
        console.error(`Failed to generate declaration files: ${e.message}`);
      } else {
        console.error("Failed to generate declaration files:", e);
      }
    }
  },
  entry: entries,
  silent: true,
  clean: !isWatchMode,
  treeshake: env === "development",
  format: env === "development" ? ["esm"] : ["esm", "cjs"],
  target: "es2020",
  outDir: "dist",
  minify: env === "development",
  bundle: env === "development",
  skipNodeModulesBundle: true,
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".js" : ".cjs",
      dts: ".d.ts",
    };
  },
}));
