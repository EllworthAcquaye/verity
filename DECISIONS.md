# Architecture decisions

Resolved against the npm registry, PyPI, official language release pages, and official container manifests on 2026-08-29.

## ADR-001: Generated checks are data

The model may emit only the discriminated `CheckDefinition` schema. The runner interprets five fixed operations: HTTP request, status assertion, JSON-path assertion, latency budget, and replay comparison. Unknown fields and operations are rejected. There is no dynamic import, tool use, template-to-shell path, `eval`, or `exec`. A generated check can be `readonly` or `probe`; `mutate` is structurally impossible.

## ADR-002: Planes meet through narrow contracts

The TypeScript control plane owns state, transactional outbox, RBAC, approvals, and audit. The Python execution plane receives work through Redis Streams and returns results through one authenticated API. Its container has no PostgreSQL credential and shares no control-plane data network.

## ADR-003: Evidence and decisions are append-only

Evidence is canonicalized and hashed before write, then verified on read. Audit events include the previous event hash. Corrections are new records. Approval is a database fact, not a UI flag; the production migration adds a deferred constraint trigger preventing `applied` without an approving row.

## ADR-004: Local model first

Ollama is the default generation provider and `qwen3:1.7b` is pulled automatically by Docker Compose. The Q4 model fits a roughly 3 GiB Docker VM while leaving enough headroom for inference; the larger 4B instruct model is an opt-in override for machines with more memory. Model output is constrained to JSON Schema and then strictly validated by Pydantic before it can enter the declarative check evaluator. No cloud key is required. Cassette replay is retained only for deterministic CI, recovery, and low-resource machines; Anthropic is an optional adapter.

The Ollama daemon alone receives outbound access through `model-egress` to retrieve the pinned model. The runner communicates with it on a separate internal network, and the control plane has no model route or model configuration.

The model-facing schema is narrower than the stored DSL: it emits one candidate at `probe` trust. Specification markers select typed strategies; the idempotency strategy requires exactly one request, one status assertion, and one `side_effect_count` replay assertion. Pydantic then validates the result against the broader governed contract. This is constrained planning, not free-form code generation.

## ADR-005: pnpm owns dependencies; Turborepo owns the task graph

The JavaScript and TypeScript workspace uses one root lockfile. Turborepo provides dependency-aware task ordering and local caching for build, lint, and route-aware type checking. Python tests, Compose integration tests, model evaluations, and performance gates remain explicit top-level checks rather than being disguised as JavaScript package tasks.

## ADR-006: Stable authentication and migration surfaces

The control plane uses stable Auth.js 4 credentials sessions rather than the Auth.js 5 beta line. Credentials are verified against bcrypt hashes in PostgreSQL, roles travel in signed JWT sessions, and protected route groups enforce authentication on the server. Prisma 7.10 is selected because Prisma 8 remains a release candidate; migrations and seed run in a non-root one-shot container before the control plane starts.

## Resolved versions

| Surface | Version selected |
| --- | --- |
| Next.js target architecture | 16.3.3 |
| TypeScript | 5.9.3 |
| React | 19.2.8 |
| pnpm | 11.19.0 |
| Turborepo | 2.10.12 |
| Prisma / client | 7.10.0 |
| Auth.js stable | 4.24.15 |
| React Flow (`@xyflow/react`) | 12.11.5 |
| Express | 5.2.1 |
| PostgreSQL image | 18.4 Alpine, multi-arch digest pinned |
| Redis image | 8.10.1 Alpine, multi-arch digest pinned |
| Ollama image | 0.33.2, multi-arch digest pinned |
| Default local model | `qwen3:1.7b` |
| Python | 3.14.7 |
| FastAPI | 0.141.1 |
| Pydantic | 2.13.5 |
| httpx | 0.28.1 |
| import-linter | 2.14 |

The retired Sites/Vinext preview is preserved at tag `v0.1-ui-preview`. The canonical implementation is the Docker Compose system on `feat/e2e-platform`; application materials will point to it only after the end-to-end gate and recording pass.
