import httpx
from pydantic import BaseModel
from typing import Optional
from app.shared.config import get_settings

class Judge0Result(BaseModel):
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    status: str

LANGUAGE_IDS = {
    "python": 71,       # Python (3.8.1)
    "javascript": 63,   # Node.js (12.14.0)
    "typescript": 74,   # TypeScript (3.7.4)
    "cpp": 54,          # C++ (GCC 9.2.0)
    "java": 62,         # Java (OpenJDK 13.0.1)
    "c": 50,            # C (GCC 9.2.0)
    "go": 60,           # Go (1.13.5)
    "ruby": 72,         # Ruby (2.7.0)
    "rust": 73,         # Rust (1.40.0)
}

async def execute_code(code: str, language: str) -> Judge0Result:
    """
    Executes code using the Judge0 API and returns the result synchronously.
    """
    settings = get_settings()

    # Use RapidAPI's Judge0 CE URL if not explicitly set in settings
    api_url = getattr(settings, "judge0_api_url", "https://judge0-ce.p.rapidapi.com")
    api_key = settings.judge0_api_key

    language_id = LANGUAGE_IDS.get(language.lower())
    if not language_id:
        raise ValueError(f"Unsupported language: {language}")

    endpoint = f"{api_url}/submissions?base64_encoded=false&wait=true"

    headers = {
        "Content-Type": "application/json"
    }

    if "rapidapi" in api_url:
        headers["X-RapidAPI-Key"] = api_key
        headers["X-RapidAPI-Host"] = api_url.split("://")[1].split("/")[0]
    else:
        headers["X-Auth-Token"] = api_key

    payload = {
        "source_code": code,
        "language_id": language_id
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(endpoint, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()

        return Judge0Result(
            stdout=data.get("stdout"),
            stderr=data.get("stderr") or data.get("compile_output"),
            status=data.get("status", {}).get("description", "Unknown")
        )
