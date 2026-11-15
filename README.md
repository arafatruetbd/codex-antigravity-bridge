# Codex ↔ Antigravity CLI Bridge

[![Node checks](https://img.shields.io/badge/tests-node%2020%2B-informational)](#development)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Codex CLI is always the main coding agent. Google Antigravity CLI (`agy`) is an optional worker, used only when you explicitly request it for the current task.**

This small, dependency-free Node.js bridge invokes Antigravity in a selected project directory, receives machine-readable JSON, and returns a compact summary to Codex. A PowerShell installer adds a marked **global, opt-in-only** Codex policy and installs the shared bridge once, so you do not have to copy it into each project.

> This is a community integration, not an official OpenAI or Google product. You must install and sign in to both CLIs yourself.

## How it works

```text
Normal request (default):
  You → Codex → edits, tests, final answer

Explicit opt-in request:
  You → Codex (planner/reviewer)
            └─ Node bridge → agy (worker in selected project)
                                   └─ JSON result + changed files
                Codex reviews diff, runs tests, reports result
```

**Opt-in only:** Saying "fix this huge app" does *not* authorize Antigravity. Saying "use agy to write tests for this task" does. Prior requests are not standing authorization. The policy is based on agent instructions, not a hard OS-level access-control mechanism.

## Prerequisites

- Windows 10/11 with PowerShell 7+ (automatic installer is Windows-focused).
- Node.js 20+ (`node --version`). No `npm install` required.
- Codex CLI (`codex --version`) installed and authenticated.
- Google Antigravity CLI (`agy --version`) installed and authenticated (`agy` in an interactive terminal).

The bridge is Node.js-based and cross-platform, but the included automatic installer is PowerShell/Windows-focused. Linux/macOS users can copy the script and the global instruction section manually.

## Installation (Windows)

Clone or download this repository, then from its root in PowerShell:

```powershell
Get-Content .\install-global.ps1
pwsh -NoProfile -File .\install-global.ps1
```

What this does:

- Copies `delegate-antigravity.mjs` to `~/.codex/bridges/antigravity/` (or `$env:CODEX_HOME/bridges/antigravity/`).
- Adds/updates a clearly delimited `CODEX_ANTIGRAVITY_GLOBAL` section in Codex's *active* global instructions: `AGENTS.override.md` if present, otherwise `AGENTS.md`.
- Creates dated backups before changing existing global files.
- **Does not** launch Antigravity, disable permissions, or install dependencies.

If both global instruction files exist, Codex uses the override. Check them after installation. Project-specific `AGENTS.md` / `AGENTS.override.md` files can add rules, so remove any old *automatic Antigravity delegation* instructions in those files.

Start a **new Codex session** in your selected project after installation.

## Usage

### Default: Codex alone

```powershell
cd C:\path\to\your-project
codex
```

Normal prompt: `Refactor this module and add tests.`

Result: Codex should do the work itself. The bridge is *not* invoked.

### Explicit request to use Antigravity

In Codex:

> Use Antigravity (`agy`) as a worker to write only the unit tests for this feature. You are the main agent: review all changes and run tests yourself.

Codex can then use the global bridge:

```powershell
node "$HOME\.codex\bridges\antigravity\delegate-antigravity.mjs" --cwd "$(Get-Location)" --text "Review the tests. Do not modify files."
```

For a longer task, create a prompt file **inside the target project** and pass it using `--file`:

```powershell
node "$HOME\.codex\bridges\antigravity\delegate-antigravity.mjs" --cwd "$(Get-Location)" --file ".agent-tasks\task.md"
```

`--cwd` is the project directory Antigravity should work in; it is **not** the bridge's installation directory. Set `CODEX_HOME` if you changed Codex's home directory.

### Optional connection test (manual opt-in)

```powershell
$project = (Get-Location).Path
node "$HOME\.codex\bridges\antigravity\delegate-antigravity.mjs" --cwd "$project" --text "Reply exactly WORKER_OK. Do not use tools or modify files."
```

Expected: JSON with `"ok": true`, `"status": "SUCCESS"`, and a `conversation_id` (response may include a trailing newline). **This test runs Antigravity and uses model tokens.**

## Output and reports

The bridge returns `ok`, `status`, `exit_code`, `project_cwd`, a truncated response preview, `conversation_id`, token usage, and optional diagnostics. It checks both process exit code and `status`, but Codex must independently review file changes and run tests—`SUCCESS` is not proof that code is correct.

Detailed reports live outside the git repository at `~/.codex/antigravity-runs/<project-name>/` (under `CODEX_HOME` if set). They may contain private worker text and errors; **do not publish them**. See [Security](docs/SECURITY.md).

## Reinstall, upgrade, rollback

To update this bridge, get the latest source and rerun the installer. The installer refreshes only its marked global policy section, preserving unrelated instructions. Backup files have `.bak-YYYYMMDD-HHMMSS` suffixes.

To remove it, use [`uninstall-global.ps1`](uninstall-global.ps1) after reviewing the script. It removes its marked global instructions and shared bridge, but retains backups and run logs. Start a new Codex session after changing global rules.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `agy` not found | `Get-Command agy` and `agy --version` |
| Worker auth timeout | Sign in using interactive `agy`; Codex sandbox may block cached credentials or network. Approve narrowly scoped execution if appropriate. |
| `MODULE_NOT_FOUND` | Check bridge installation path and `--cwd` points to the intended project. |
| Installer `.IndexOf()` on null | Empty global AGENTS file; fixed by the installer null-guard in this version. |
| `SUCCESS` but no changed files | Review worker's response, permissions and `git diff`; it may have produced text only. |
| Antigravity runs unexpectedly | Check current Codex request, project-local rules, and both global instruction files for old auto-delegation instructions. |

For more, see [Security](docs/SECURITY.md).

## Development

```powershell
npm test
npm run check
```

Tests use a local mock worker; no Codex/Antigravity login or token usage is needed for tests.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Released under the [MIT License](LICENSE).

## Relevant docs

- [Codex global/project AGENTS.md instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Antigravity CLI headless mode](https://antigravity.google/docs/cli/headless/)
