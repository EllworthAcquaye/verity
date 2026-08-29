from __future__ import annotations

from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


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
    name: str = Field(min_length=3, max_length=120)
    trust_level: Literal["readonly", "probe"]
    target_base_url: HttpUrl
    steps: list[Step] = Field(min_length=2, max_length=12)


class EvidenceRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    evidence_type: Literal["request", "response", "assertion", "trace"]
    payload: dict[str, object]
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
