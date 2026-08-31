# Seeded target defects

This is the answer key for maintainers and interview discussion. It is intentionally not part of the README walkthrough.

| # | Target behavior | Governed check | Observable failure |
| --- | --- | --- | --- |
| 1 | `/callbacks/payment` never binds its configuration object. | Configured payment callback accepts valid events | Expected 202; received 503 with `callback_disabled`. |
| 2 | `/callbacks/bank` reads `PaymentStatus` while the caller sends `paymentStatus`. | Bank caller casing is parsed | Expected 202/`accepted=true`; received HTTP 200 with `invalid_status`. |
| 3 | `/sessions/burst` retains every allocation and performs work proportional to an unbounded request count. | Login burst remains resource bounded | Expected ≤150 ms; observed roughly 440 ms for the bounded demonstration burst. |
| 4 | `POST /orders` records but never claims its idempotency key. | Retry applies the order once | Collection count changes from 1 to 2 across an identical replay. |
| 5 | `/orders/validate` returns HTTP 200 for invalid input. | Invalid order uses an error status | Expected 422; received 200 with an error body. |
| 6 | `/orders/:id/receipt` has an isolated 850 ms delay. | Receipt path stays within its budget | Expected ≤250 ms; observed roughly 850 ms. |

`Orders service is healthy` is the control check. It should pass so a run proves the evaluator distinguishes healthy behavior from planted failures rather than failing indiscriminately.

Phase 3 intentionally fixes only defect 4 after an engineer proposal, independent approval and passing staging re-verification. The remaining five defects stay planted so subsequent full runs still demonstrate useful negative findings.
