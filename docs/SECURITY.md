# Security and privacy

## Explicit user opt-in (instruction policy)

This bridge is installed but stays unused by default. The global Codex instruction
policy tells Codex to call it **only when the user explicitly requests Antigravity
for the current task**. This is a behavioral policy, not an OS-enforced access
control. Anyone with shell access can directly execute `agy` or this bridge.

For stronger enforcement, restrict executable and file permissions at the OS level
or require a separate approval workflow before agent execution.

## Files and data

- Antigravity runs with the project's working directory. It may access files
  permitted by the machine, sandbox, and Antigravity permission policies.
- Scope task prompts to specific files. Never include tokens, private keys,
  `.env` contents, passwords, or unrelated private data.
- Detailed worker results and diagnostics may contain secrets. Bridge reports
  are stored under your local Codex home, not this repository. They should
  remain local and never be committed or uploaded.
- The `.gitignore` excludes the most common run directories and secret file
  patterns, but **review `git status` and `git diff --cached` before pushing**.
- If the Codex sandbox blocks Antigravity authentication or network, use
  narrowly scoped approvals rather than disabling security globally.

## Non-goals

The kit does not install Codex/Antigravity, change their security settings,
provision credentials, grant broad permissions, push to GitHub, or call either
agent automatically after installation.

## Reporting a vulnerability

Do not post credentials or private project data in a public GitHub issue.
Contact the repository maintainer privately using GitHub's security advisory
feature if it is enabled.
