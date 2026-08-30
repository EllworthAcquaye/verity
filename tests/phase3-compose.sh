#!/usr/bin/env bash
set -euo pipefail

verified="$(docker compose exec -T postgres psql -U verity -d verity -Atc 'SELECT count(*) FROM "Remediation" remediation JOIN "Approval" approval ON approval."remediationId" = remediation.id JOIN "Run" run ON run.id = remediation."verificationRunId" WHERE remediation.status = '\''verified'\'' AND approval.decision = '\''approved'\'' AND approval."actorId" <> remediation."proposedById" AND run."passRate" = 1;')"
promoted="$(docker compose exec -T target node -e "const fs=require('node:fs'); process.stdout.write(String(fs.readFileSync('/app/runtime/server.js','utf8').includes('if (existing.rows[0]) return response.status(201).json(existing.rows[0]);')))" )"

[[ "$verified" -ge 1 ]] || { echo "no independently approved, passing remediation" >&2; exit 1; }
[[ "$promoted" == "true" ]] || { echo "verified source was not promoted" >&2; exit 1; }

if docker compose exec -T postgres psql -U verity -d verity -v ON_ERROR_STOP=1 -c 'INSERT INTO "Remediation" (id, "findingId", "proposedById", "proposedDiff", rationale, status) SELECT '\''phase3_guard_probe'\'', id, '\''user_engineer'\'', '\''probe'\'', '\''must fail'\'', '\''applied'\'' FROM "Finding" LIMIT 1;' >/dev/null 2>&1; then
  echo "remediation became applied without approval" >&2
  exit 1
fi

if docker compose exec -T postgres psql -U verity -d verity -v ON_ERROR_STOP=1 -c 'UPDATE "AuditEvent" SET action = '\''tampered'\'' WHERE id = (SELECT id FROM "AuditEvent" LIMIT 1);' >/dev/null 2>&1; then
  echo "append-only audit accepted a mutation" >&2
  exit 1
fi

echo "phase3 compose integration gate passed"
