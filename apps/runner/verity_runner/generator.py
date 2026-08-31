from __future__ import annotations

import json
import os
from typing import Protocol

import httpx

from verity_runner.contracts import (
    GeneratedCheckSet,
    GenerationRequest,
    ModelGeneratedCheckSet,
    ModelIdempotencyCheckSet,
)


SYSTEM_PROMPT = """You generate exactly one declarative verification check for Verity.
Return only JSON matching the supplied schema. Never emit source code, shell commands,
SQL, filesystem operations, or URLs outside the supplied target. Generated checks must
start at probe trust and may use only the operations present in the schema. Begin with
one HTTP request, then add precise assertions that prove the requested behavior."""


class GenerationError(RuntimeError):
    """Raised when a model provider cannot produce a valid governed check set."""


class CheckGenerator(Protocol):
    async def generate(self, request: GenerationRequest) -> GeneratedCheckSet: ...


class OllamaGenerator:
    def __init__(
        self,
        base_url: str = "http://ollama:11434",
        model: str = "qwen3:1.7b",
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.transport = transport

    async def generate(self, request: GenerationRequest) -> GeneratedCheckSet:
        idempotency_strategy = _requires_idempotency_strategy(request)
        schema_type = ModelIdempotencyCheckSet if idempotency_strategy else ModelGeneratedCheckSet
        schema = schema_type.model_json_schema()
        prompt = _generation_prompt(request, idempotency_strategy)
        try:
            async with httpx.AsyncClient(
                transport=self.transport,
                timeout=httpx.Timeout(120.0),
            ) as client:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model,
                        "stream": False,
                        "think": False,
                        "format": schema,
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": prompt},
                        ],
                        "options": {"temperature": 0, "seed": 42},
                    },
                )
                response.raise_for_status()
                content = response.json()["message"]["content"]
                result = schema_type.model_validate_json(content)
                validated = GeneratedCheckSet.model_validate(result.model_dump())
                _enforce_target_scope(validated, request)
                return validated
        except (httpx.HTTPError, KeyError, TypeError, ValueError) as error:
            raise GenerationError("Ollama did not return a valid governed check set") from error


class AnthropicGenerator:
    """Optional cloud comparison provider using Anthropic structured outputs."""

    def __init__(
        self,
        api_key: str,
        model: str = "claude-haiku-4-5-20251001",
        base_url: str = "https://api.anthropic.com",
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        if not api_key:
            raise GenerationError("ANTHROPIC_API_KEY is required for Anthropic generation")
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.transport = transport

    async def generate(self, request: GenerationRequest) -> GeneratedCheckSet:
        idempotency_strategy = _requires_idempotency_strategy(request)
        schema_type = ModelIdempotencyCheckSet if idempotency_strategy else ModelGeneratedCheckSet
        schema = schema_type.model_json_schema()
        prompt = _generation_prompt(request, idempotency_strategy)
        try:
            async with httpx.AsyncClient(
                transport=self.transport,
                timeout=httpx.Timeout(120.0),
            ) as client:
                response = await client.post(
                    f"{self.base_url}/v1/messages",
                    headers={
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                        "x-api-key": self.api_key,
                    },
                    json={
                        "model": self.model,
                        "max_tokens": 1_400,
                        "temperature": 0,
                        "system": SYSTEM_PROMPT,
                        "messages": [{"role": "user", "content": prompt}],
                        "output_config": {
                            "format": {"type": "json_schema", "schema": schema}
                        },
                    },
                )
                response.raise_for_status()
                blocks = response.json()["content"]
                content = next(block["text"] for block in blocks if block.get("type") == "text")
                result = schema_type.model_validate_json(content)
                validated = GeneratedCheckSet.model_validate(result.model_dump())
                _enforce_target_scope(validated, request)
                return validated
        except (httpx.HTTPError, KeyError, StopIteration, TypeError, ValueError) as error:
            raise GenerationError("Anthropic did not return a valid governed check set") from error


class CassetteGenerator:
    """Deterministic recovery/CI provider; local Ollama remains the reviewer default."""

    async def generate(self, request: GenerationRequest) -> GeneratedCheckSet:
        path = request.known_paths[0] if request.known_paths else "/health"
        return GeneratedCheckSet.model_validate(
            {
                "checks": [
                    {
                        "name": f"{request.specification_title} availability",
                        "trust_level": "readonly",
                        "target_base_url": str(request.target_base_url),
                        "steps": [
                            {"operation": "http.request", "method": "GET", "path": path},
                            {"operation": "assert.status", "expected": 200},
                            {"operation": "assert.latency", "max_ms": 1_500},
                        ],
                    }
                ]
            }
        )


def generator_for_mode(mode: str) -> CheckGenerator:
    if mode == "cassette":
        return CassetteGenerator()
    if mode == "ollama":
        return OllamaGenerator(
            base_url=os.getenv("OLLAMA_BASE_URL", "http://ollama:11434"),
            model=os.getenv("OLLAMA_MODEL", "qwen3:1.7b"),
        )
    if mode == "anthropic":
        return AnthropicGenerator(
            api_key=os.getenv("ANTHROPIC_API_KEY", ""),
            model=os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"),
        )
    raise GenerationError(f"Unsupported VERITY_AI_MODE: {mode}")


def configured_generator() -> CheckGenerator:
    return generator_for_mode(os.getenv("VERITY_AI_MODE", "ollama"))


def _generation_prompt(request: GenerationRequest, idempotency_strategy: bool) -> str:
    return json.dumps(
        {
            "specification_title": request.specification_title,
            "specification_intent": request.specification_intent,
            "target_base_url": str(request.target_base_url),
            "known_paths": request.known_paths,
            "required_check_name": f"{request.specification_title} verification",
            "required_strategy": (
                "request, expected status, then replay the identical request and compare side_effect_count"
                if idempotency_strategy
                else "request followed by observable assertions"
            ),
            "generation_contract": [
                "Begin each check with exactly one http.request step.",
                "Follow the request with one or more assert.* steps.",
                "Use the required_check_name and trust_level probe.",
                "For idempotency requirements, add assert.replay_equal with compare side_effect_count.",
                "Use only the supplied target_base_url and known_paths.",
            ],
        },
        sort_keys=True,
    )


def _enforce_target_scope(result: GeneratedCheckSet, request: GenerationRequest) -> None:
    expected_target = str(request.target_base_url).rstrip("/")
    if any(
        str(check.target_base_url).rstrip("/") != expected_target
        for check in result.checks
    ):
        raise GenerationError("Generated checks escaped the requested target scope")


def _requires_idempotency_strategy(request: GenerationRequest) -> bool:
    requirement = f"{request.specification_title} {request.specification_intent}".lower()
    return any(
        marker in requirement
        for marker in ("idempotent", "idempotency", "same key", "at most one", "replay")
    )
