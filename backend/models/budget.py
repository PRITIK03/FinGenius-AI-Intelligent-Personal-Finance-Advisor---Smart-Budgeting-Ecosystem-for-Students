from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class Budget(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    category: str
    monthly_limit: float
    alert_threshold: float = 80.0  # Percentage at which to alert
    user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "category": "Food",
                "monthly_limit": 5000.0,
                "alert_threshold": 80.0
            }
        }

class BudgetCreate(BaseModel):
    category: str
    monthly_limit: float
    alert_threshold: float = 80.0

class BudgetUpdate(BaseModel):
    monthly_limit: Optional[float] = None
    alert_threshold: Optional[float] = None

class BudgetStatus(BaseModel):
    category: str
    monthly_limit: float
    current_spending: float
    remaining: float
    percentage_used: float
    alert_triggered: bool
