/* eslint-env node */
/**
 * Watch script to extend tsup's watch mode
 *
 * The script runs in conjunction with tsup's watch mode, and is responsible for dealing with its limitations
 * It adds the following features:
 * - Reconciliation of src and dist directories when the watcher is killed
 * - Restarting of tsup when files and directories are added, so they can be watched
 * - Cleanup of type generation cache after the build is complete
 *
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { watch } from "chokidar";

const cwd = process.cwd();
const srcDir = path.join(cwd, "src");
const distDir = path.join(cwd, "dist");
const tsBuildInfoDir = path.join(cwd, ".tsbuildinfo");

console.info("Watching for package changes...");
console.info(`Environment: development`);
console.info("-------------------------------------------");

let tsupProcess = null;

function startTsup() {
  tsupProcess?.kill();
  tsupProcess = spawn("tsup", ["--watch"], {
    stdio: "pipe",
    shell: true,
    env: { ...process.env, NODE_ENV: "development" },
  });
  tsupProcess.on("close", (code) => {
    if (code && !tsupProcess.killed) {
      console.error(`tsup process exited with code ${code}`);
    }
    tsupProcess = null;
  });
}

async function reconcileSrcAndDist() {
  // we reconcile the src and dist files after killing the wacther
  // the src and dist can differ if we delete files or directories from the src
  // we do not reconcile while the watcher is running as deleting files from the dist,
  // even if they are deleted from the src, can lead to build issues; for instance, those
  // dist files might be included in the build cache for your app (as they are in nextjs),
  // and if they suddenly go missing, nextjs (or other apps) will error out
  await reconcileDirectories(srcDir, distDir);
}

async function reconcileDirectories(srcDir, distDir) {
  try {
    // Read the contents of both src and dist directories
    const [srcEntries, distEntries] = await Promise.all([
      fs.readdir(srcDir, { withFileTypes: true }),
      fs.readdir(distDir, { withFileTypes: true }).catch(() => []),
    ]);

    // Create maps for quick lookup of entries in src and dist
    const srcMap = new Map(srcEntries.map((entry) => [entry.name, entry]));
    const distMap = new Map(distEntries.map((entry) => [entry.name, entry]));

    // Iterate through all entries in the dist directory
    for (const [name, distEntry] of distMap) {
      const distPath = path.join(distDir, name);

      if (distEntry.isDirectory()) {
        // If it's a directory, check if it exists in src
        const srcEntry = srcMap.get(name);
        if (srcEntry && srcEntry.isDirectory()) {
          // If it exists in src, recursively reconcile its contents
          await reconcileDirectories(path.join(srcDir, name), distPath);
        } else {
          // If it doesn't exist in src, remove the entire directory from dist
          await removeDir(distPath);
        }
      } else if (distEntry.isFile()) {
        // If it's a file, check for corresponding source file
        const baseName = path.basename(name, path.extname(name)).split(".")[0];
        const srcFile =
          srcMap.get(`${baseName}.ts`) || srcMap.get(`${baseName}.tsx`);

        if (!srcFile) {
          // If no corresponding source file exists, remove the dist file
          await removeFile(distPath);
        }
      }
    }
  } catch (error) {
    console.error("Error during reconciliation:", error);
  }
}

async function removeFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== "ENOENT") {
      // Log error if file deletion fails (ignore if file doesn't exist)
      console.error(`Error removing file ${filePath}:`, err);
    }
  }
}

async function removeDir(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (err) {
    console.error(`Error removing directory ${dirPath}:`, err);
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
  .on("addDir", () =>
    debounceAction(() => {
      cleanUpTsbuild();
      startTsup();
    }, "Restarting tsup due to directory addition")
  )
  .on("unlink", () => {
    debounceAction(() => {
      cleanUpTsbuild();
      startTsup();
    }, "Restarting tsup due to file deletion");
  })
  .on("unlinkDir", () =>
    debounceAction(() => {
      cleanUpTsbuild();
      startTsup();
    }, "Restarting tsup due to directory deletion")
  )
  .on("error", (error) => console.error(`Watcher error: ${error}`));

function cleanUpTsbuild() {
  fs.unlink(tsBuildInfoDir).catch(() => {});
}

process.on("SIGINT", async () => {
  await reconcileSrcAndDist();
  cleanUpTsbuild();
  console.info("Received SIGINT. Cleaning up and exiting...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await reconcileSrcAndDist();
  cleanUpTsbuild();
  console.info("Received SIGTERM. Cleaning up and exiting...");
  process.exit(0);
});
