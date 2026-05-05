from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import connect_to_mongo, close_mongo_connection
from .routes import expenses, predictions, ai_advisor
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    await connect_to_mongo()
    yield
    # Shutdown logic
    await close_mongo_connection()

app = FastAPI(title="FinGenius AI API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(expenses.router, prefix="/expenses", tags=["Expenses"])
app.include_router(predictions.router, prefix="/predict", tags=["Predictions"])
app.include_router(ai_advisor.router, prefix="/ai-advice", tags=["AI Advisor"])

@app.get("/")
async def root():
    return {"message": "Welcome to FinGenius AI API"}
