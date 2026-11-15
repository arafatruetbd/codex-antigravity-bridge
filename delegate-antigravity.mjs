#!/usr/bin/env node
// Reusable Codex -> Antigravity bridge. Node.js 20+; no npm dependencies.
import { spawn } from "node:child_process";
import { readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { basename, isAbsolute, join, resolve } from "node:path";
import { homedir } from "node:os";

const MAX_STDOUT_BYTES = 12 * 1024 * 1024;
const MAX_STDERR_BYTES = 2 * 1024 * 1024;
const RESPONSE_PREVIEW_CHARS = 4000;

function usage(exitCode = 2) {
  console.error('Usage: node delegate-antigravity.mjs [--cwd PROJECT_DIR] --file TASK.md');
  console.error('   or: node delegate-antigravity.mjs [--cwd PROJECT_DIR] --text "Your task"');
  process.exit(exitCode);
}

const options = { cwd: process.cwd(), file: null, text: null };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const flag = argv[i];
  if (flag === '--help' || flag === '-h') usage(0);
  if (!['--cwd', '--file', '--text'].includes(flag) || !argv[i + 1]) usage();
  const value = argv[++i];
  if (flag === '--cwd') options.cwd = value;
  else if (flag === '--file') options.file = value;
  else options.text = value;
}
if (!!options.file === !!options.text) usage();

const project = resolve(options.cwd);
try {
  if (!(await stat(project)).isDirectory()) throw new Error('not a directory');
} catch (error) {
  console.error(`Invalid working directory: ${project} (${error.message})`);
  process.exit(2);
}

let prompt;
try {
  const filePath = options.file
    ? (isAbsolute(options.file) ? options.file : resolve(project, options.file))
    : null;
  prompt = filePath ? await readFile(filePath, 'utf8') : options.text;
  if (!prompt.trim()) throw new Error('task is empty');
} catch (error) {
  console.error(`Unable to read task: ${error.message}`);
  process.exit(2);
}

const exe = process.env.AGY_BIN || (process.platform === 'win32' ? 'agy.exe' : 'agy');
// AGY_PREFIX_ARGS is intended for local mock-worker tests only. It is not
// required for regular use and must not come from untrusted task content.
let prefixArgs = [];
if (process.env.AGY_PREFIX_ARGS) {
  try {
    const parsed = JSON.parse(process.env.AGY_PREFIX_ARGS);
    if (!Array.isArray(parsed) || !parsed.every(item => typeof item === 'string')) {
      throw new Error('expected a JSON array of strings');
    }
    prefixArgs = parsed;
  } catch (error) {
    console.error(`Invalid AGY_PREFIX_ARGS: ${error.message}`);
    process.exit(2);
  }
}
const cliArgs = [...prefixArgs, '-p', prompt, '--output-format', 'json', '--print-timeout', '15m'];
let stdout = '';
let stderr = '';
let exitCode = 1;
let spawnError = null;
let outputExceeded = false;

try {
  exitCode = await new Promise((done, fail) => {
    const child = spawn(exe, cliArgs, {
      cwd: project,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
      if (Buffer.byteLength(stdout, 'utf8') > MAX_STDOUT_BYTES) {
        outputExceeded = true;
        child.kill();
      }
    });
    child.stderr.on('data', chunk => {
      stderr += chunk;
      if (Buffer.byteLength(stderr, 'utf8') > MAX_STDERR_BYTES) {
        outputExceeded = true;
        child.kill();
      }
    });
    child.once('error', fail);
    child.once('close', code => done(code ?? 1));
  });
} catch (error) {
  spawnError = error.message;
}

let envelope = null;
try { envelope = JSON.parse(stdout); } catch { /* Keep raw diagnostics in report. */ }
const success = !spawnError && !outputExceeded && exitCode === 0 && envelope?.status === 'SUCCESS';
const codexHome = process.env.CODEX_HOME ? resolve(process.env.CODEX_HOME) : join(homedir(), '.codex');
const safeName = basename(project).replace(/[^a-zA-Z0-9_-]/g, '_') || 'project';
const projectHash = createHash('sha256').update(project).digest('hex').slice(0, 8);
const projectName = `${safeName}-${projectHash}`;
const reportDirectory = join(codexHome, 'antigravity-runs', projectName);
const reportName = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}.json`;
let reportFile = null;
let logWarning = null;

try {
  await mkdir(reportDirectory, { recursive: true });
  reportFile = join(reportDirectory, reportName);
  // Avoid persisting prompts/credentials by default. Worker responses and stderr
  // may still contain sensitive information: treat these reports as private.
  await writeFile(reportFile, JSON.stringify({
    project_cwd: project,
    task_file: options.file || undefined,
    exit_code: exitCode,
    spawn_error: spawnError,
    output_exceeded: outputExceeded,
    result: envelope,
    stderr,
    raw_stdout: envelope === null ? stdout.slice(0, MAX_STDOUT_BYTES) : undefined,
  }, null, 2), 'utf8');
} catch (error) {
  logWarning = `Could not write report under Codex home: ${error.message}`;
}

console.log(JSON.stringify({
  ok: success,
  status: envelope?.status ?? 'NO_VALID_JSON',
  exit_code: exitCode,
  project_cwd: project,
  response: typeof envelope?.response === 'string'
    ? envelope.response.slice(0, RESPONSE_PREVIEW_CHARS)
    : null,
  response_truncated: (envelope?.response?.length ?? 0) > RESPONSE_PREVIEW_CHARS,
  conversation_id: envelope?.conversation_id ?? null,
  usage: envelope?.usage ?? null,
  error: envelope?.error ?? spawnError ?? (outputExceeded ? 'Output size limit exceeded' : undefined),
  warning: stderr ? 'Worker wrote to stderr; inspect report and permissions.' : logWarning || undefined,
  report_file: reportFile,
}, null, 2));
if (!success) process.exitCode = 1;
