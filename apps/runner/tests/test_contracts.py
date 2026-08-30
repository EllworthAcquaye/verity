from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parents[1]))

import pytest
from pydantic import ValidationError

from verity_runner.contracts import CheckDefinition
from verity_runner.evaluator import evidence


def test_unknown_operations_are_rejected_not_repaired() -> None:
    with pytest.raises(ValidationError):
        CheckDefinition.model_validate({
            "name": "hostile generated check",
            "trust_level": "readonly",
            "target_base_url": "http://target:4000",
            "steps": [{"operation": "python.exec", "source": "print('no')"}],
        })


def test_generated_check_cannot_be_born_mutating() -> None:
    with pytest.raises(ValidationError):
        CheckDefinition.model_validate({
            "name": "mutating generated check",
            "trust_level": "mutate",
            "target_base_url": "http://target:4000",
            "steps": [
                {"operation": "http.request", "method": "GET", "path": "/health"},
                {"operation": "assert.status", "expected": 200},
            ],
        })


def test_readonly_check_cannot_issue_a_mutating_request() -> None:
    with pytest.raises(ValidationError, match="GET"):
        CheckDefinition.model_validate({
            "name": "mislabelled write check",
            "trust_level": "readonly",
            "target_base_url": "http://target:4000",
            "steps": [
                {"operation": "http.request", "method": "POST", "path": "/orders"},
                {"operation": "assert.status", "expected": 201},
            ],
        })


def test_check_requires_an_observable_assertion() -> None:
    with pytest.raises(ValidationError, match="assertion"):
        CheckDefinition.model_validate({
            "name": "request without an oracle",
            "trust_level": "readonly",
            "target_base_url": "http://target:4000",
            "steps": [
                {"operation": "http.request", "method": "GET", "path": "/orders"},
                {"operation": "http.request", "method": "GET", "path": "/orders"},
            ],
        })


def test_evidence_hash_is_canonical() -> None:
    assert evidence("assertion", {"b": 2, "a": 1}).sha256 == evidence("assertion", {"a": 1, "b": 2}).sha256
