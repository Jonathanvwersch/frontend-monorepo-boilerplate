import { Options, defineConfig } from "tsup";
import tsupConfig from "../../tsup.config";

export default defineConfig((_: Options) => ({
  ...tsupConfig,
}));
