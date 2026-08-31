#!/usr/bin/env bash
set -euo pipefail

control_url="${CONTROL_URL:-http://localhost:3000}"
ci_token="${CI_TRIGGER_TOKEN:-verity-local-ci-trigger-change-outside-demo}"
scheduler_token="${SCHEDULER_TOKEN:-verity-local-scheduler-change-outside-demo}"
key="operational-${GITHUB_RUN_ID:-local}-$(date +%s)"

cleanup() {
  docker compose exec -T postgres psql -U verity -d verity -c 'UPDATE "Schedule" SET enabled=false WHERE id='"'"'schedule_release_verification'"'"';' >/dev/null 2>&1 || true
  docker compose start scheduler >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in {1..60}; do
  if curl -fsS "$control_url/login" >/dev/null; then break; fi
  sleep 2
done

unauthorized="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$control_url/api/ci/runs" -H "Idempotency-Key: $key")"
[[ "$unauthorized" == "401" ]] || { echo "CI endpoint accepted an unsigned request" >&2; exit 1; }

first="$(curl -fsS -X POST "$control_url/api/ci/runs" -H "Authorization: Bearer $ci_token" -H "Idempotency-Key: $key")"
run_id="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).runId)' "$first")"
second="$(curl -fsS -X POST "$control_url/api/ci/runs" -H "Authorization: Bearer $ci_token" -H "Idempotency-Key: $key")"
duplicate_id="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).runId)' "$second")"
duplicate="$(node -e 'process.stdout.write(String(JSON.parse(process.argv[1]).duplicate))' "$second")"
[[ "$run_id" == "$duplicate_id" && "$duplicate" == "true" ]] || { echo "CI trigger was not idempotent" >&2; exit 1; }

conclusion="pending"
for _ in {1..60}; do
  status="$(curl -fsS "$control_url/api/ci/runs/$run_id?minimumPassRate=0.1" -H "Authorization: Bearer $ci_token")"
  conclusion="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).conclusion)' "$status")"
  [[ "$conclusion" != "pending" ]] && break
  sleep 2
done
[[ "$conclusion" == "success" ]] || { echo "CI quality gate did not pass" >&2; exit 1; }

tick_unauthorized="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$control_url/api/internal/schedules/tick")"
[[ "$tick_unauthorized" == "401" ]] || { echo "scheduler endpoint accepted an unsigned request" >&2; exit 1; }
docker compose stop scheduler >/dev/null
docker compose exec -T postgres psql -U verity -d verity -c 'UPDATE "Schedule" SET enabled=true, "nextRunAt"=CURRENT_TIMESTAMP - INTERVAL '"'"'1 minute'"'"' WHERE id='"'"'schedule_release_verification'"'"';' >/dev/null
tick="$(curl -fsS -X POST "$control_url/api/internal/schedules/tick" -H "Authorization: Bearer $scheduler_token")"
scheduled_run_id="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).runIds[0] ?? "")' "$tick")"
[[ -n "$scheduled_run_id" ]] || { echo "due schedule did not create a run" >&2; exit 1; }

scheduled_status=""
for _ in {1..60}; do
  scheduled_status="$(docker compose exec -T postgres psql -U verity -d verity -Atc "SELECT status FROM \"Run\" WHERE id='$scheduled_run_id';")"
  [[ "$scheduled_status" == "completed" || "$scheduled_status" == "failed" ]] && break
  sleep 2
done
[[ "$scheduled_status" == "completed" ]] || { echo "scheduled run did not complete" >&2; exit 1; }

echo "operational compose gate passed: CI $run_id; scheduled $scheduled_run_id"
