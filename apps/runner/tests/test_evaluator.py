from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parents[1]))

from verity_runner.contracts import CheckDefinition
from verity_runner.evaluator import evaluate


class FakeResponse:
    def __init__(self, status_code: int, body: object) -> None:
        self.status_code = status_code
        self._body = body

    def json(self) -> object:
        return self._body


class OrdersTransport:
    def __init__(self, *, idempotent: bool) -> None:
        self.orders: list[dict[str, object]] = []
        self.keys: dict[str, dict[str, object]] = {}
        self.idempotent = idempotent

    def request(self, *, method: str, url: str, headers: dict[str, str], json: object | None) -> FakeResponse:
        if method == "GET":
            return FakeResponse(200, self.orders)
        key = headers.get("Idempotency-Key", "")
        if self.idempotent and key in self.keys:
            return FakeResponse(201, self.keys[key])
        order = {"id": f"ord_{len(self.orders) + 1}", "status": "accepted", "request": json}
        self.orders.append(order)
        self.keys[key] = order
        return FakeResponse(201, order)


def order_check() -> CheckDefinition:
    return CheckDefinition.model_validate({
        "name": "Retry applies the order once",
        "trust_level": "probe",
        "target_base_url": "http://target:4000",
        "steps": [
            {"operation": "http.request", "method": "POST", "path": "/orders", "headers": {"Idempotency-Key": "key-1", "Authorization": "secret"}, "body": {"sku": "SKU-1"}},
            {"operation": "assert.status", "expected": 201},
            {"operation": "assert.json_path", "path": "$.status", "comparator": "equals", "expected": "accepted"},
            {"operation": "assert.replay_equal", "repetitions": 2, "compare": "side_effect_count"},
        ],
    })


def test_real_json_path_and_idempotent_replay_pass() -> None:
    result = evaluate(order_check(), OrdersTransport(idempotent=True))
    assert result.passed is True
    assert any(record.payload.get("kind") == "json_path" and record.payload.get("passed") is True for record in result.evidence)


def test_replay_detects_an_additional_side_effect_and_redacts_secrets() -> None:
    result = evaluate(order_check(), OrdersTransport(idempotent=False))
    assert result.passed is False
    replay = next(record for record in result.evidence if record.evidence_type == "diff")
    assert replay.payload["before_replay"] == 1
    assert replay.payload["after_replay"] == 2
    request = next(record for record in result.evidence if record.evidence_type == "request")
    assert request.payload["headers"]["Authorization"] == "[REDACTED]"
