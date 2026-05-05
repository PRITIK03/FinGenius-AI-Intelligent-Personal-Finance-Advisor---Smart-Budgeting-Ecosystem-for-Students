from fastapi import APIRouter, HTTPException
from ..models.expense import Expense, ExpenseCreate
from ..database import db_instance, get_mock_expenses
from ..utils.categorizer import categorize_expense
from datetime import datetime
from bson import ObjectId

router = APIRouter()

@router.post("/", response_model=Expense)
async def add_expense(expense_in: ExpenseCreate):
    category = categorize_expense(expense_in.description)
    expense_dict = expense_in.model_dump()
    expense_dict["category"] = category
    if not expense_dict.get("date"):
        expense_dict["date"] = datetime.now()
        
    if db_instance.db is not None:
        new_expense = await db_instance.db["expenses"].insert_one(expense_dict)
        created_expense = await db_instance.db["expenses"].find_one({"_id": new_expense.inserted_id})
        created_expense["_id"] = str(created_expense["_id"])
        return created_expense
    else:
        # Mock mode: just return the input with an ID
        expense_dict["_id"] = "mock_" + str(datetime.now().timestamp())
        return expense_dict

@router.get("/", response_model=list[Expense])
async def get_expenses():
    if db_instance.db is not None:
        expenses = await db_instance.db["expenses"].find().sort("date", -1).to_list(1000)
        for exp in expenses:
            exp["_id"] = str(exp["_id"])
        return expenses
    else:
        return await get_mock_expenses()

@router.get("/summary")
async def get_summary():
    if db_instance.db is not None:
        pipeline = [
            {
                "$group": {
                    "_id": "$category",
                    "total_amount": {"$sum": "$amount"}
                }
            }
        ]
        cursor = db_instance.db["expenses"].aggregate(pipeline)
        summary = await cursor.to_list(100)
        formatted_summary = {item["_id"]: item["total_amount"] for item in summary}
    else:
        expenses = await get_mock_expenses()
        formatted_summary = {}
        for exp in expenses:
            cat = exp["category"]
            formatted_summary[cat] = formatted_summary.get(cat, 0) + exp["amount"]
            
    total_spending = sum(formatted_summary.values())
    
    return {
        "category_wise": formatted_summary,
        "total_spending": total_spending
    }
