from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class Goal(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    name: str
    target_amount: float
    current_amount: float = 0.0
    deadline: Optional[datetime] = None
    category: str = "General"
    user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "name": "Buy Laptop",
                "target_amount": 50000.0,
                "current_amount": 15000.0,
                "deadline": "2026-12-31T23:59:59",
                "category": "Electronics"
            }
        }

class GoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0.0
    deadline: Optional[datetime] = None
    category: str = "General"

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    deadline: Optional[datetime] = None
    category: Optional[str] = None
