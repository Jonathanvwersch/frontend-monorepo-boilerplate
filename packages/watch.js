// we use a custom watch script to handle the watch mode
// instead of tsup's built-in watch mode
// because of various issues with the built-in watch mode
// for instance, if you delete, add or rename a file, the watch mode will not detect the change

import chokidar from "chokidar";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

const cwd = process.cwd();
const srcDir = path.join(cwd, "src");
const outDir = path.join(cwd, "dist");
const dtsDir = path.join(outDir, "dts");
const tsBuildInfoPath = path.join(cwd, ".tsbuildinfo");

console.log(
  `Watching package for changes in ${process.env.NODE_ENV.toUpperCase()} mode...`
);
console.log("-------------------------------------------");

let tsupProcess = null;

async function cleanUp() {
  try {
    await fs.rm(tsBuildInfoPath, { force: true });
    console.log("Cleaned up .tsbuildinfo");
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}

async function startTsup() {
  if (tsupProcess) {
    tsupProcess.kill();
  }

  tsupProcess = spawn("tsup", ["src/**/*.ts", "--watch"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, NODE_ENV: "development" },
  });

  tsupProcess.on("close", (code) => {
    if (code !== null && code !== 0) {
      console.error(`tsup process exited with code ${code}`);
    }
  });
}

async function smartClean(filePath) {
  const relativePath = path.relative(srcDir, filePath);
  const baseFilePath = path.join(outDir, relativePath.replace(/\.ts$/, ""));
  const dtsFilePath = path.join(dtsDir, relativePath.replace(/\.ts$/, ".d.ts"));
  const dtsMapPath = `${dtsFilePath}.map`;
  const jsPath = `${baseFilePath}.js`;
  const jsMapPath = `${jsPath}.map`;

  try {
    await fs.unlink(dtsFilePath);
    await fs.unlink(dtsMapPath).catch(() => {});
    await fs.unlink(jsPath);
    await fs.unlink(jsMapPath).catch(() => {});
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`Error removing ${dtsFilePath}:`, error);
    }
  }
}

startTsup();

const watcher = chokidar.watch(srcDir, {
  ignored: /(^|[\/\\])\../,
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 200,
    pollInterval: 100,
  },
});

let debounceTimer;
function debounceAction(action, reason) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    console.log(`${reason}...`);
    action();
  }, 300);
}

function runTsc() {
  const tscProcess = spawn(
    "tsc",
    [
      "--emitDeclarationOnly",
      "--declaration",
      "--declarationMap",
      "--outDir",
      dtsDir,
    ],
    {
      stdio: "inherit",
      shell: true,
    }
  );

  tscProcess.on("close", (code) => {
    if (code === 0) {
    } else {
      console.error(`Type generation failed with code ${code}`);
    }
  });
}

watcher
  .on("add", (filePath) => {
    debounceAction(() => {
      runTsc();
      startTsup();
    }, "Regenerating types and restarting tsup due to file addition");
  })
  .on("unlink", (filePath) => {
    smartClean(filePath);
    debounceAction(() => {
      runTsc();
      startTsup();
    }, "Regenerating types and restarting tsup due to file deletion");
  });

process.on("SIGINT", async () => {
  console.log("Received SIGINT. Cleaning up and exiting...");
  await cleanUp();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Cleaning up and exiting...");
  await cleanUp();
  process.exit(0);
});
