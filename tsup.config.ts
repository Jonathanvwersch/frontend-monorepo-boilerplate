import { defineConfig, Options } from "tsup";
import { spawnSync } from "child_process";
import * as glob from "glob";

const env = process.env.NODE_ENV ?? "production";
const tscParams = ["--emitDeclarationOnly", "--incremental"];
const entries = glob.sync("./src/**/*.{ts,tsx}", {
  ignore: "**/*.spec.{ts,tsx}",
});

export default defineConfig((options: Options) => ({
  dts: false,
  onSuccess: async () => {
    const start = Date.now();
    try {
      console.info("Build successful; generating type files...");
      spawnSync(
        "tsc",
        env === "development" ? [...tscParams, "--declarationMap"] : tscParams
      );
      const end = Date.now();
      console.info(
        `Successfully generate type files in ${(end - start) / 1000} seconds`
      );
    } catch (e) {
      const end = Date.now();
      console.error("Failed to generate declaration files:", e.message);
      console.error(`Time taken ${(end - start) / 1000} seconds`);
    }
  },
  entry: entries,
  silent: true,
  clean: options.watch === false,
  treeshake: options.watch === false,
  watch: env === "development",
  format: env === "development" ? ["esm"] : ["esm", "cjs"],
  target: "es2020",
  outDir: "dist",
  minify: options.watch === false,
  bundle: options.watch === false,
  skipNodeModulesBundle: true,
}));
