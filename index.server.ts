import type { PluginServerContext } from "@getpaseo/plugin/server";
import { copyWorktreeIncludes } from "./server/copy";

export default function contribute(server: PluginServerContext) {
  server.on("workspace.created", async ({ workspace }) => {
    const result = await copyWorktreeIncludes(workspace.cwd);
    if (result.kind === "copied") {
      console.log(
        `[worktreeinclude] ${workspace.cwd}: copied ${result.copied.length}, skipped ${result.skipped.length} existing`,
      );
    }
  });
  return () => {};
}
