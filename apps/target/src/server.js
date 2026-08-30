import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const app = express();
app.use(express.json({ limit: '64kb' }));

const database = new Pool({ connectionString: process.env.TARGET_DATABASE_URL });
const loginAllocations = [];

app.get('/health', async (_request, response) => {
  await database.query('SELECT 1');
  response.json({ status: 'healthy' });
});

app.get('/orders', async (_request, response) => {
  const result = await database.query('SELECT id, sku, quantity, status FROM orders ORDER BY created_at');
  response.json(result.rows);
});

app.get('/orders/:id', async (request, response) => {
  const result = await database.query('SELECT id, sku, quantity, status FROM orders WHERE id = $1', [request.params.id]);
  return result.rows[0] ? response.json(result.rows[0]) : response.status(404).json({ error: 'not_found' });
});

// SEEDED DEFECT 4: the idempotency key is observed but never claimed before write.
app.post('/orders', async (request, response) => {
  const result = await database.query(
    'INSERT INTO orders (sku, quantity, status, idempotency_key) VALUES ($1, $2, $3, $4) RETURNING id, sku, quantity, status',
    [request.body.sku ?? 'UNKNOWN', request.body.quantity ?? 1, 'accepted', request.get('Idempotency-Key') ?? null],
  );
  response.status(201).json(result.rows[0]);
});

// SEEDED DEFECT 1: the callback configuration object is never bound at startup.
app.post('/callbacks/payment', (_request, response) => {
  const callbackConfiguration = undefined;
  if (!callbackConfiguration?.enabled) return response.status(503).json({ error: 'callback_disabled' });
  return response.status(202).json({ accepted: true });
});

// SEEDED DEFECT 2: the real caller sends `paymentStatus`, but parsing is case-sensitive.
app.post('/callbacks/bank', (request, response) => {
  if (request.body.PaymentStatus !== 'SETTLED') return response.status(200).json({ error: 'invalid_status' });
  return response.status(202).json({ accepted: true });
});

// SEEDED DEFECT 3: burst work and retained allocations are unbounded.
app.post('/sessions/burst', async (request, response) => {
  const attempts = Math.max(1, Number(request.body.attempts ?? 1));
  for (let index = 0; index < attempts; index += 1) loginAllocations.push('x'.repeat(2048));
  await new Promise((resolve) => setTimeout(resolve, Math.min(attempts * 2, 600)));
  response.status(202).json({ accepted: attempts, retained: loginAllocations.length });
});

// SEEDED DEFECT 5: invalid input is wrapped in an HTTP 200 response.
app.post('/orders/validate', (request, response) => {
  if (!Number.isInteger(request.body.quantity) || request.body.quantity < 1) return response.status(200).json({ error: 'invalid_quantity' });
  return response.status(204).end();
});

// SEEDED DEFECT 6: one path carries an isolated latency regression.
app.get('/orders/:id/receipt', async (request, response) => {
  await new Promise((resolve) => setTimeout(resolve, 850));
  response.json({ orderId: request.params.id, format: 'pdf' });
});

async function start() {
  await database.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      sku TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      status TEXT NOT NULL,
      idempotency_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  app.listen(4000, '0.0.0.0');
}

start().catch((error) => {
  console.error('Target startup failed', error);
  process.exit(1);
});
