import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('generated checks remain declarative data', () => {
  const evaluator = read('apps/runner/verity_runner/evaluator.py');
  assert.equal(/\beval\s*\(|\bexec\s*\(/.test(evaluator), false);
  assert.match(evaluator, /ALLOWED_OPERATIONS/);
});

test('evidence and audit models are append-only by shape', () => {
  const schema = read('packages/data/prisma/schema.prisma');
  for (const model of ['Evidence', 'AuditEvent']) {
    const block = schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
    assert.ok(block, `${model} model is required`);
    assert.doesNotMatch(block, /updatedAt|deletedAt/);
  }
});

test('runner has no control-plane database configuration', () => {
  const compose = read('compose.yaml');
  const runner = compose.match(/\n  runner:\n([\s\S]*?)\n  target:\n/)?.[1] ?? '';
  assert.ok(runner);
  assert.doesNotMatch(runner, /DATABASE_URL|POSTGRES_/);
});

test('execution uses a transactional outbox and authenticated callback boundary', () => {
  const actions = read('apps/control/src/app/(console)/actions.ts');
  const callback = read('apps/control/src/app/api/runner/results/route.ts');
  assert.match(actions, /outboxMessage\.create/);
  assert.match(actions, /transaction\.run\.create/);
  assert.match(callback, /RUNNER_CALLBACK_TOKEN/);
  assert.match(callback, /timingSafeEqual/);
});

test('the local-model network terminates in the execution plane', () => {
  const compose = read('compose.yaml');
  const ollama = compose.match(/ollama:([\s\S]*?)\n  model-init:/)?.[1] ?? '';
  const control = compose.match(/control:([\s\S]*?)\n  runner:/)?.[1] ?? '';
  const runner = compose.match(/runner:([\s\S]*?)\n  target:/)?.[1] ?? '';
  assert.match(ollama, /networks: \[model, model-egress\]/);
  assert.doesNotMatch(control, /OLLAMA_|\bmodel\b/);
  assert.match(runner, /VERITY_AI_MODE: ollama/);
  assert.match(runner, /OLLAMA_BASE_URL: http:\/\/ollama:11434/);
  assert.doesNotMatch(runner, /model-egress/);
});

test('the seeded target owns six explicit defects and an isolated database', () => {
  const target = read('apps/target/src/server.js');
  const compose = read('compose.yaml');
  assert.equal((target.match(/SEEDED DEFECT [1-6]:/g) ?? []).length, 6);
  const runner = compose.match(/runner:([\s\S]*?)\n  target:/)?.[1] ?? '';
  const control = compose.match(/control:([\s\S]*?)\n  runner:/)?.[1] ?? '';
  assert.doesNotMatch(runner, /target-data|TARGET_DATABASE_URL/);
  assert.doesNotMatch(control, /target-data|TARGET_DATABASE_URL/);
  assert.match(compose, /target-postgres:[\s\S]*?networks: \[target-data\]/);
});

test('remediation is allowlisted, isolated and verification-gated', () => {
  const compose = read('compose.yaml');
  const remediator = read('apps/remediator/src/server.js');
  const callback = read('apps/control/src/app/api/runner/results/route.ts');
  const migration = read('packages/data/prisma/migrations/20260830061200_governance_guards/migration.sql');
  const runner = compose.match(/\n  runner:\n([\s\S]*?)\n  target:\n/)?.[1] ?? '';
  const remediationService = compose.match(/remediator:([\s\S]*?)\n\nnetworks:/)?.[1] ?? '';
  assert.match(remediator, /const productionPath = '\/targets\/production\/server\.js'/);
  assert.match(remediator, /const stagingPath = '\/targets\/staging\/server\.js'/);
  assert.doesNotMatch(remediator, /request\.body\.(path|command|diff)/);
  assert.match(remediationService, /networks: \[governance\]/);
  assert.doesNotMatch(runner, /governance|REMEDIATOR/);
  assert.match(callback, /promoteRemediation/);
  assert.match(callback, /rollbackRemediation/);
  assert.match(migration, /Approval_actor_guard/);
  assert.match(migration, /Remediation_approval_guard/);
});
