# Architecture decisions

Resolved against the npm registry, PyPI, official language release pages, and official container manifests on 2026-08-29.

## ADR-001: Generated checks are data

The model may emit only the discriminated `CheckDefinition` schema. The runner interprets five fixed operations: HTTP request, status assertion, JSON-path assertion, latency budget, and replay comparison. Unknown fields and operations are rejected. There is no dynamic import, tool use, template-to-shell path, `eval`, or `exec`. A generated check can be `readonly` or `probe`; `mutate` is structurally impossible.

## ADR-002: Planes meet through narrow contracts

The TypeScript control plane owns state, transactional outbox, RBAC, approvals, and audit. The Python execution plane receives work through Redis Streams and returns results through one authenticated API. Its container has no PostgreSQL credential and shares no control-plane data network.

## ADR-003: Evidence and decisions are append-only

Evidence is canonicalized and hashed before write, then verified on read. Audit events include the previous event hash. Corrections are new records. Approval is a database fact, not a UI flag; the production migration adds a deferred constraint trigger preventing `applied` without an approving row.

## ADR-004: Offline first

Cassette replay is the default. Live Anthropic generation is opt-in, schema-constrained, bounded by timeout and token budget, and never required for the demo.

## Resolved versions

| Surface | Version selected |
| --- | --- |
| Next.js target architecture | 16.3.3 |
| TypeScript | 7.0.2 |
| React | 19.2.6 (Sites runtime pin) |
| Prisma / client | 7.10.0 |
| Auth.js stable | 4.24.15 |
| React Flow (`@xyflow/react`) | 12.11.5 |
| Express | 5.2.1 |
| PostgreSQL image | 18.4 Alpine, multi-arch digest pinned |
| Redis image | 8.10.1 Alpine, multi-arch digest pinned |
| Python | 3.14.7 |
| FastAPI | 0.141.1 |
| Pydantic | 2.13.5 |
| httpx | 0.28.1 |
| Anthropic Python SDK | 1.2.0 |
| import-linter | 2.14 |

The deployed reviewer console uses the OpenAI Sites Vinext/Cloudflare-compatible runtime, pinned by its lockfile. The repository contracts deliberately describe the full target architecture without pretending the static public demonstration is a hosted Docker cluster.
