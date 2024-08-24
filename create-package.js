// @ts-check
import readline from "readline-sync";
import fs from "node:fs/promises";
import path from "path";

const folderName = readline.question(
  "Enter the name of the package. This will be the name of the folder in the packages folder: "
);
const packageName = "@frontend-monorepo/" + folderName;
const packageFolderPath = path.join("packages", folderName);

try {
  await fs.access(packageFolderPath);
  console.error(`Folder ${packageName} already exists`);
  process.exit(1);
} catch (e) {
  // If the folder doesn't exist, fs.access will throw an error and we can proceed
}

const packageJson = {
  name: `@frontend-monorepo/${folderName}`,
  version: "1.0.0",
  sideEffects: false,
  license: "ISC",
  scripts: {
    "ts:type-check": "tsc --noEmit",
    "ts:lint": 'eslint "src/**/*.{js,ts}" --max-warnings=0 --color',
    "ts:lint:fix": "pnpm run ts:lint -- --fix",
    test: 'echo "Error: no test specified" && exit 1',
    build: "tsup",
    "build:packages": "pnpm run build",
    "build:packages:dev": "NODE_ENV=development pnpm run build",
    dev: "NODE_ENV=development node ../watch.js",
  },
  exports: {
    "./*": {
      import: {
        types: "./dist/dts/*.d.ts",
        default: "./dist/*.js",
      },
    },
  },
};

const tsconfig = {
  compilerOptions: {
    declarationDir: "dist/dts",
    baseUrl: "./",
    outDir: "dist",
    rootDir: "src",
  },
  extends: "../../tsconfig.json",
  include: ["src/*"],
};

const tsupConfig = `
import tsupConfig from "../tsup.config";
import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  ...tsupConfig(options),
}));
`;

const readMeContent = `<h1 align="center">${packageName}</h1>`;

const exampleFileContent = `const hello = "world";`;

try {
  console.info("Creating your new package...");

  await fs.mkdir(path.join(packageFolderPath, "src"), { recursive: true });

  await fs.writeFile(
    path.join(packageFolderPath, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );
  await fs.writeFile(
    path.join(packageFolderPath, "src/example.ts"),
    exampleFileContent
  );
  await fs.writeFile(
    path.join(packageFolderPath, "tsconfig.json"),
    JSON.stringify(tsconfig, null, 2)
  );
  await fs.writeFile(
    path.join(packageFolderPath, "tsup.config.js"),
    tsupConfig
  );
  await fs.writeFile(path.join(packageFolderPath, "README.md"), readMeContent);

  console.info("Successfully created package");
} catch (e) {
  console.error("Error creating package");
  console.error(e);
}
