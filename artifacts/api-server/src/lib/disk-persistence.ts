import { promises as fs } from "node:fs";
import path from "node:path";
import { logger } from "./logger";

const ROOT = path.resolve(process.cwd(), ".data");

export async function loadJson<T>(name: string, fallback: T): Promise<T> {
  try {
    const p = path.join(ROOT, name);
    const raw = await fs.readFile(p, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.warn({ name, err: (err as Error).message }, "disk-persistence: load failed");
    }
    return fallback;
  }
}

let writeQueue: Promise<void> = Promise.resolve();
export function saveJson(name: string, data: unknown): void {
  writeQueue = writeQueue
    .then(async () => {
      try {
        await fs.mkdir(ROOT, { recursive: true });
        const p = path.join(ROOT, name);
        const tmp = `${p}.tmp`;
        await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
        await fs.rename(tmp, p);
      } catch (err) {
        logger.warn({ name, err: (err as Error).message }, "disk-persistence: save failed");
      }
    })
    .catch(() => undefined);
}
