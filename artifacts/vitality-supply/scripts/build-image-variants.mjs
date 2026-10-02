import { mkdir, readdir, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { spawn } from "node:child_process";

const sourceDir = new URL("../public/product-images/", import.meta.url);
const outputDir = new URL("../public/product-images/w400/", import.meta.url);

await mkdir(outputDir, { recursive: true });
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const files = (await readdir(sourceDir))
  .filter((name) => name.endsWith(".webp"))
  .sort();

for (const name of files) {
  const input = join(sourceDir.pathname, basename(name));
  const output = join(outputDir.pathname, basename(name));
  await new Promise((resolve, reject) => {
    const child = spawn(
      "magick",
      [
        input,
        "-auto-orient",
        "-resize",
        "400x500>",
        "-gravity",
        "center",
        "-background",
        "black",
        "-extent",
        "400x500",
        "-strip",
        "-quality",
        "80",
        output,
      ],
      { stdio: "inherit" },
    );
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`magick exited with status ${code}`)),
    );
  });
}

console.log(`Generated ${files.length} 400x500 WebP variants.`);