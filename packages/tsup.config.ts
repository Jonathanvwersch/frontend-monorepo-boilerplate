import { spawnSync } from "child_process";
import { defineConfig } from "tsup";

const env = process.env.NODE_ENV ?? "production";
const entries = ["src/**/*.{ts,tsx}", "!src/**/*.spec.{ts,tsx}"];
const isWatchMode = process.argv.includes("--watch");
const tscParams = ["--emitDeclarationOnly", "--incremental"];

if (isWatchMode) {
  console.info("Watching for package changes...");
} else {
  console.info("Building package...");
}

console.info(`Environment: ${env}`);
console.info("-------------------------------------------");

/**
 * Generate types on success of the build step as opposed to using tsup's built-in
 * type generation tool (activated by setting dts to true) due to limitations with
 * the built-in type generation tool, such as memory leaks.
 *
 * See https://github.com/egoist/tsup/issues/920 for more details.
 *
 * This approach ensures that we have more control over the type generation process
 * and avoid potential issues that might arise from using tsup's built-in feature.
 */
export default defineConfig(() => ({
  dts: false,
  onSuccess: async () => {
    const start = Date.now();
    try {
      if (isWatchMode) {
        console.info("Changes detected; rebuilding...");
      }
      console.info("Build successful");
      console.info("Generating type files...");

      spawnSync(
        "tsc",
        env === "development" ? [...tscParams, "--declarationMap"] : tscParams,
        { stdio: "inherit" }
      );

      const end = Date.now();
      console.info(
        `Successfully generated type files in ${(end - start) / 1000} seconds`
      );
      console.info("Build and type generation completed");

      if (isWatchMode) {
        console.info("-------------------------------------------");
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
  treeshake: env !== "development",
  splitting: env !== "development",
  minify: env !== "development",
  bundle: env !== "development",
  format: env === "development" ? ["esm"] : ["esm", "cjs"],
  skipNodeModulesBundle: true,
  target: "es2020",
  outDir: "dist",
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".js" : ".cjs",
      dts: ".d.ts",
    };
  },
}));
