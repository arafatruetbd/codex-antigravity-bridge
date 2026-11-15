# Codex + Antigravity CLI Bridge

Give Codex CLI an optional Antigravity worker with one shared setup for all your projects.

## What Does It Do?

Codex is always the main agent; Antigravity is an optional worker for tasks you choose to delegate, such as writing tests. The bridge passes a task to Antigravity in your project and returns its results to Codex for review. **Antigravity is NEVER invoked automatically: it runs only when you explicitly request it for the current task.**

## How It Works

```text
Default:      You -> Codex -> edits, tests, answer
On request:   You -> Codex -> bridge -> Antigravity
                    Codex <- results + changed files
                    Codex reviews, tests, and reports
```

## Requirements

Install these first:

- Windows 10/11 with [PowerShell 7+](https://learn.microsoft.com/en-us/powershell/scripting/install/install-powershell-on-windows).
- [Git](https://git-scm.com/install/windows) and [Node.js 20+](https://nodejs.org/en/download) (current LTS recommended).
- [Codex CLI](https://github.com/openai/codex#installation--setup) and [Antigravity CLI (`agy`)](https://antigravity.google/docs/getting-started?tab=cli), installed and signed in.

This community integration is not an official OpenAI or Google product. It does not install either CLI. No `npm install` is needed.

## Quick Start

In PowerShell, clone the repository, review the installer, then install:

```powershell
git clone https://github.com/arafatruetbd/codex-antigravity-bridge.git
cd codex-antigravity-bridge
Get-Content .\install-global.ps1
pwsh -NoProfile -File .\install-global.ps1
```

The installer copies the bridge to `~/.codex/bridges/antigravity/` and updates the active global instructions (`AGENTS.override.md` if present; otherwise `AGENTS.md`). It honors `CODEX_HOME`, preserves unrelated instructions, and backs up existing files. It does not launch Antigravity.

Verify command availability and bridge syntax:

```powershell
Get-Command node, codex, agy
npm run check
```

Expect command paths and no syntax errors. This does not test worker authentication or connectivity.

Replace the path below with your existing project folder, then start a **new Codex session**:

```powershell
cd "C:\path\to\your-project"
codex
```

To update, pull the latest source and rerun the installer. To remove, review and run [uninstall-global.ps1](uninstall-global.ps1); backups and logs remain. Restart Codex after either change.

## Usage Examples

Enter these prompts in Codex:

**Default: Codex only**

> Fix the authentication bug.

**Optional: Codex + Antigravity**

> Use Antigravity to write unit tests for this module.

Codex independently reviews the worker's changes and runs appropriate tests before reporting back.

If the sandbox cannot write to the global Codex home, Codex can use a project-local report directory:

```powershell
node "$env:CODEX_HOME/bridges/antigravity/delegate-antigravity.mjs" --cwd (Get-Location).Path --report-dir ".agent-runs" --text "Your task"
```

`--report-dir` accepts an absolute path or a path relative to `--cwd`. Without it, reports continue to use `~/.codex/antigravity-runs` (or `$env:CODEX_HOME/antigravity-runs`). Add project-local report directories such as `.agent-runs/` to `.gitignore`; reports preserve worker stderr and may contain sensitive information.

## Important Notes

- Opt-in applies only to the current task. Large tasks never authorize delegation. Remove outdated automatic-delegation rules from project instructions.
- Consent is enforced through Codex agent instructions, **not by the bridge**. A worker's `SUCCESS` does not replace Codex's review.
- Both CLIs need authentication and appropriate permissions. Use narrow approvals if access is blocked. Keep credentials out of prompts and reports private; see [Security](docs/SECURITY.md).

## License

[MIT License](LICENSE).
