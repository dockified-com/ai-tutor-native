from contextlib import asynccontextmanager

from fastapi import FastAPI


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup hooks go here in later tasks (DB warmup, etc.)
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="AI Tutor Backend", lifespan=lifespan)

    @app.get("/healthz")
    async def healthz():
        return {"status": "ok"}

    return app


app = create_app()
