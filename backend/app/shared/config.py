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


def get_settings() -> Settings:
    return Settings()
