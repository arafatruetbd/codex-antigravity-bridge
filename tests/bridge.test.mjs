import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { execFile } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const bridge = resolve(here, '../delegate-antigravity.mjs');
const mock = resolve(here, 'mock-agy.mjs');

async function run(args, env) {
  return await new Promise((done, fail) => {
    execFile(process.execPath, [bridge, ...args], {
      env, encoding: 'utf8', maxBuffer: 2_000_000,
    }, (error, stdout, stderr) => {
      if (error && error.code === undefined) return fail(error);
      done({ code: error ? error.code : 0, stdout, stderr });
    });
  });
}

async function fixture(fn) {
  const root = await mkdtemp(join(tmpdir(), 'codex-agy-test-'));
  const project = join(root, 'my-project');
  const home = join(root, 'my-codex-home');
  await mkdir(project);
  try {
    const env = {
      ...process.env,
      AGY_BIN: process.execPath,
      AGY_PREFIX_ARGS: JSON.stringify([mock]),
      CODEX_HOME: home,
    };
    await fn({ root, project, home, env });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('successful worker response and report are scoped to CODEX_HOME', async () => {
  await fixture(async ({ project, home, env }) => {
    const result = await run(['--cwd', project, '--text', 'Reply WORKER_OK'], env);
    assert.equal(result.code, 0);
    assert.equal(result.stderr, '');
    const obj = JSON.parse(result.stdout);
    assert.equal(obj.ok, true);
    assert.equal(obj.status, 'SUCCESS');
    assert.equal(obj.response.trim(), 'WORKER_OK');
    assert.equal(obj.conversation_id, 'mock-conversation-id');
    assert.equal(obj.project_cwd, project);
    assert.ok(obj.report_file.startsWith(home));
    assert.equal(obj.report_error, undefined);
    assert.equal(JSON.parse(await readFile(obj.report_file, 'utf8')).result.status, 'SUCCESS');
  });
});

test('writes reports to a custom relative directory under the project', async () => {
  await fixture(async ({ project, env }) => {
    const result = await run(['--cwd', project, '--report-dir', '.agent-runs', '--text', 'WORKER_OK'], env);
    const obj = JSON.parse(result.stdout);
    assert.equal(result.code, 0);
    assert.ok(obj.report_file.startsWith(join(project, '.agent-runs')));
    assert.equal(JSON.parse(await readFile(obj.report_file, 'utf8')).result.status, 'SUCCESS');
  });
});

test('returns report creation failure without report_file', async () => {
  await fixture(async ({ project, env }) => {
    const blocker = join(project, 'not-a-directory');
    await writeFile(blocker, 'block');
    const result = await run(['--cwd', project, '--report-dir', 'not-a-directory/child', '--text', 'WORKER_OK'], env);
    const obj = JSON.parse(result.stdout);
    assert.equal(result.code, 0);
    assert.equal(obj.report_file, undefined);
    assert.match(obj.report_error, /Could not write diagnostic report/);
    assert.equal(obj.worker_warning, undefined);
  });
});

test('reports worker stderr and report-write failure separately', async () => {
  await fixture(async ({ project, env }) => {
    const blocker = join(project, 'blocked');
    await writeFile(blocker, 'block');
    const result = await run(['--cwd', project, '--report-dir', 'blocked/reports', '--text', 'WORKER_OK MOCK_STDERR'], env);
    const obj = JSON.parse(result.stdout);
    assert.equal(result.code, 0);
    assert.match(obj.worker_warning, /Worker wrote to stderr/);
    assert.match(obj.report_error, /Could not write diagnostic report/);
    assert.equal(obj.report_file, undefined);
  });
});

test('custom report preserves worker stderr in report', async () => {
  await fixture(async ({ project, env }) => {
    const result = await run(['--cwd', project, '--report-dir', 'custom-reports', '--text', 'WORKER_OK MOCK_STDERR'], env);
    const obj = JSON.parse(result.stdout);
    assert.match(obj.worker_warning, /Worker wrote to stderr/);
    assert.equal(JSON.parse(await readFile(obj.report_file, 'utf8')).stderr.trim(), 'Simulated worker diagnostic');
  });
});

test('reads task file relative to chosen project', async () => {
  await fixture(async ({ project, env }) => {
    await writeFile(join(project, 'task.md'), 'Reply WORKER_OK\n');
    const result = await run(['--cwd', project, '--file', 'task.md'], env);
    assert.equal(result.code, 0);
    assert.equal(JSON.parse(result.stdout).response.trim(), 'WORKER_OK');
  });
});

test('rejects failed worker status and returns nonzero', async () => {
  await fixture(async ({ project, env }) => {
    const result = await run(['--cwd', project, '--text', 'MOCK_ERROR'], env);
    assert.equal(result.code, 1);
    const obj = JSON.parse(result.stdout);
    assert.equal(obj.status, 'ERROR');
    assert.equal(obj.ok, false);
  });
});

test('rejects missing project and avoids invoking worker', async () => {
  await fixture(async ({ root, env }) => {
    const result = await run(['--cwd', join(root, 'missing'), '--text', 'WORKER_OK'], env);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /Invalid working directory/);
  });
});

test('rejects empty prompt', async () => {
  await fixture(async ({ project, env }) => {
    const result = await run(['--cwd', project, '--text', '  '], env);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /task is empty/);
  });
});
