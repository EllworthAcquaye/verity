# Seeded defect answer key

This file is deliberately excluded from the reviewer's primary walkthrough.

1. `POST /orders` observes no idempotency claim before write, so a retry creates a second order.
2. `POST /callbacks/payment` expects `PaymentStatus` while the caller sends `paymentStatus`.
3. The target is resource-limited so burst work degrades its own container instead of the host.
4. The write path double-applies on retry (the primary governed-remediation demonstration).
5. The callback returns HTTP 200 with an error body.
6. `GET /orders/:id/receipt` carries an isolated 850 ms latency regression.
