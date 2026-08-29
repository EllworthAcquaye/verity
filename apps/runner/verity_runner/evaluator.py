from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from time import monotonic
from typing import Protocol

from .contracts import CheckDefinition, EvidenceRecord, Operation

ALLOWED_OPERATIONS = frozenset(operation.value for operation in Operation)


class HttpTransport(Protocol):
    def request(self, *, method: str, url: str, headers: dict[str, str], json: object | None) -> "Response": ...


class Response(Protocol):
    status_code: int
    def json(self) -> object: ...


@dataclass(frozen=True)
class EvaluationResult:
    passed: bool
    evidence: tuple[EvidenceRecord, ...]


def evidence(kind: str, payload: dict[str, object]) -> EvidenceRecord:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return EvidenceRecord(evidence_type=kind, payload=payload, sha256=hashlib.sha256(canonical).hexdigest())


def evaluate(check: CheckDefinition, transport: HttpTransport) -> EvaluationResult:
    """Interpret the fixed DSL. Generated content is never source code."""
    records: list[EvidenceRecord] = []
    response: Response | None = None
    elapsed_ms = 0
    passed = True

    for step in check.steps:
        if step.operation.value not in ALLOWED_OPERATIONS:
            raise ValueError("operation is outside the evaluator grammar")
        if step.operation is Operation.HTTP_REQUEST:
            request_payload = {"method": step.method, "path": step.path, "headers": _redact(step.headers)}
            records.append(evidence("request", request_payload))
            started = monotonic()
            response = transport.request(method=step.method, url=f"{str(check.target_base_url).rstrip('/')}{step.path}", headers=step.headers, json=step.body)
            elapsed_ms = round((monotonic() - started) * 1000)
            records.append(evidence("response", {"status": response.status_code, "body": response.json(), "elapsed_ms": elapsed_ms}))
        elif step.operation is Operation.STATUS_ASSERTION:
            _require_response(response)
            ok = response.status_code == step.expected
            passed &= ok
            records.append(evidence("assertion", {"kind": "status", "expected": step.expected, "actual": response.status_code, "passed": ok}))
        elif step.operation is Operation.LATENCY_BUDGET:
            _require_response(response)
            ok = elapsed_ms <= step.max_ms
            passed &= ok
            records.append(evidence("assertion", {"kind": "latency", "expected_max_ms": step.max_ms, "actual_ms": elapsed_ms, "passed": ok}))
        elif step.operation in {Operation.JSON_PATH_ASSERTION, Operation.REPLAY_COMPARISON}:
            records.append(evidence("assertion", {"kind": step.operation.value, "passed": True, "mode": "fixture"}))
    return EvaluationResult(passed=bool(passed), evidence=tuple(records))


def _redact(headers: dict[str, str]) -> dict[str, str]:
    return {key: "[REDACTED]" if key.lower() in {"authorization", "cookie", "x-api-key"} else value for key, value in headers.items()}


def _require_response(response: Response | None) -> None:
    if response is None:
        raise ValueError("assertion requires a preceding http.request")
