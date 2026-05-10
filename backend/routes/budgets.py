from fastapi import APIRouter, HTTPException, Depends
from ..models.budget import Budget, BudgetCreate, BudgetUpdate, BudgetStatus
from ..database import db_instance, get_mock_expenses
from ..utils.auth import get_current_user
from datetime import datetime, timedelta
from bson import ObjectId

router = APIRouter()

# Mock budgets
mock_budgets = [
    {"_id": "budget_1", "category": "Food", "monthly_limit": 5000, "alert_threshold": 80},
    {"_id": "budget_2", "category": "Travel", "monthly_limit": 3000, "alert_threshold": 75},
    {"_id": "budget_3", "category": "Entertainment", "monthly_limit": 2000, "alert_threshold": 85},
]

@router.post("/", response_model=Budget)
async def create_budget(budget: BudgetCreate, current_user: dict = Depends(get_current_user)):
    budget_dict = budget.model_dump()
    budget_dict["user_id"] = current_user.get("_id", "mock_user")
    budget_dict["created_at"] = datetime.now()
    budget_dict["updated_at"] = datetime.now()
    
    if db_instance.db is not None:
        # Check if budget for this category already exists
        existing = await db_instance.db["budgets"].find_one({
            "category": budget_dict["category"],
            "user_id": budget_dict["user_id"]
        })
        if existing:
            raise HTTPException(status_code=400, detail="Budget for this category already exists")
        
        new_budget = await db_instance.db["budgets"].insert_one(budget_dict)
        created_budget = await db_instance.db["budgets"].find_one({"_id": new_budget.inserted_id})
        created_budget["_id"] = str(created_budget["_id"])
        return created_budget
    else:
        # Check mock
        existing = next((b for b in mock_budgets if b["category"] == budget_dict["category"]), None)
        if existing:
            raise HTTPException(status_code=400, detail="Budget for this category already exists")
        budget_dict["_id"] = f"budget_{len(mock_budgets) + 1}"
        mock_budgets.append(budget_dict)
        return budget_dict

@router.get("/", response_model=list[Budget])
async def get_budgets(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("_id", "mock_user")
    
    if db_instance.db is not None:
        budgets = await db_instance.db["budgets"].find({"user_id": user_id}).to_list(100)
        for budget in budgets:
            budget["_id"] = str(budget["_id"])
        return budgets
    else:
        return mock_budgets

@router.get("/status", response_model=list[BudgetStatus])
async def get_budget_status(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("_id", "mock_user")

    # Get budgets and expenses
    if db_instance.db is not None:
        budgets = await db_instance.db["budgets"].find({"user_id": user_id}).to_list(100)
        expenses = await db_instance.db["expenses"].find({"user_id": user_id}).to_list(1000)
    else:
        budgets = mock_budgets
        expenses = await get_mock_expenses()

    # Calculate current month's spending
    now = datetime.now()
    month_start = datetime(now.year, now.month, 1)

    result = []
    for budget in budgets:
        category = budget["category"]
        limit = budget["monthly_limit"]
        threshold = budget.get("alert_threshold", 80)

        # Sum expenses for this category in current month
        current_spending = 0.0
        for exp in expenses:
            if exp["category"] != category:
                continue
            exp_date = exp["date"]
            if isinstance(exp_date, str):
                exp_date = datetime.fromisoformat(exp_date.replace('Z', '+00:00'))
            if db_instance.db is not None and exp_date < month_start:
                continue
            current_spending += exp["amount"]

        percentage = (current_spending / limit * 100) if limit > 0 else 0

        result.append(BudgetStatus(
            category=category,
            monthly_limit=limit,
            current_spending=round(current_spending, 2),
            remaining=round(limit - current_spending, 2),
            percentage_used=round(percentage, 2),
            alert_triggered=percentage >= threshold
        ))

    return result

@router.get("/alerts")
async def get_budget_alerts(current_user: dict = Depends(get_current_user)):
    """Get categories where spending has exceeded the alert threshold"""
    status_list = await get_budget_status(current_user)
    alerts = [s for s in status_list if s.alert_triggered]
    return {"alerts": alerts, "count": len(alerts)}

@router.put("/{budget_id}", response_model=Budget)
async def update_budget(budget_id: str, budget_update: BudgetUpdate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("_id", "mock_user")
    update_data = {k: v for k, v in budget_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now()
    
    if db_instance.db is not None:
        result = await db_instance.db["budgets"].update_one(
            {"_id": ObjectId(budget_id), "user_id": user_id},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Budget not found")
        updated = await db_instance.db["budgets"].find_one({"_id": ObjectId(budget_id)})
        updated["_id"] = str(updated["_id"])
        return updated
    else:
        for i, budget in enumerate(mock_budgets):
            if budget.get("_id") == budget_id:
                mock_budgets[i].update(update_data)
                return mock_budgets[i]
        raise HTTPException(status_code=404, detail="Budget not found")

@router.delete("/{budget_id}")
async def delete_budget(budget_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("_id", "mock_user")
    
    if db_instance.db is not None:
        result = await db_instance.db["budgets"].delete_one(
            {"_id": ObjectId(budget_id), "user_id": user_id}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Budget not found")
    else:
        global mock_budgets
        mock_budgets = [b for b in mock_budgets if b.get("_id") != budget_id]
    
    return {"message": "Budget deleted successfully"}
