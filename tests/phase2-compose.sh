#!/usr/bin/env bash
set -euo pipefail

evidence_before="$(docker compose exec -T postgres psql -U verity -d verity -Atc 'SELECT count(*) FROM "Evidence";')"
if [[ "$evidence_before" == "0" ]]; then
  echo "integration gate requires one completed reviewer run" >&2
  exit 1
fi

docker compose exec -T redis redis-cli EVAL "local e=redis.call('XREVRANGE',KEYS[1],'+','-', 'COUNT',1); local f=e[1][2]; return redis.call('XADD',KEYS[1],'*',unpack(f))" 1 verity:runs >/dev/null
sleep 2

evidence_after="$(docker compose exec -T postgres psql -U verity -d verity -Atc 'SELECT count(*) FROM "Evidence";')"
pending="$(docker compose exec -T redis redis-cli XPENDING verity:runs verity-runners | head -1)"
callback_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/runner/results -H 'content-type: application/json' -d '{}')"

[[ "$evidence_before" == "$evidence_after" ]] || { echo "duplicate delivery created evidence" >&2; exit 1; }
[[ "$pending" == "0" ]] || { echo "consumer group has pending work" >&2; exit 1; }
[[ "$callback_status" == "401" ]] || { echo "unsigned callback was not rejected" >&2; exit 1; }

if docker compose exec -T postgres psql -U verity -d verity -v ON_ERROR_STOP=1 -c 'UPDATE "Evidence" SET "sha256" = repeat('"'"'0'"'"', 64) WHERE "id" = (SELECT "id" FROM "Evidence" LIMIT 1);' >/dev/null 2>&1; then
  echo "append-only evidence accepted a mutation" >&2
  exit 1
fi

echo "phase2 compose integration gate passed"
