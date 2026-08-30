import os
import asyncio

from contextlib import asynccontextmanager
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException

from verity_runner.contracts import GeneratedCheckSet, GenerationRequest
from verity_runner.generator import (
    CheckGenerator,
    GenerationError,
    configured_generator,
    generator_for_mode,
)
from verity_runner.worker import RunWorker

worker = RunWorker()


@asynccontextmanager
async def lifespan(_: FastAPI):
    task = asyncio.create_task(worker.run())
    try:
        yield
    finally:
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)
        await worker.close()


app = FastAPI(title="Verity execution plane", version="1.0.0", lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, str | int | None]:
    return {
        "status": "healthy",
        "database_access": "none",
        "mode": os.getenv("VERITY_AI_MODE", "ollama"),
        "active_run": worker.active_run,
        "completed_runs": worker.completed_runs,
    }


@app.post("/generate", response_model=GeneratedCheckSet)
async def generate_checks(
    request: GenerationRequest,
    generator: CheckGenerator = Depends(configured_generator),
) -> GeneratedCheckSet:
    try:
        return await generator.generate(request)
    except GenerationError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@app.post("/generate/{provider}", response_model=GeneratedCheckSet)
async def generate_checks_with_provider(
    provider: Literal["ollama", "cassette", "anthropic"],
    request: GenerationRequest,
) -> GeneratedCheckSet:
    """Select a known provider without widening the generated-check contract."""
    try:
        return await generator_for_mode(provider).generate(request)
    except GenerationError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
