from anthropic import AsyncAnthropic

from app.shared.config import get_settings

settings = get_settings()

# Instantiate the singleton AsyncAnthropic client
anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key or "dummy_key")
