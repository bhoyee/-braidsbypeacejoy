import "server-only";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Email / WhatsApp settings read straight from the app's .env file, exactly as written.
//
// Why not just process.env? Next.js loads .env with variable expansion, so a "$" inside
// a value is treated as a reference to another variable ("Pa$$w0rd!" arrives as "Pa$!"),
// and an unquoted "#" starts a comment. cPanel-generated mailbox passwords often contain
// these characters, which made SMTP fail with "535 Incorrect authentication data".
// Reading the file also means a changed password works without restarting the app.

const ENV_FILE = () => join(process.cwd(), ".env");
let cache: { mtime: number; values: Record<string, string> } | null = null;

function fileValues(): Record<string, string> {
  try {
    const mtime = statSync(ENV_FILE()).mtimeMs;
    if (cache?.mtime === mtime) return cache.values;
    const values: Record<string, string> = {};
    for (const line of readFileSync(ENV_FILE(), "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      let v = m[2];
      const q = v[0];
      if ((q === '"' || q === "'") && v.length >= 2 && v.endsWith(q)) {
        v = v.slice(1, -1);
        if (q === '"') v = v.replace(/\\\$/g, "$"); // someone may have escaped $ as \$
      } else {
        v = v.replace(/\s+#.*$/, ""); // unquoted: " # comment" at the end
      }
      values[m[1]] = v;
    }
    cache = { mtime, values };
    return values;
  } catch {
    return {}; // no .env file (e.g. settings come from the hosting panel) → use process.env
  }
}

/** A setting exactly as written in .env (falls back to the process environment). */
export function secret(key: string): string | undefined {
  const v = fileValues()[key] ?? process.env[key];
  return v?.trim() ? v.trim() : undefined;
}

/** For the Alerts check page: does the app's environment hold a different value than the file? */
export function mangledByEnvLoader(key: string): boolean {
  const raw = fileValues()[key];
  return raw !== undefined && process.env[key] !== undefined && raw !== process.env[key];
}

/** When .env was last saved (null if there is no file). */
export function envFileChangedAt(): Date | null {
  try {
    return new Date(statSync(ENV_FILE()).mtimeMs);
  } catch {
    return null;
  }
}
