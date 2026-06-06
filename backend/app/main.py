from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.features.auth.routes import router as auth_router
from app.features.authoring.routes import router as authoring_router
from app.shared.config import get_settings
from app.shared.errors import APIError
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup hooks go here in later tasks (DB warmup, etc.)
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="AI Tutor Backend", lifespan=lifespan)

    @app.get("/healthz")
    async def healthz():
        return {"status": "ok"}

    app.include_router(auth_router)
    app.include_router(authoring_router)

    settings = get_settings()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(APIError)
    async def api_error_handler(request: Request, exc: APIError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message},
        )

    return app


app = create_app()
