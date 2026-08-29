import express from 'express';

const app = express();
app.use(express.json({ limit: '64kb' }));

const orders = new Map();
let nextId = 1;

app.get('/health', (_request, response) => response.json({ status: 'healthy' }));
app.get('/orders', (_request, response) => response.json([...orders.values()]));
app.get('/orders/:id', (request, response) => {
  const order = orders.get(request.params.id);
  return order ? response.json(order) : response.status(404).json({ error: 'not_found' });
});

// SEEDED DEFECT: the idempotency key is observed but never claimed before write.
app.post('/orders', (request, response) => {
  const order = { id: `ord_${nextId++}`, ...request.body, status: 'accepted' };
  orders.set(order.id, order);
  response.status(201).json(order);
});

// SEEDED DEFECT: upstream sends `paymentStatus`; this parser is case-sensitive.
app.post('/callbacks/payment', (request, response) => {
  if (request.body.PaymentStatus !== 'SETTLED') return response.status(200).json({ error: 'invalid_status' });
  return response.json({ accepted: true });
});

// SEEDED DEFECT: one path carries an isolated latency regression.
app.get('/orders/:id/receipt', async (request, response) => {
  await new Promise((resolve) => setTimeout(resolve, 850));
  response.json({ orderId: request.params.id, format: 'pdf' });
});

app.delete('/orders/:id', (request, response) => {
  orders.delete(request.params.id);
  response.status(204).end();
});

app.listen(4000, '0.0.0.0');
