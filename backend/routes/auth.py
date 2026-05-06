from fastapi import APIRouter, HTTPException, Depends
from ..models.user import UserCreate, UserLogin, Token, UserResponse
from ..database import db_instance
from ..utils.auth import (
    get_password_hash, verify_password, create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user
)
from datetime import timedelta, datetime
from bson import ObjectId

router = APIRouter()

# Mock users for testing
mock_users = {}

@router.post("/register")
async def register(user: UserCreate):
    # Check if email exists
    if db_instance.db is not None:
        existing = await db_instance.db["users"].find_one({"email": user.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create user
        user_dict = {
            "email": user.email,
            "full_name": user.full_name,
            "hashed_password": get_password_hash(user.password),
            "monthly_income": user.monthly_income,
            "is_active": True,
            "created_at": datetime.now()
        }
        
        new_user = await db_instance.db["users"].insert_one(user_dict)
        created_user = await db_instance.db["users"].find_one({"_id": new_user.inserted_id})
        created_user["_id"] = str(created_user["_id"])
        
        # Create access token
        access_token = create_access_token(
            data={"sub": created_user["_id"]},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return Token(
            access_token=access_token,
            user=UserResponse(**created_user)
        )
    else:
        # Mock mode
        if user.email in mock_users:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        user_id = f"user_{len(mock_users) + 1}"
        user_dict = {
            "_id": user_id,
            "email": user.email,
            "full_name": user.full_name,
            "hashed_password": get_password_hash(user.password),
            "monthly_income": user.monthly_income,
            "is_active": True,
            "created_at": datetime.now()
        }
        mock_users[user.email] = user_dict
        
        access_token = create_access_token(data={"sub": user_id})
        return Token(
            access_token=access_token,
            user=UserResponse(**user_dict)
        )

@router.post("/login")
async def login(user_login: UserLogin):
    if db_instance.db is not None:
        user = await db_instance.db["users"].find_one({"email": user_login.email})
        if not user or not verify_password(user_login.password, user["hashed_password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        user["_id"] = str(user["_id"])
        access_token = create_access_token(
            data={"sub": user["_id"]},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return Token(
            access_token=access_token,
            user=UserResponse(**user)
        )
    else:
        # Mock mode
        user = mock_users.get(user_login.email)
        if not user or not verify_password(user_login.password, user["hashed_password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        access_token = create_access_token(data={"sub": user["_id"]})
        return Token(
            access_token=access_token,
            user=UserResponse(**user)
        )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

@router.put("/me")
async def update_profile(update_data: dict, current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    allowed_fields = ["full_name", "monthly_income"]
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if db_instance.db is not None:
        await db_instance.db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_dict}
        )
        updated = await db_instance.db["users"].find_one({"_id": ObjectId(user_id)})
        updated["_id"] = str(updated["_id"])
        return UserResponse(**updated)
    else:
        mock_users[current_user["email"]].update(update_dict)
        return UserResponse(**mock_users[current_user["email"]])
