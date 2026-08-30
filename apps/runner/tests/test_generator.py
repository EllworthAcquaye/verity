import asyncio
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parents[1]))

import httpx
import pytest

from verity_runner.contracts import GenerationRequest
from verity_runner.generator import (
    AnthropicGenerator,
    CassetteGenerator,
    GenerationError,
    OllamaGenerator,
)


REQUEST = GenerationRequest(
    specification_title="Create order safely",
    specification_intent="Creating an order is idempotent when the request key is replayed.",
    target_base_url="http://target:4000",
    known_paths=["/orders"],
)


def ollama_response(checks: object) -> httpx.Response:
    return httpx.Response(
        200,
        json={"message": {"content": json.dumps({"checks": checks})}},
    )


def test_ollama_uses_schema_and_accepts_valid_declarative_output() -> None:
    seen: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen.update(json.loads(request.content))
        return ollama_response([
            {
                "name": "Create order idempotently",
                "trust_level": "probe",
                "target_base_url": "http://target:4000",
                "steps": [
                    {"operation": "http.request", "method": "POST", "path": "/orders", "headers": {}, "body": {"sku": "demo"}},
                    {"operation": "assert.status", "expected": 201},
                    {"operation": "assert.replay_equal", "repetitions": 2, "compare": "side_effect_count"},
                ],
            }
        ])

    result = asyncio.run(OllamaGenerator(transport=httpx.MockTransport(handler)).generate(REQUEST))

    assert result.checks[0].trust_level == "probe"
    assert seen["stream"] is False
    assert seen["think"] is False
    assert seen["options"] == {"temperature": 0, "seed": 42}
    assert isinstance(seen["format"], dict)
    assert seen["format"]["properties"]["checks"]["maxItems"] == 1
    assert "ModelIdempotencyCheckDefinition" in seen["format"]["$defs"]


def test_ollama_rejects_hostile_model_output() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return ollama_response([
            {
                "name": "Run arbitrary Python",
                "trust_level": "probe",
                "target_base_url": "http://target:4000",
                "steps": [
                    {"operation": "python.exec", "source": "import os"},
                    {"operation": "assert.status", "expected": 200},
                ],
            }
        ])

    with pytest.raises(GenerationError):
        asyncio.run(OllamaGenerator(transport=httpx.MockTransport(handler)).generate(REQUEST))


def test_ollama_rejects_a_valid_check_for_an_unapproved_target() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return ollama_response([
            {
                "name": "Probe an unrelated target",
                "trust_level": "readonly",
                "target_base_url": "https://example.com",
                "steps": [
                    {"operation": "http.request", "method": "GET", "path": "/"},
                    {"operation": "assert.status", "expected": 200},
                ],
            }
        ])

    with pytest.raises(GenerationError, match="escaped"):
        asyncio.run(OllamaGenerator(transport=httpx.MockTransport(handler)).generate(REQUEST))


def test_cassette_remains_a_schema_valid_recovery_provider() -> None:
    result = asyncio.run(CassetteGenerator().generate(REQUEST))

    assert result.checks[0].steps[0].path == "/orders"
    assert result.checks[0].trust_level == "readonly"


def test_anthropic_uses_structured_outputs_and_the_same_governed_schema() -> None:
    seen: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["headers"] = dict(request.headers)
        seen.update(json.loads(request.content))
        return httpx.Response(
            200,
            json={
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(
                            {
                                "checks": [
                                    {
                                        "name": "Create order idempotently",
                                        "trust_level": "probe",
                                        "target_base_url": "http://target:4000",
                                        "steps": [
                                            {
                                                "operation": "http.request",
                                                "method": "POST",
                                                "path": "/orders",
                                                "headers": {},
                                                "body": {"sku": "demo"},
                                            },
                                            {"operation": "assert.status", "expected": 201},
                                            {
                                                "operation": "assert.replay_equal",
                                                "repetitions": 2,
                                                "compare": "side_effect_count",
                                            },
                                        ],
                                    }
                                ]
                            }
                        ),
                    }
                ]
            },
        )

    result = asyncio.run(
        AnthropicGenerator(
            api_key="test-key",
            base_url="https://anthropic.test",
            transport=httpx.MockTransport(handler),
        ).generate(REQUEST)
    )

    assert result.checks[0].trust_level == "probe"
    assert seen["headers"]["x-api-key"] == "test-key"
    assert seen["temperature"] == 0
    output_format = seen["output_config"]["format"]
    assert output_format["type"] == "json_schema"
    assert output_format["schema"]["properties"]["checks"]["maxItems"] == 1


def test_anthropic_key_is_required_only_when_that_provider_is_selected() -> None:
    with pytest.raises(GenerationError, match="ANTHROPIC_API_KEY"):
        AnthropicGenerator(api_key="")
