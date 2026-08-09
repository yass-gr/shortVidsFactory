from fastapi import FastAPI

from .api import router as api_router


def create_app() -> FastAPI:
    app = FastAPI(title="ShortVidsFactory")

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    app.include_router(api_router, prefix="/api")

    return app


app = create_app()
