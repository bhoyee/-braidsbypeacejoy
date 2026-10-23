// Next/Turbopack keeps server-external packages (e.g. @prisma/client) under
// .next/node_modules/<name>-<hash>. On Linux these are symlinks into node_modules;
// on Windows they can be full copies (including OS-specific engines).
// For a release we always want relative symlinks, so the server uses the packages
// it installed itself (with the right Prisma engine for its OS).
//
//   node deploy/link-next-externals.mjs <path-to-.next>
import { existsSync, lstatSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { join, relative } from "node:path";

const nextDir = process.argv[2] ?? ".next";
const root = join(nextDir, "node_modules");
if (!existsSync(root)) process.exit(0);

const entries = [];
for (const name of readdirSync(root)) {
  if (name.startsWith("@")) for (const sub of readdirSync(join(root, name))) entries.push(`${name}/${sub}`);
  else entries.push(name);
}

for (const entry of entries) {
  const pkg = entry.replace(/-[0-9a-f]{8,}$/, ""); // strip Turbopack's hash suffix
  const linkPath = join(root, entry);
  // From .next/node_modules/<entry> back to <app>/node_modules/<pkg>
  const target = relative(join(linkPath, ".."), join(nextDir, "..", "node_modules", pkg)).replaceAll("\\", "/");
  // Always recreate: an existing link may be absolute (pointing into the CI machine).
  const was = lstatSync(linkPath).isSymbolicLink() ? "relinked" : "replaced copy";
  rmSync(linkPath, { recursive: true, force: true });
  symlinkSync(target, linkPath, "dir");
  console.log(`${was}: ${entry} -> ${target}`);
}
