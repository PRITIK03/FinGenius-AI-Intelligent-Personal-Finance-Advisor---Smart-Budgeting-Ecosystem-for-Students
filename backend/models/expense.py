from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class Expense(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    amount: float
    category: str
    description: str
    date: datetime = Field(default_factory=datetime.now)

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
    date: Optional[datetime] = None
