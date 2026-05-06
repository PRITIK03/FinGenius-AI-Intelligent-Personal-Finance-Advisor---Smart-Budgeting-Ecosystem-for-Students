from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class Expense(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    amount: float
    category: str
    description: str
    date: datetime = Field(default_factory=datetime.now)
    user_id: Optional[str] = None

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "amount": 500.0,
                "category": "Food",
                "description": "Lunch at canteen",
                "date": "2026-05-06T12:00:00"
            }
        }

class ExpenseCreate(BaseModel):
    amount: float
    description: str
    category: Optional[str] = None  # Optional - will be auto-categorized if not provided
    date: Optional[datetime] = None

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    date: Optional[datetime] = None
