import { createHash, timingSafeEqual } from 'node:crypto';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import express from 'express';

const app = express();
app.use(express.json({ limit: '16kb' }));

const productionPath = '/targets/production/server.js';
const stagingPath = '/targets/staging/server.js';
const token = process.env.REMEDIATOR_TOKEN ?? '';

const vulnerable = `app.post('/orders', async (request, response) => {
  const result = await database.query(
    'INSERT INTO orders (sku, quantity, status, idempotency_key) VALUES ($1, $2, $3, $4) RETURNING id, sku, quantity, status',
    [request.body.sku ?? 'UNKNOWN', request.body.quantity ?? 1, 'accepted', request.get('Idempotency-Key') ?? null],
  );
  response.status(201).json(result.rows[0]);
});`;

const fixed = `app.post('/orders', async (request, response) => {
  const idempotencyKey = request.get('Idempotency-Key') ?? null;
  if (idempotencyKey) {
    const existing = await database.query('SELECT id, sku, quantity, status FROM orders WHERE idempotency_key = $1 ORDER BY created_at LIMIT 1', [idempotencyKey]);
    if (existing.rows[0]) return response.status(201).json(existing.rows[0]);
  }
  const result = await database.query(
    'INSERT INTO orders (sku, quantity, status, idempotency_key) VALUES ($1, $2, $3, $4) RETURNING id, sku, quantity, status',
    [request.body.sku ?? 'UNKNOWN', request.body.quantity ?? 1, 'accepted', idempotencyKey],
  );
  response.status(201).json(result.rows[0]);
});`;

const unifiedDiff = `--- a/apps/target/src/server.js
+++ b/apps/target/src/server.js
@@ idempotent order creation @@
+  const idempotencyKey = request.get('Idempotency-Key') ?? null;
+  if (idempotencyKey) {
+    const existing = await database.query('SELECT id, sku, quantity, status FROM orders WHERE idempotency_key = $1 ORDER BY created_at LIMIT 1', [idempotencyKey]);
+    if (existing.rows[0]) return response.status(201).json(existing.rows[0]);
+  }
-    [request.body.sku ?? 'UNKNOWN', request.body.quantity ?? 1, 'accepted', request.get('Idempotency-Key') ?? null],
+    [request.body.sku ?? 'UNKNOWN', request.body.quantity ?? 1, 'accepted', idempotencyKey],`;
const diffSha256 = createHash('sha256').update(unifiedDiff).digest('hex');

function authorized(request) {
  const supplied = request.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  return Boolean(token) && supplied.length === token.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(token));
}

app.use((request, response, next) => request.path === '/health' || authorized(request) ? next() : response.status(401).json({ error: 'unauthorized' }));
app.get('/health', (_request, response) => response.json({ status: 'healthy', writable_paths: ['apps/target/src/server.js'] }));
app.get('/proposal', (_request, response) => response.json({ diff: unifiedDiff, sha256: diffSha256, rationale: 'Claim an existing idempotency key before inserting so an identical retry resolves to the original order.', allowed_path: 'apps/target/src/server.js' }));

app.post('/stage', async (request, response) => {
  if (request.body.sha256 !== diffSha256) return response.status(422).json({ error: 'proposal_hash_mismatch' });
  if (Buffer.byteLength(unifiedDiff) > 8_192) return response.status(422).json({ error: 'diff_too_large' });
  const source = await readFile(stagingPath, 'utf8');
  if (!source.includes(vulnerable) && !source.includes(fixed)) return response.status(409).json({ error: 'allowlisted_context_missing' });
  if (source.includes(vulnerable)) await writeFile(stagingPath, source.replace(vulnerable, fixed), 'utf8');
  await new Promise((resolve) => setTimeout(resolve, 600));
  response.json({ staged: true, sha256: diffSha256 });
});

app.post('/promote', async (request, response) => {
  if (request.body.sha256 !== diffSha256) return response.status(422).json({ error: 'proposal_hash_mismatch' });
  await copyFile(stagingPath, productionPath);
  response.json({ promoted: true, sha256: diffSha256 });
});

app.post('/rollback', async (_request, response) => {
  await copyFile(productionPath, stagingPath);
  response.json({ rolled_back: true });
});

app.listen(9000, '0.0.0.0');
