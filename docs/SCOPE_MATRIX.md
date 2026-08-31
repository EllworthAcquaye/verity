# Verity scope and claim matrix

This file is the audit boundary for the portfolio claim. It distinguishes what the repository demonstrably delivers from substitutions, optional enhancements and non-goals.

## Core reviewer acceptance

| Reviewer outcome | Status | Evidence |
| --- | --- | --- |
| Clone and start the complete runtime with Docker Compose | Delivered | `compose.yaml`, health checks, migration/seed initializer |
| Sign in with seeded governed roles | Delivered | viewer, engineer, approver and admin Playwright coverage |
| Inspect an application topology and requirement coverage | Delivered | Applications, System Graph and Coverage routes backed by PostgreSQL |
| Generate a check without a cloud key | Delivered | Ollama `qwen3:1.7b`; cassette is recovery/CI only |
| Review a draft before it can execute | Delivered | strict check schema, draft/validated/rejected states and RBAC actions |
| Run real probes and see live state | Delivered | transactional outbox, Redis Stream, Python worker and authenticated SSE |
| Discover planted defects with typed evidence | Delivered | six target defects, redaction, canonical hashes and Results UI |
| Propose, independently approve and stage a repair | Delivered for the idempotency defect | fixed-file remediator, distinct-person rule and PostgreSQL guards |
| Re-run in staging and promote or roll back | Delivered for the idempotency defect | hash-bound staging verification and callback-driven outcome |
| Verify an append-only audit history | Delivered | hash chain, read verification and database update/delete guards |
| Reproduce quality gates | Delivered | architecture, Python, eval, Playwright, Compose integration, audit, SBOM and k6 scripts |

## Delivered supporting surfaces

- Versioned structured specifications, Studio, Test Library and AI Agents.
- Home posture, system/service Quality Scores and run trends.
- Database-backed schedules with pause/resume and authenticated scheduler tick.
- Idempotent bearer-authenticated CI trigger and threshold status endpoint.
- OpenAPI 3.1 JSON plus an in-product readable API reference.
- Session-authorized, HMAC-SHA256 signed run-evidence export.
- Light, dark and system themes with responsive nested shadcn sidebars.
- Local Ollama generation and an optional Anthropic comparison adapter.

## Deliberate substitutions

| Initial idea | Delivered decision | Reason |
| --- | --- | --- |
| Anthropic required for generation | Local Ollama is the default; Anthropic is optional | A reviewer gets the complete changing-input experience without a paid key. |
| Separate Node/Python Testcontainers suites | Live Compose acceptance suites | The real topology exercises more meaningful boundaries once, without maintaining a second partial topology. |
| Static GitHub Pages console | Repository, screenshots and local Compose runtime | A static page cannot run server actions, databases, queues, execution or remediation and would misrepresent the product. |
| Heavy multi-service suite on every push | Fast push/PR gates plus explicit manual governed-E2E job | Keeps ordinary CI bounded while preserving a reproducible full-system gate and artifacts. |
| Generic repair engine | One fixed-file idempotency repair | Makes the dangerous path genuinely end-to-end without pretending arbitrary model patches are safe. |
| Scalar dependency | Small in-product OpenAPI reference plus raw 3.1 document | Preserves the contract and reviewer readability without adding a documentation runtime. |

## Not delivered and not claimed

The following appeared in the broad discovery plan but were intentionally removed from the scoped application artifact:

- four generated report templates and a dedicated Reports route;
- an outgoing signed completion-webhook delivery system;
- a visual connector catalogue or generic external-target onboarding flow;
- a desktop right-side activity rail;
- filter/export controls for the Audit page (the chain itself is visible and verified);
- a hosted multi-service deployment;
- a finished narrated video;
- multi-tenancy, organizations, production account lifecycle, SSO/SCIM or billing;
- arbitrary-code execution, arbitrary remediation or production certification.

These omissions reduce breadth, not the core claim. The demonstrated claim is the complete governed path from structured intent through isolated execution, evidence, independent approval, staging verification and audit.

## Claims safe to make in an interview

- “The model proposes declarative checks; it never emits source that the runner executes.”
- “Run creation and dispatch use a transactional outbox, Redis Streams and idempotent result persistence.”
- “The worker is database-blind and can reach only configured target endpoints.”
- “Evidence is redacted, canonicalized, hashed, append-only and reverified on read.”
- “The repair path is deliberately fixed-file and requires a different human approver plus a passing staging re-check.”
- “The system uses at-least-once delivery with idempotent handling; I do not claim exactly-once execution.”
- “This is a narrow independent study, not a clone, production certification or general autonomous remediation platform.”

## Claims not to make

- Do not call Verity production-ready, multi-tenant or generally autonomous.
- Do not say every original brainstormed feature shipped.
- Do not say the k6 smoke test establishes capacity; it establishes one explicit regression threshold.
- Do not say a SHA-256 hash alone proves authorship; the export HMAC and access to its key address provenance.
- Do not say Docker networks are a complete production sandbox; they make the demo boundary concrete and testable.
- Do not say the full Compose/Ollama suite runs on every push; it is an explicit manual workflow job.
