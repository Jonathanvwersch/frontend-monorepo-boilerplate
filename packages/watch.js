/**
 * We use a custom watch script on top of tsup's built in watcher for handle
 * transpilation and type generation due to limitations in tsup's watch mode.
 *
 * Tsup's main limitations in watch mode are that it does not transpile and generate types for newly added
 * files, deleted files, or files that have been renamed as these files were not included
 * in the initial build. See {@link https://github.com/egoist/tsup/issues/902} for more details.
 * You can also check out the tsup source code for more information: {@link https://github.com/egoist/tsup/blob/e9ee08314ea4231c907e2cc3840b8e4dd543f1b7/src/index.ts#L365}
 *
 * This script runs tsup watch. If a file has changed then it simply uses tsup's in built watcher
 * but if a file has been added or deleted then it restarts the tsup process to include the new files
 * within tsup's files to watch. It will also clean up the dist folder to remove any deleted files.
 *
 */
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { watch } from "chokidar";

const cwd = process.cwd();
const srcDir = path.join(cwd, "src");
const outDir = path.join(cwd, "dist");
const dtsDir = path.join(outDir, "dts");

console.log(
  `Watching package for changes in ${process.env.NODE_ENV.toUpperCase()} mode...`
);
console.log("-------------------------------------------");

let tsupProcess = null;

function startTsup() {
  if (tsupProcess) tsupProcess.kill();
  tsupProcess = spawn("tsup", ["src/**/*.ts", "src/**/*.tsx", "--watch"], {
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
    env: { ...process.env, NODE_ENV: "development" },
  });

  tsupProcess.stdout.on("data", (data) => process.stdout.write(data));
  tsupProcess.stderr.on("data", (data) => {
    const errorString = data.toString();
    if (
      !errorString.includes("cannot be marked as external") &&
      !errorString.includes("ESM Build failed")
    ) {
      process.stderr.write(data);
    }
  });
  tsupProcess.on("close", (code) => {
    if (code !== null && code !== 0 && !tsupProcess.killed)
      console.error(`tsup process exited with code ${code}`);
    tsupProcess = null;
  });
}

async function smartClean(filePath) {
  const relativePath = path.relative(srcDir, filePath);
  const baseFilePath = path.join(
    outDir,
    relativePath.replace(/\.(ts|tsx)$/, "")
  );
  const dtsFilePath = path.join(
    dtsDir,
    relativePath.replace(/\.(ts|tsx)$/, ".d.ts")
  );
  const dtsMapPath = `${dtsFilePath}.map`;
  const jsPath = `${baseFilePath}.js`;
  const jsMapPath = `${jsPath}.map`;

  try {
    await Promise.all([
      fs.unlink(dtsFilePath).catch(() => {}),
      fs.unlink(dtsMapPath).catch(() => {}),
      fs.unlink(jsPath).catch(() => {}),
      fs.unlink(jsMapPath).catch(() => {}),
    ]);
  } catch (error) {
    if (error.code !== "ENOENT")
      console.error(`Error removing ${filePath}:`, error);
  }
}

startTsup();

const watcher = watch(srcDir, {
  ignored: /node_modules|dist/,
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
});

let debounceTimer;
function debounceAction(action) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(action, 300);
}

watcher
  .on("add", (filePath) => {
    smartClean(filePath);
    debounceAction(startTsup);
  })
  .on("unlink", (filePath) => {
    smartClean(filePath);
    debounceAction(startTsup);
  });

process.on("SIGINT", () => {
  console.log("Received SIGINT. Cleaning up and exiting...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM. Cleaning up and exiting...");
  process.exit(0);
});
