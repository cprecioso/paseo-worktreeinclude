import { execFile } from "node:child_process";
import { constants, existsSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const INCLUDE_FILE = ".worktreeinclude";

export type CopyResult =
  | { kind: "not-a-worktree" }
  | { kind: "no-include-file" }
  | { kind: "copied"; copied: string[]; skipped: string[] };

async function git(cwd: string, args: string[], input?: string): Promise<string> {
  const child = exec("git", args, { cwd, maxBuffer: 64 * 1024 * 1024 });
  if (input !== undefined) {
    child.child.stdin?.end(input);
  }
  const { stdout } = await child;
  return stdout;
}

async function gitAllowExit1(cwd: string, args: string[], input: string): Promise<string> {
  try {
    return await git(cwd, args, input);
  } catch (error) {
    // `git check-ignore` exits 1 when nothing matched.
    if ((error as { code?: number }).code === 1) return "";
    throw error;
  }
}

// Returns the main checkout for a linked worktree, or null for a main checkout / non-git dir.
async function sourceCheckoutOf(worktree: string): Promise<string | null> {
  let out: string;
  try {
    out = await git(worktree, ["rev-parse", "--path-format=absolute", "--git-dir", "--git-common-dir"]);
  } catch {
    return null;
  }
  const [gitDir, commonDir] = out.trim().split("\n");
  if (!gitDir || !commonDir || resolve(gitDir) === resolve(commonDir)) return null;
  return dirname(resolve(commonDir));
}

const splitNul = (s: string) => s.split("\0").filter(Boolean);

// Same semantics as Claude Code: copy files that match .worktreeinclude (gitignore syntax)
// AND are gitignored, so tracked files are never touched.
export async function copyWorktreeIncludes(worktree: string): Promise<CopyResult> {
  const source = await sourceCheckoutOf(worktree);
  if (!source) return { kind: "not-a-worktree" };
  if (!existsSync(join(source, INCLUDE_FILE))) return { kind: "no-include-file" };

  const matches = splitNul(
    await git(source, ["ls-files", "--others", "--ignored", `--exclude-from=${INCLUDE_FILE}`, "-z"]),
  );
  if (matches.length === 0) return { kind: "copied", copied: [], skipped: [] };

  const ignored = splitNul(
    await gitAllowExit1(source, ["check-ignore", "--stdin", "-z"], matches.join("\0") + "\0"),
  );

  const copied: string[] = [];
  const skipped: string[] = [];
  for (const file of ignored) {
    const dest = join(worktree, file);
    if (existsSync(dest)) {
      skipped.push(file);
      continue;
    }
    await mkdir(dirname(dest), { recursive: true });
    // Clone (APFS/btrfs copy-on-write) when supported, else fall back to a regular copy.
    await copyFile(join(source, file), dest, constants.COPYFILE_FICLONE);
    copied.push(file);
  }
  return { kind: "copied", copied, skipped };
}
