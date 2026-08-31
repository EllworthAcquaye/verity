# Phase 5 acceptance evidence

Verified from a clean, newly seeded Docker Compose state on 31 August 2026.

## Automated quality

- dependency-cruiser: 118 modules and 179 dependencies, zero boundary violations.
- Node architecture suite: 10 passed.
- Python unit/governance suite: 13 passed.
- Dedicated model evaluations: 4 passed.
- Next.js production build, lint and route-aware type checking: passed.
- Playwright role suite: 4 passed across anonymous, viewer, engineer and approver behavior, including persisted dark mode.
- Playwright governed reviewer flow: 1 passed, covering ordinary execution, a real finding, bounded proposal, distinct-person approval, isolated staging re-verification, 100% focused score and verified promotion.

## Live-system invariants

- Phase 2 integration: duplicate delivery remained idempotent, Redis had no pending work, the unsigned callback returned 401 and PostgreSQL rejected evidence mutation.
- Phase 3 integration: the approval actor differed from the proposer, the linked staging run passed, the exact source was promoted and PostgreSQL rejected both approval bypass and audit mutation.
- Operational integration: an unsigned CI trigger returned 401; a repeated idempotency key returned the same run; the quality decision reached success; an authenticated due schedule produced a completed scheduled run.

## Performance and supply chain

- k6 2.2.0, digest pinned: 7,518 HTTP requests and 10,024 checks over 10 seconds at five virtual users.
- Unexpected request failures: 0.00%.
- Request duration: 18.28 ms p95 against a threshold of 750 ms; 435.94 ms maximum.
- Python audit: no known vulnerabilities.
- npm audit: no unreviewed high or critical vulnerabilities. One Prisma-configuration-only transitive advisory is explicitly accepted and documented in `DECISIONS.md` until Prisma publishes a compatible patched release.
- CycloneDX 1.7 production SBOM: generated successfully from the locked pnpm workspace.
- GitHub Actions: every action is commit-SHA pinned; repository history is scanned with Gitleaks; browser traces, logs and the SBOM are retained as workflow artifacts.

## Deliberate substitutions

- Compose acceptance replaces Testcontainers because it exercises the delivered multi-service topology rather than duplicating partial container fixtures.
- A static GitHub Pages console is excluded because it cannot honestly run the backend. Production screenshots, the in-product OpenAPI route and executable repository are the public proof.
- The reviewer guide contains an optional four-minute narrated walkthrough. The repository does not claim that a recording exists until its link is added.
