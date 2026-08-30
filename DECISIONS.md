# Architecture decisions

Resolved against the npm registry, PyPI, official language release pages, and official container manifests on 2026-08-29.

## ADR-001: Generated checks are data

The model may emit only the discriminated `CheckDefinition` schema. The runner interprets five fixed operations: HTTP request, status assertion, JSON-path assertion, latency budget, and replay comparison. Unknown fields and operations are rejected. There is no dynamic import, tool use, template-to-shell path, `eval`, or `exec`. A generated check can be `readonly` or `probe`; `mutate` is structurally impossible.

## ADR-002: Planes meet through narrow contracts

The TypeScript control plane owns state, transactional outbox, RBAC, approvals, and audit. The Python execution plane receives work through Redis Streams and returns results through one authenticated API. Its container has no PostgreSQL credential and shares no control-plane data network.

## ADR-003: Evidence and decisions are append-only

Evidence is canonicalized and hashed before write, then verified on read. Audit events include the previous event hash. Corrections are new records. Approval is a database fact, not a UI flag; the production migration adds a deferred constraint trigger preventing `applied` without an approving row.

## ADR-004: Local model first, cloud comparison by explicit opt-in

Ollama is the default generation provider and `qwen3:1.7b` is pulled automatically by Docker Compose. The Q4 model fits a roughly 3 GiB Docker VM while leaving enough headroom for inference; the larger 4B instruct model is an opt-in override for machines with more memory. Model output is constrained to JSON Schema and then strictly validated by Pydantic before it can enter the declarative check evaluator. No cloud key is required. Cassette replay is retained only for deterministic CI, recovery, and low-resource machines; it is not presented as live AI generation.

Anthropic is an optional comparison provider behind the same `CheckGenerator` contract. It uses the Messages API structured-output JSON Schema, temperature zero and the same second Pydantic validation and target-scope check as Ollama. The key is accepted only through the runner environment. `compose.anthropic.yaml` explicitly adds runner egress, so the default topology cannot silently call a cloud provider. A small credit balance is sufficient for a bounded Haiku comparison, but the reviewer path remains fully functional without it.

The Ollama daemon alone receives outbound access through `model-egress` to retrieve the pinned model. The runner communicates with it on a separate internal network, and the control plane has no model route or model configuration.

The model-facing schema is narrower than the stored DSL: it emits one candidate at `probe` trust. Specification markers select typed strategies; the idempotency strategy requires exactly one request, one status assertion, and one `side_effect_count` replay assertion. Pydantic then validates the result against the broader governed contract. This is constrained planning, not free-form code generation.

## ADR-005: pnpm owns dependencies; Turborepo owns the task graph

The JavaScript and TypeScript workspace uses one root lockfile. Turborepo provides dependency-aware task ordering and local caching for build, lint, and route-aware type checking. Python tests, Compose integration tests, model evaluations, and performance gates remain explicit top-level checks rather than being disguised as JavaScript package tasks.

## ADR-006: Auth.js is a time-boxed reviewer-auth exception

The control plane uses stable Auth.js 4 credentials sessions for v1. Credentials are verified against bcrypt hashes in PostgreSQL, roles travel in signed JWT sessions, and protected route groups enforce authentication on the server. This was selected to finish a deterministic four-persona reviewer flow with the smallest established surface, not because Auth.js is the preferred 2026 greenfield authentication product.

Auth.js is now part of the Better Auth project, and Better Auth is the intended migration target if Verity becomes a maintained application. The migration is triggered by any requirement for organizations, external OAuth, passkeys, account recovery, SSO/SCIM or production account lifecycle controls. Those needs would justify its additional tables and integration work; they do not improve the current local proof. This exception must be revisited before any public multi-user deployment.

Prisma 7.10 is selected because Prisma 8 remains a release candidate; migrations and seed run in a non-root one-shot container before the control plane starts.

## ADR-007: The embedded target is a reproducible fixture, not the integration architecture

`apps/target` is kept beside Verity to make the evaluation deterministic, offline-capable and safe to remediate. It represents a customer staging service for the walkthrough; Verity does not require customer source code or application binaries to live in its repository.

The production-shaped connection flow is: register an application and environment → store an encrypted credential reference → dispatch a scoped job → resolve credentials inside a customer-network runner/CI agent → call only allowlisted endpoints → return redacted typed evidence. Private runners, sidecars, private network links, CI integrations and signed webhooks are transport/deployment variations around that contract. Arbitrary external targets and secret-management integration remain explicitly outside v1.

The fixture now uses its own PostgreSQL service and `target-data` network. The runner can reach the target HTTP service but cannot reach that database; the control plane can reach neither. This preserves realistic state for replay checks without weakening the execution boundary.

## ADR-008: Delivery is at-least-once and result persistence is idempotent

Run, CheckRun and OutboxMessage records commit in one PostgreSQL transaction. Publishing happens after commit, so a relay failure leaves inspectable queued work. Redis Streams supplies a consumer group and explicit acknowledgement. The runner writes a run-scoped idempotency claim before touching the target, reports through a bearer-authenticated callback, marks the claim complete only after a successful callback, and acknowledges last.

Publishing followed by a control-plane crash may redeliver a message; that is an intended at-least-once edge, not an exactly-once claim. The completed Redis claim suppresses target re-execution, `(runId, checkId)` and `(checkRunId, title)` constraints suppress duplicate state, and evidence has a `(checkRunId, type, sha256)` uniqueness boundary. The integration gate duplicates a live stream entry and asserts that evidence remains unchanged while the consumer group returns to zero pending messages.

## ADR-009: Remediation is fixed-file, independently approved and verified before promotion

V1 deliberately remediates only the seeded order-idempotency defect. The remediator owns two constant paths and one exact vulnerable-to-fixed transformation; request data cannot select a file, command, patch context or executable operation. The proposal is a bounded unified diff whose SHA-256 is checked by both control and remediator. Production and staging source live in separate Docker volumes, and staging has its own PostgreSQL service.

The proposer and approver must differ. Server RBAC provides a clear user error while the `Approval_actor_guard` and deferred `Remediation_approval_guard` triggers preserve the invariant under any database client. Approval stages the diff and queues the original failed check against staging. The authenticated result callback promotes only when every verification result passes; otherwise it restores staging from production. This is a governed demonstration of evidence-driven change, not a claim of arbitrary autonomous code repair.

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
| Redis image | 8.10 Alpine, multi-arch digest pinned |
| Redis Node client | 6.2.1 |
| PostgreSQL Node client (`pg`) | 8.23.0 |
| Ollama image | 0.33.2, multi-arch digest pinned |
| Default local model | `qwen3:1.7b` |
| Python | 3.14.7 |
| FastAPI | 0.141.1 |
| Pydantic | 2.13.5 |
| httpx | 0.28.1 |
| import-linter | 2.14 |

The retired Sites/Vinext preview is preserved at tag `v0.1-ui-preview`. The canonical implementation is the Docker Compose system on `feat/e2e-platform`; application materials will point to it only after the end-to-end gate and recording pass.
