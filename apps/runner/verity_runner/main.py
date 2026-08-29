from fastapi import FastAPI

app = FastAPI(title="Verity execution plane", version="1.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy", "database_access": "none", "mode": "cassette"}
