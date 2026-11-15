# Codex → Antigravity Bridge (বাংলা)

**Codex সব সময় main agent। Antigravity (`agy`) কেবল বর্তমান কাজে তুমি স্পষ্টভাবে বললে ব্যবহার হবে।** বড় কাজ হলেই auto-delegation হবে না।

এটি Windows-এ একটি global Codex instruction policy এবং shared Node.js bridge ইনস্টল করে। একবার setup করলে আলাদা আলাদা coding project-এ bridge copy করতে হবে না।

## ইনস্টল

আগে Node.js 20+, PowerShell 7+, Codex CLI এবং `agy` ইনস্টল করে লগইন করো। তারপর এই GitHub repo-র root folder-এ PowerShell খুলে:

```powershell
Get-Content .\install-global.ps1
pwsh -NoProfile -File .\install-global.ps1
```

তারপর নতুন project directory থেকে `codex` চালাও। স্বাভাবিক prompt দিলে Codex নিজেই কাজ করবে।

Antigravity ব্যবহার করতে চাইলে Codex-কে স্পষ্টভাবে বলো:

```text
Use Antigravity (agy) to write tests for this task.
You are the main agent; review every change and run tests yourself.
```

Bridge command (explicit request থাকলেই):

```powershell
node "$HOME\.codex\bridges\antigravity\delegate-antigravity.mjs" --cwd "$(Get-Location)" --text "Reply exactly WORKER_OK. Do not use tools or modify files."
```

`AGENTS.override.md` বা `AGENTS.md`-এ আগে থেকে কোনো **automatic** delegation instructions থাকলে তা পরিবর্তন করতে হবে, না হলে conflict হতে পারে। Installer আগের global instructions backup রাখে এবং শুধুমাত্র নিজস্ব চিহ্নিত section edit করে।

**সতর্কতা:** রিপোর্টে private project information থাকতে পারে। `~/.codex/antigravity-runs` GitHub-এ push করো না। permission bypass করো না।

বিস্তারিত English instructions: [README.md](README.md)।
