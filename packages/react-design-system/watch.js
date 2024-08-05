import chokidar from "chokidar";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

const cwd = process.cwd(); // Get the current working directory
const srcDir = path.join(cwd, "src");
const outDir = path.join(cwd, "dist");
const dtsDir = path.join(outDir, "dts");
const tsBuildInfoPath = path.join(cwd, ".tsbuildinfo");

console.log("Starting watch mode...");

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
    console.log("Terminating previous tsup process...");
    tsupProcess.kill();
  }

  console.log("Starting tsup in watch mode...");
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
    console.log(`Removed ${dtsFilePath}`);
    await fs.unlink(dtsMapPath).catch(() => {});
    console.log(`Removed ${dtsMapPath}`);
    await fs.unlink(jsPath);
    console.log(`Removed ${jsPath}`);
    await fs.unlink(jsMapPath).catch(() => {});
    console.log(`Removed ${jsMapPath}`);
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
  console.log("Regenerating all type definitions...");
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
      console.log("Type generation completed successfully");
    } else {
      console.error(`Type generation failed with code ${code}`);
    }
  });
}

watcher
  .on("add", (filePath) => {
    console.log(`File ${filePath} has been added`);
    debounceAction(() => {
      runTsc();
      startTsup();
    }, "Regenerating types and restarting tsup due to file addition");
  })
  .on("unlink", (filePath) => {
    console.log(`File ${filePath} has been removed`);
    smartClean(filePath);
    debounceAction(() => {
      runTsc();
      startTsup();
    }, "Regenerating types and restarting tsup due to file deletion");
  })
  .on("change", (filePath) => {
    console.log(`File ${filePath} has been changed`);
  })
  .on("ready", () => {
    console.log("Initial scan complete. Ready for changes");
  });

console.log(`Watching ${srcDir} for changes...`);

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
