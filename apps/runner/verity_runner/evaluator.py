from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from time import monotonic
from typing import Protocol

from .contracts import CheckDefinition, EvidenceRecord, HttpRequest, Operation

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
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    return EvidenceRecord(evidence_type=kind, payload=payload, sha256=hashlib.sha256(canonical).hexdigest())


def evaluate(check: CheckDefinition, transport: HttpTransport) -> EvaluationResult:
    """Interpret the fixed DSL. Generated content is never source code."""
    records: list[EvidenceRecord] = []
    response: Response | None = None
    response_body: object | None = None
    request_step: HttpRequest | None = None
    elapsed_ms = 0
    passed = True

    for step in check.steps:
        if step.operation.value not in ALLOWED_OPERATIONS:
            raise ValueError("operation is outside the evaluator grammar")
        if step.operation is Operation.HTTP_REQUEST:
            request_step = step
            request_payload = {"method": step.method, "path": step.path, "headers": _redact(step.headers)}
            if step.body is not None:
                request_payload["body"] = step.body
            records.append(evidence("request", request_payload))
            started = monotonic()
            response = transport.request(method=step.method, url=f"{str(check.target_base_url).rstrip('/')}{step.path}", headers=step.headers, json=step.body)
            elapsed_ms = round((monotonic() - started) * 1000)
            response_body = _response_json(response)
            records.append(evidence("response", {"status": response.status_code, "body": response_body, "elapsed_ms": elapsed_ms}))
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
        elif step.operation is Operation.JSON_PATH_ASSERTION:
            _require_response(response)
            found, actual = _json_path(response_body, step.path)
            if step.comparator == "exists":
                ok = found
            elif step.comparator == "equals":
                ok = found and actual == step.expected
            else:
                ok = found and isinstance(step.expected, str) and re.search(step.expected, str(actual)) is not None
            passed &= ok
            records.append(evidence("assertion", {
                "kind": "json_path",
                "path": step.path,
                "comparator": step.comparator,
                "expected": step.expected,
                "actual": actual,
                "passed": ok,
            }))
        elif step.operation is Operation.REPLAY_COMPARISON:
            _require_response(response)
            if request_step is None:
                raise ValueError("replay assertion requires a preceding http.request")
            base_url = str(check.target_base_url).rstrip("/")
            url = f"{base_url}{request_step.path}"
            before_count: int | None = None
            if step.compare == "side_effect_count":
                before_count = _observe_collection_count(transport, url, request_step.headers)
            replay_responses: list[dict[str, object]] = []
            comparison_values: list[object] = [response.status_code if step.compare == "status" else response_body]
            for attempt in range(1, step.repetitions):
                replay_started = monotonic()
                replay_response = transport.request(method=request_step.method, url=url, headers=request_step.headers, json=request_step.body)
                replay_body = _response_json(replay_response)
                replay_elapsed_ms = round((monotonic() - replay_started) * 1000)
                replay_responses.append({"attempt": attempt + 1, "status": replay_response.status_code, "body": replay_body, "elapsed_ms": replay_elapsed_ms})
                comparison_values.append(replay_response.status_code if step.compare == "status" else replay_body)
            if step.compare == "side_effect_count":
                after_count = _observe_collection_count(transport, url, request_step.headers)
                ok = before_count is not None and after_count == before_count
                comparison: dict[str, object] = {"before_replay": before_count, "after_replay": after_count}
            else:
                ok = all(value == comparison_values[0] for value in comparison_values[1:])
                comparison = {"values": comparison_values}
            passed &= ok
            records.append(evidence("diff", {"kind": "replay", "compare": step.compare, "responses": replay_responses, **comparison, "passed": ok}))
    return EvaluationResult(passed=bool(passed), evidence=tuple(records))


def _redact(headers: dict[str, str]) -> dict[str, str]:
    return {key: "[REDACTED]" if key.lower() in {"authorization", "cookie", "x-api-key"} else value for key, value in headers.items()}


def _require_response(response: Response | None) -> None:
    if response is None:
        raise ValueError("assertion requires a preceding http.request")


def _response_json(response: Response) -> object:
    try:
        return response.json()
    except (TypeError, ValueError):
        return {"unparseable_json": True}


def _json_path(value: object, path: str) -> tuple[bool, object | None]:
    current = value
    if path == "$":
        return True, current
    for segment in path.removeprefix("$.").split("."):
        if not isinstance(current, dict) or segment not in current:
            return False, None
        current = current[segment]
    return True, current


def _observe_collection_count(transport: HttpTransport, url: str, headers: dict[str, str]) -> int | None:
    observation = transport.request(method="GET", url=url, headers=headers, json=None)
    if observation.status_code >= 400:
        return None
    body = _response_json(observation)
    if isinstance(body, list):
        return len(body)
    if isinstance(body, dict):
        for key in ("side_effect_count", "sideEffectCount", "count"):
            value = body.get(key)
            if isinstance(value, int):
                return value
    return None
