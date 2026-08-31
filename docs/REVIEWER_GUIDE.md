# Verity reviewer guide

This is an independent engineering study, not a clone or company-affiliated product. The fixture target makes the full system reproducible; in a production deployment the isolated runner connects to a registered customer staging endpoint over private networking.

## Optional four-minute recording

1. **0:00–0:30 — Architecture.** Show the README diagram and `docker compose ps`. Call out separate control, execution, target, staging, model and governance networks; the Python runner has no database credential.
2. **0:30–1:05 — Governed intent.** Sign in as `engineer@verity.local` / `Verity123!`. Open Specifications → Studio → Test Library. Generate with Ollama and show that the candidate is schema-valid, deterministic on replay and draft until reviewed.
3. **1:05–1:50 — Real execution.** Run the approved suite. Show SSE progress, persisted findings, the intentionally low pass rate, recomputed evidence hashes and the signed evidence export.
4. **1:50–2:55 — Human-gated remediation.** Propose the allowlisted idempotency fix as engineer. Sign in as `approver@verity.local` / `Verity123!`, record the reason, and run the exact check against isolated staging. Show its 100 score and verified promotion.
5. **2:55–3:35 — Operations.** Open Quality scores, Schedules and API reference. Explain that manual, scheduled and idempotent CI runs reuse one transactional outbox path.
6. **3:35–4:00 — Trust close.** Open Audit chain and show verification from genesis to head. End on scope: this proves cross-stack architecture and control discipline, not general autonomous remediation.

## Captured production views

![Persisted control-center posture](screenshots/dashboard.png)

![Reliability scores in dark mode](screenshots/quality-scores-dark.png)

![Persisted verification schedules](screenshots/schedules.png)

![OpenAPI-backed integration reference](screenshots/api-reference.png)

![Governed run with signed evidence export](screenshots/governed-run.png)

![Responsive nested sidebar](screenshots/mobile-sidebar.png)

## Release proof

```bash
pnpm check
pnpm test:python
pnpm test:eval
pnpm test:e2e:full
pnpm test:integration
pnpm test:phase3
pnpm test:operational
pnpm test:performance
pnpm security:audit
pnpm supply-chain:sbom
```

The seeded application is supposed to fail most checks; discovering those failures is the product behavior. The demo CI gate uses a 10% minimum only to prove automated discovery reaches a terminal decision. A healthy integration should raise the threshold to its release policy.
