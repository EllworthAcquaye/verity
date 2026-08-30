import os

from fastapi import Depends, FastAPI, HTTPException

from verity_runner.contracts import GeneratedCheckSet, GenerationRequest
from verity_runner.generator import CheckGenerator, GenerationError, configured_generator

app = FastAPI(title="Verity execution plane", version="1.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "healthy",
        "database_access": "none",
        "mode": os.getenv("VERITY_AI_MODE", "ollama"),
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
