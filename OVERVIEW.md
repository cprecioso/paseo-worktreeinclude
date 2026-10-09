Copies gitignored files such as `.env` into new git worktrees, the same way Claude Code does. List the files in a `.worktreeinclude` file at the root of your main checkout, and every workspace Paseo creates in a linked worktree starts with its own copy of them.

```gitignore
# .worktreeinclude
.env
.env.*
config/secrets.json
```

`.worktreeinclude` uses gitignore syntax. A file is copied only when it matches `.worktreeinclude` and is also gitignored, so tracked files are never touched. Files that already exist in the worktree are not overwritten. Workspaces that are not linked worktrees, and repositories without a `.worktreeinclude`, are left alone. Copies use copy-on-write cloning on filesystems that support it, such as APFS and btrfs.

Requires Paseo 0.10.3 or later and `git` on the daemon's `PATH`. Files are only copied locally on the daemon machine, from the main checkout into the new worktree.

The copy runs when the workspace is created and does not block agent startup. An agent that reads these files immediately may start before the copy finishes. If that matters, use a `worktree.setup` step in `paseo.json` instead.
