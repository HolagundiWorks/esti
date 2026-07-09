/** Copy the sealed CPWD pack from ese/ into public/ for offline fetch. */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../../ese/packs/cpwd-2021.pack.json");
const dest = resolve(here, "../public/packs/cpwd-2021.pack.json");

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log("Copied CPWD pack → estimate/public/packs/cpwd-2021.pack.json");
