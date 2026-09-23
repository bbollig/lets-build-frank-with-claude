import { readFileSync } from "node:fs";
import path from "node:path";
import { packageRoot } from "./config.js";

// package.json is the single source of Frank's version. The Dockerfile copies
// it into the runtime image next to dist/, so this works there too.
const pkg = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8")) as { version: string };

export const version: string = pkg.version;
