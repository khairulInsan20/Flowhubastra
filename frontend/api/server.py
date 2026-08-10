from fastapi import FastAPI
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

from routers import build_router
from store import seed_demo_data


ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / ".env")


# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


# Create FastAPI application
app = FastAPI(
    title="STO Desk API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


def get_db():
    return db


# Include all API routes
app.include_router(build_router(get_db))


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)


# Test root
@app.get("/")
async def root():
    return {"message": "STO Desk API aktif"}


# Test route
@app.get("/test")
async def test():
    return {"status": "SERVER BERHASIL"}


@app.on_event("startup")
async def initialize_demo_data():
    await seed_demo_data(db)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
