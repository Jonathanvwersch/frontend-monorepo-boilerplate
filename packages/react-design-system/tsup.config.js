import tsupConfig from "../tsup.config";
import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  ...tsupConfig(options),
}));
