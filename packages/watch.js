/* eslint-env node */
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { watch } from "chokidar";

const cwd = process.cwd();
const srcDir = path.join(cwd, "src");
const tsBuildInfoDir = path.join(cwd, ".tsbuildinfo");
const outDir = path.join(cwd, "dist");
const dtsDir = path.join(outDir, "dts");
const env = process.env.NODE_ENV ?? "production";

console.info("Watching for package changes...");
console.info(`Environment: ${env}`);
console.info("-------------------------------------------");

let tsupProcess = null;

function startTsup() {
  if (tsupProcess) tsupProcess.kill();
  tsupProcess = spawn("tsup", ["--watch"], {
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
    )
      process.stderr.write(data);
  });
  tsupProcess.on("close", (code) => {
    if (code !== null && code !== 0 && !tsupProcess.killed)
      console.error(`tsup process exited with code ${code}`);
    tsupProcess = null;
  });
}

async function smartClean(filePath) {
  const outFullPath = path.join(outDir, filePath);
  const dtsFullPath = path.join(dtsDir, filePath);

  try {
    const stats = await fs.stat(outFullPath).catch(() => null);

    if (stats && stats.isDirectory()) {
      await fs
        .rm(outFullPath, { recursive: true, force: true })
        .catch(() => {});
      await fs
        .rm(dtsFullPath, { recursive: true, force: true })
        .catch(() => {});
    } else {
      const baseFilePath = outFullPath.replace(/\.(ts|tsx)$/, "");
      const dtsFilePath = dtsFullPath.replace(/\.(ts|tsx)$/, ".d.ts");
      const dtsMapPath = `${dtsFilePath}.map`;
      const jsPath = `${baseFilePath}.js`;

      await Promise.all([
        fs.unlink(dtsFilePath).catch(() => {}),
        fs.unlink(dtsMapPath).catch(() => {}),
        fs.unlink(jsPath).catch(() => {}),
      ]);
    }

    await removeEmptyDirectories(path.dirname(outFullPath));
    await removeEmptyDirectories(path.dirname(dtsFullPath));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`Error removing ${filePath}:`, error);
    }
  }
}

async function removeEmptyDirectories(dir) {
  let currentDir = dir;
  while (currentDir !== outDir && currentDir !== dtsDir) {
    try {
      const files = await fs.readdir(currentDir);
      if (files.length > 0) break;
      await fs.rmdir(currentDir);
      currentDir = path.dirname(currentDir);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error(`Error removing directory ${currentDir}:`, error);
      }
      break;
    }
  }
}

startTsup();

const watcher = watch(["**/*.{ts,tsx}", "**/.*", "**/*/", "!node_modules/**"], {
  cwd: srcDir,
  persistent: true,
  ignoreInitial: true,
  alwaysStat: true,
  awaitWriteFinish: {
    stabilityThreshold: 200,
    pollInterval: 100,
  },
});

let debounceActionId;
function debounceAction(action, reason) {
  clearTimeout(debounceActionId);
  debounceActionId = setTimeout(() => {
    console.info(reason);
    console.info("-------------------------------------------");
    action();
  }, 500);
}

watcher
  .on("add", () => {
    debounceAction(() => {
      cleanUpTsbuild();
      startTsup();
    }, "Restarting tsup due to file addition");
  })
  .on("unlink", (dirPath) =>
    debounceAction(() => {
      smartClean(dirPath);
      cleanUpTsbuild();
    }, "File deleted; dist will be cleaned up")
  )
  .on("unlinkDir", (dirPath) =>
    debounceAction(() => {
      smartClean(dirPath);
      cleanUpTsbuild();
    }, "Directory deleted; dist will be cleaned up")
  )
  .on("addDir", () =>
    debounceAction(() => {
      cleanUpTsbuild();
      startTsup();
    }, "Restarting tsup due to directory addition")
  )
  .on("error", (error) => console.error(`Watcher error: ${error}`));

function cleanUpTsbuild() {
  fs.unlink(tsBuildInfoDir).catch(() => {});
}

process.on("SIGINT", async () => {
  cleanUpTsbuild();
  console.info("Received SIGINT. Cleaning up and exiting...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  cleanUpTsbuild();
  console.info("Received SIGTERM. Cleaning up and exiting...");
  process.exit(0);
});
