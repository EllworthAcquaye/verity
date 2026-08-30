from __future__ import annotations

import asyncio
import os
import socket
from time import monotonic

import httpx
from pydantic import ValidationError
from redis.asyncio import Redis
from redis.exceptions import ResponseError

from .contracts import CheckJob, CheckResult, RunJob, RunResult
from .evaluator import evaluate, evidence

STREAM = "verity:runs"
GROUP = "verity-runners"


class RunWorker:
    """Consumes governed jobs without database access and reports signed results."""

    def __init__(self) -> None:
        self.redis = Redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379"), decode_responses=True)
        self.consumer = f"runner-{socket.gethostname()}"
        self.callback_url = f"{os.getenv('CONTROL_API_URL', 'http://control:3000/api/runner').rstrip('/')}/results"
        self.callback_token = os.getenv("RUNNER_CALLBACK_TOKEN", "")
        self.target_base_url = os.getenv("TARGET_BASE_URL", "http://target:4000").rstrip("/")
        self.active_run: str | None = None
        self.completed_runs = 0

    async def run(self) -> None:
        try:
            await self.redis.xgroup_create(STREAM, GROUP, id="0", mkstream=True)
        except ResponseError as error:
            if "BUSYGROUP" not in str(error):
                raise

        while True:
            try:
                # Drain this consumer's unacknowledged entries first so a process restart
                # resumes work instead of leaving it stranded in the pending list.
                messages = await self.redis.xreadgroup(GROUP, self.consumer, {STREAM: "0"}, count=1)
                if not messages or not messages[0][1]:
                    messages = await self.redis.xreadgroup(GROUP, self.consumer, {STREAM: ">"}, count=1, block=1_000)
                if not messages:
                    continue
                for _, entries in messages:
                    for message_id, fields in entries:
                        await self._handle(message_id, fields)
            except asyncio.CancelledError:
                raise
            except Exception:
                await asyncio.sleep(1)

    async def close(self) -> None:
        await self.redis.aclose()

    async def _handle(self, message_id: str, fields: dict[str, str]) -> None:
        try:
            job = RunJob.model_validate_json(fields["payload"])
        except (KeyError, ValidationError):
            await self.redis.xack(STREAM, GROUP, message_id)
            return

        state_key = f"verity:run-state:{job.run_id}"
        state = await self.redis.get(state_key)
        if state == "completed":
            await self.redis.xack(STREAM, GROUP, message_id)
            return
        if state == self.consumer:
            claimed = await self.redis.expire(state_key, 300)
        else:
            claimed = await self.redis.set(state_key, self.consumer, nx=True, ex=300)
        if not claimed:
            return

        self.active_run = job.run_id
        try:
            result = await asyncio.to_thread(self._execute, job)
            await self._report(result)
            await self.redis.set(state_key, "completed", ex=86_400)
            await self.redis.xack(STREAM, GROUP, message_id)
            self.completed_runs += 1
        except Exception:
            await self.redis.delete(state_key)
            raise
        finally:
            self.active_run = None

    def _execute(self, job: RunJob) -> RunResult:
        with httpx.Client(timeout=10, follow_redirects=False) as transport:
            results = [self._execute_check(check, transport) for check in job.checks]
        return RunResult(run_id=job.run_id, results=results)

    def _execute_check(self, check: CheckJob, transport: httpx.Client) -> CheckResult:
        started = monotonic()
        try:
            target = str(check.definition.target_base_url).rstrip("/")
            if target != self.target_base_url:
                raise ValueError("check target is outside the configured execution boundary")
            result = evaluate(check.definition, transport)
            status = "passed" if result.passed else "failed"
            records = list(result.evidence)
            error = None
        except Exception as caught:
            status = "error"
            error = str(caught)[:2_000]
            records = [evidence("trace", {"kind": "execution_error", "message": error})]
        return CheckResult(
            check_run_id=check.check_run_id,
            check_id=check.check_id,
            service_id=check.service_id,
            status=status,
            duration_ms=round((monotonic() - started) * 1000),
            error=error,
            evidence=records,
        )

    async def _report(self, result: RunResult) -> None:
        if not self.callback_token:
            raise RuntimeError("RUNNER_CALLBACK_TOKEN is required")
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                self.callback_url,
                headers={"authorization": f"Bearer {self.callback_token}"},
                json=result.model_dump(mode="json"),
            )
            response.raise_for_status()
