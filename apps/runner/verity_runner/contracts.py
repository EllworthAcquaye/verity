from __future__ import annotations

from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator


class Operation(StrEnum):
    HTTP_REQUEST = "http.request"
    STATUS_ASSERTION = "assert.status"
    JSON_PATH_ASSERTION = "assert.json_path"
    LATENCY_BUDGET = "assert.latency"
    REPLAY_COMPARISON = "assert.replay_equal"


class HttpRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    operation: Literal[Operation.HTTP_REQUEST]
    method: Literal["GET", "POST", "PUT", "PATCH", "DELETE"]
    path: str = Field(pattern=r"^/[A-Za-z0-9_./{}-]*$")
    headers: dict[str, str] = Field(default_factory=dict)
    body: dict[str, object] | None = None


class StatusAssertion(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    operation: Literal[Operation.STATUS_ASSERTION]
    expected: int = Field(ge=100, le=599)


class JsonPathAssertion(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    operation: Literal[Operation.JSON_PATH_ASSERTION]
    path: str = Field(pattern=r"^\$([.][A-Za-z0-9_-]+)*$")
    comparator: Literal["equals", "exists", "matches"]
    expected: str | int | float | bool | None = None


class LatencyBudget(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    operation: Literal[Operation.LATENCY_BUDGET]
    max_ms: int = Field(gt=0, le=30_000)


class ReplayComparison(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    operation: Literal[Operation.REPLAY_COMPARISON]
    repetitions: int = Field(default=2, ge=2, le=3)
    compare: Literal["status", "body", "side_effect_count"]


Step = Annotated[
    HttpRequest | StatusAssertion | JsonPathAssertion | LatencyBudget | ReplayComparison,
    Field(discriminator="operation"),
]


class CheckDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    name: str = Field(
        min_length=3,
        max_length=120,
        description="A descriptive behavior name; never use a trust label as the name.",
    )
    trust_level: Literal["readonly", "probe"]
    target_base_url: HttpUrl
    steps: list[Step] = Field(min_length=2, max_length=12)

    @model_validator(mode="after")
    def enforce_governed_sequence(self) -> CheckDefinition:
        requests = [step for step in self.steps if isinstance(step, HttpRequest)]
        assertions = [step for step in self.steps if not isinstance(step, HttpRequest)]
        if not assertions:
            raise ValueError("a check must contain at least one assertion")
        if len(requests) != 1 or not isinstance(self.steps[0], HttpRequest):
            raise ValueError("a check must begin with exactly one HTTP request")
        if self.trust_level == "readonly" and requests[0].method != "GET":
            raise ValueError("readonly checks may issue only GET requests")
        return self


class GeneratedCheckSet(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    checks: list[CheckDefinition] = Field(min_length=1, max_length=6)


class ModelCheckDefinition(CheckDefinition):
    """Conservative model boundary: generated candidates cannot self-grant readonly trust."""

    trust_level: Literal["probe"]


class ModelGeneratedCheckSet(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    checks: list[ModelCheckDefinition] = Field(min_length=1, max_length=1)


class ModelSideEffectReplay(ReplayComparison):
    compare: Literal["side_effect_count"]


class ModelIdempotencyCheckDefinition(ModelCheckDefinition):
    steps: tuple[HttpRequest, StatusAssertion, ModelSideEffectReplay]


class ModelIdempotencyCheckSet(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    checks: list[ModelIdempotencyCheckDefinition] = Field(min_length=1, max_length=1)


class GenerationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    specification_title: str = Field(min_length=3, max_length=160)
    specification_intent: str = Field(min_length=10, max_length=4_000)
    target_base_url: HttpUrl
    known_paths: list[str] = Field(default_factory=list, max_length=30)


class EvidenceRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    evidence_type: Literal["request", "response", "assertion", "trace", "diff"]
    payload: dict[str, object]
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")


class CheckJob(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    check_run_id: str = Field(min_length=1)
    check_id: str = Field(min_length=1)
    service_id: str = Field(min_length=1)
    definition: CheckDefinition


class RunJob(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    run_id: str = Field(min_length=1)
    checks: list[CheckJob] = Field(min_length=1, max_length=100)


class CheckResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    check_run_id: str = Field(min_length=1)
    check_id: str = Field(min_length=1)
    service_id: str = Field(min_length=1)
    status: Literal["passed", "failed", "error"]
    duration_ms: int = Field(ge=0)
    error: str | None = Field(default=None, max_length=2_000)
    evidence: list[EvidenceRecord] = Field(min_length=1, max_length=50)


class RunResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    run_id: str = Field(min_length=1)
    results: list[CheckResult] = Field(min_length=1, max_length=100)
