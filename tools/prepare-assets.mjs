import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = path.join(root, "public/vendor");
await mkdir(destination, { recursive: true });

for (const file of ["sql-wasm.js", "sql-wasm.wasm"]) {
  await copyFile(path.join(root, "node_modules/sql.js/dist", file), path.join(destination, file));
}

const lock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
const licenses = ["shadcn/ui\n" + await readFile(path.join(root, "licenses/shadcn-ui.txt"), "utf8")];
for (const [directory, entry] of Object.entries(lock.packages)) {
  if (!directory || entry.dev) continue;
  const packagePath = path.join(root, directory);
  // Optional platform binaries may be absent on this machine.
  const files = await readdir(packagePath).catch((error) => {
    if (error.code === "ENOENT" && entry.optional) return [];
    throw error;
  });
  const notices = files.filter((file) => /^(licen[cs]e|copying|notice)(\.|$)/i.test(file));
  for (const notice of notices) {
    const text = await readFile(path.join(packagePath, notice), "utf8");
    licenses.push(`${directory.replace(/^node_modules\//, "")} ${entry.version}\n${text}`);
  }
}
await writeFile(path.join(destination, "LICENSES.txt"), licenses.join("\n\n---\n\n"));
