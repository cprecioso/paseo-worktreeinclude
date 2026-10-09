# paseo-worktreeinclude

A [Paseo](https://paseo.sh) plugin that copies gitignored files listed in `.worktreeinclude` into new git worktrees, the same way Claude Code does.

When a workspace is created in a linked git worktree, the plugin reads `.worktreeinclude` (gitignore syntax) from the main checkout and copies every file that matches it **and** is gitignored. Tracked files are never touched, and files already present in the worktree are not overwritten. Copies use copy-on-write cloning (APFS, btrfs) when available.

```gitignore
# .worktreeinclude
.env
.env.*
config/secrets.json
```

## Install

Requires Paseo 0.10.3 or later.

```bash
paseo plugin install npm:@cprecioso/paseo-worktreeinclude
```

Or from GitHub:

```bash
paseo plugin install github:cprecioso/paseo-worktreeinclude
```

## Caveat

The copy runs on Paseo's `workspace.created` event, which does not block agent startup. An agent that reads these files immediately may race the copy. If that matters, use a `worktree.setup` step in `paseo.json` instead.
