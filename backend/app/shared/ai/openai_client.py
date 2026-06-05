from openai import AsyncOpenAI
from app.shared.config import get_settings

settings = get_settings()

openai_client = AsyncOpenAI(
    api_key=settings.openai_api_key or "dummy_key",
)
