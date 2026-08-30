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
  const runner = compose.match(/runner:([\s\S]*?)\n  target:/)?.[1] ?? '';
  assert.ok(runner);
  assert.doesNotMatch(runner, /DATABASE_URL|POSTGRES_/);
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
