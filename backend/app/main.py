from fastapi import FastAPI


def create_app() -> FastAPI:
    app = FastAPI(title="ShortVidsFactory")

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()