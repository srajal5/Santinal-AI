from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import alerts, auth, cameras, demo, dispatch, directory, health
from app.db.mongodb import get_database
from app.routes import incidents, protected


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.

    NOTE: Database seeding is disabled here so the app can start even if
    MongoDB is not running. If you want automatic seed of admin user and
    demo data, run the seed scripts manually once MongoDB is available.
    """
    yield


app = FastAPI(lifespan=lifespan)

app.include_router(demo.router)
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(cameras.router)
app.include_router(alerts.router)
app.include_router(directory.router)
app.include_router(dispatch.router)
app.include_router(incidents.router)
app.include_router(protected.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Sentinel backend running"}


@app.get("/health/db")
async def health_db():
    from fastapi import HTTPException

    try:
        db = get_database()
        await db.command("ping")
        return {"database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
