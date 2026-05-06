from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional

class User(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    email: EmailStr
    full_name: str
    hashed_password: str
    monthly_income: float = 0.0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        populate_by_name = True

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    monthly_income: float = 0.0

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str = Field(alias="_id")
    email: EmailStr
    full_name: str
    monthly_income: float
    is_active: bool
    created_at: datetime

    class Config:
        populate_by_name = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
