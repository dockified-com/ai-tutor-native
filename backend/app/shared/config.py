from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    log_level: str = "INFO"
    database_url: str

    clerk_publishable_key: str
    clerk_secret_key: str
    clerk_jwks_url: str
    clerk_webhook_secret: str

    anthropic_api_key: str
    openai_api_key: str
    judge0_api_key: str
    judge0_api_url: str = "https://judge0-ce.p.rapidapi.com"
    supabase_url: Optional[str] = None
    supabase_service_role_key: str
    frontend_url: str = "http://localhost:3000"


def get_settings() -> Settings:
    return Settings()
