from fastapi import APIRouter, HTTPException, Depends, Query
from ..models.expense import Expense, ExpenseCreate, ExpenseUpdate
from ..database import db_instance, get_mock_expenses
from ..utils.categorizer import categorize_expense
from ..utils.auth import get_current_user, get_optional_user
from datetime import datetime, timedelta
from bson import ObjectId
from typing import Optional

router = APIRouter()

# Mock expenses for fallback (in-memory storage)
mock_expenses_list = []

@router.post("/", response_model=Expense)
async def add_expense(
    expense_in: ExpenseCreate,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user.get("_id", "mock_user")
    
    # Use provided category or auto-categorize
    category = expense_in.category if expense_in.category else categorize_expense(expense_in.description)
    
    expense_dict = expense_in.model_dump()
    expense_dict["category"] = category
    expense_dict["user_id"] = user_id
    
    if not expense_dict.get("date"):
        expense_dict["date"] = datetime.now()
    elif isinstance(expense_dict["date"], str):
        expense_dict["date"] = datetime.fromisoformat(expense_dict["date"].replace('Z', '+00:00'))
        
    if db_instance.db is not None:
        new_expense = await db_instance.db["expenses"].insert_one(expense_dict)
        created_expense = await db_instance.db["expenses"].find_one({"_id": new_expense.inserted_id})
        created_expense["_id"] = str(created_expense["_id"])
        return created_expense
    else:
        # Mock mode
        expense_dict["_id"] = f"mock_{len(mock_expenses_list) + 1}"
        mock_expenses_list.append(expense_dict)
        return expense_dict

@router.get("/", response_model=list[Expense])
async def get_expenses(
    current_user: dict = Depends(get_current_user),
    category: Optional[str] = Query(None, description="Filter by category"),
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    limit: int = Query(1000, ge=1, le=10000)
):
    user_id = current_user.get("_id", "mock_user")
    
    # Build query filter
    query_filter = {"user_id": user_id} if user_id != "mock_user" else {}
    
    if category:
        query_filter["category"] = category
    
    if start_date or end_date:
        date_filter = {}
        if start_date:
            date_filter["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            date_filter["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        query_filter["date"] = date_filter
    
    if db_instance.db is not None:
        expenses = await db_instance.db["expenses"].find(query_filter).sort("date", -1).limit(limit).to_list(limit)
        for exp in expenses:
            exp["_id"] = str(exp["_id"])
        return expenses
    else:
        # Filter mock data
        expenses = mock_expenses_list if mock_expenses_list else await get_mock_expenses()
        if category:
            expenses = [e for e in expenses if e.get("category") == category]
        return expenses[:limit]

@router.get("/{expense_id}", response_model=Expense)
async def get_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("_id", "mock_user")
    
    if db_instance.db is not None:
        expense = await db_instance.db["expenses"].find_one(
            {"_id": ObjectId(expense_id), "user_id": user_id}
        )
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        expense["_id"] = str(expense["_id"])
        return expense
    else:
        for exp in mock_expenses_list:
            if exp.get("_id") == expense_id:
                return exp
        raise HTTPException(status_code=404, detail="Expense not found")

@router.put("/{expense_id}", response_model=Expense)
async def update_expense(
    expense_id: str,
    expense_update: ExpenseUpdate,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user.get("_id", "mock_user")
    
    # Build update dict, excluding None values
    update_data = {k: v for k, v in expense_update.model_dump().items() if v is not None}
    
    # Auto-categorize if description changed but category not provided
    if "description" in update_data and "category" not in update_data:
        update_data["category"] = categorize_expense(update_data["description"])
    
    if "date" in update_data and isinstance(update_data["date"], str):
        update_data["date"] = datetime.fromisoformat(update_data["date"].replace('Z', '+00:00'))
    
    if db_instance.db is not None:
        result = await db_instance.db["expenses"].update_one(
            {"_id": ObjectId(expense_id), "user_id": user_id},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        updated = await db_instance.db["expenses"].find_one({"_id": ObjectId(expense_id)})
        updated["_id"] = str(updated["_id"])
        return updated
    else:
        for i, exp in enumerate(mock_expenses_list):
            if exp.get("_id") == expense_id:
                mock_expenses_list[i].update(update_data)
                return mock_expenses_list[i]
        raise HTTPException(status_code=404, detail="Expense not found")

@router.delete("/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("_id", "mock_user")
    
    if db_instance.db is not None:
        result = await db_instance.db["expenses"].delete_one(
            {"_id": ObjectId(expense_id), "user_id": user_id}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Expense not found")
    else:
        global mock_expenses_list
        original_len = len(mock_expenses_list)
        mock_expenses_list = [e for e in mock_expenses_list if e.get("_id") != expense_id]
        if len(mock_expenses_list) == original_len:
            raise HTTPException(status_code=404, detail="Expense not found")
    
    return {"message": "Expense deleted successfully"}

@router.get("/summary")
async def get_summary(
    current_user: dict = Depends(get_current_user),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    user_id = current_user.get("_id", "mock_user")
    
    # Build date filter
    date_filter = {}
    if start_date:
        date_filter["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    if end_date:
        date_filter["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    query = {"user_id": user_id} if user_id != "mock_user" else {}
    if date_filter:
        query["date"] = date_filter
    
    if db_instance.db is not None:
        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": "$category",
                    "total_amount": {"$sum": "$amount"},
                    "count": {"$sum": 1}
                }
            }
        ]
        cursor = db_instance.db["expenses"].aggregate(pipeline)
        summary = await cursor.to_list(100)
        formatted_summary = {item["_id"]: item["total_amount"] for item in summary}
        category_counts = {item["_id"]: item["count"] for item in summary}
    else:
        expenses = mock_expenses_list if mock_expenses_list else await get_mock_expenses()
        formatted_summary = {}
        category_counts = {}
        for exp in expenses:
            cat = exp["category"]
            formatted_summary[cat] = formatted_summary.get(cat, 0) + exp["amount"]
            category_counts[cat] = category_counts.get(cat, 0) + 1
            
    total_spending = sum(formatted_summary.values())
    
    return {
        "category_wise": formatted_summary,
        "category_counts": category_counts,
        "total_spending": round(total_spending, 2),
        "total_transactions": sum(category_counts.values())
    }

@router.get("/categories/list")
async def get_categories():
    """Get all unique categories with counts"""
    from ..utils.categorizer import categorize_expense
    
    # Get categories from the categorizer
    categories = {
        "Food": "🍔",
        "Travel": "🚗",
        "Education": "📚",
        "Entertainment": "🎮",
        "Shopping": "🛍️",
        "Health": "💊",
        "Bills": "📄",
        "Others": "📦"
    }
    
    return {"categories": [{"name": k, "icon": v} for k, v in categories.items()]}
