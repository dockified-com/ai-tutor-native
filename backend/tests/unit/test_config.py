from app.shared.config import Settings


def test_settings_loads_from_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://test/db")
    monkeypatch.setenv("CLERK_PUBLISHABLE_KEY", "pk_test_x")
    monkeypatch.setenv("CLERK_SECRET_KEY", "sk_test_x")
    monkeypatch.setenv("CLERK_JWKS_URL", "https://example/jwks")
    monkeypatch.setenv("CLERK_WEBHOOK_SECRET", "whsec_x")

    settings = Settings()

    assert settings.database_url == "postgresql+asyncpg://test/db"
    assert settings.clerk_publishable_key == "pk_test_x"
    assert settings.clerk_jwks_url == "https://example/jwks"
    assert settings.app_env == "development"  # default
