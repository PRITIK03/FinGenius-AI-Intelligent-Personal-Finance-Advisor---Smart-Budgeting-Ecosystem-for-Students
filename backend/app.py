from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import connect_to_mongo, close_mongo_connection
from .routes import expenses, predictions, ai_advisor, goals, budgets, auth, export
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

# Existing routes
app.include_router(expenses.router, prefix="/expenses", tags=["Expenses"])
app.include_router(predictions.router, prefix="/predict", tags=["Predictions"])
app.include_router(ai_advisor.router, prefix="/ai-advice", tags=["AI Advisor"])

# New routes
app.include_router(goals.router, prefix="/goals", tags=["Goals"])
app.include_router(budgets.router, prefix="/budgets", tags=["Budgets"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(export.router, prefix="/export", tags=["Export"])

@app.get("/")
async def root():
    return {"message": "Welcome to FinGenius AI API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}
