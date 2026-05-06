from fastapi import APIRouter, HTTPException, Depends
from ..models.goal import Goal, GoalCreate, GoalUpdate
from ..database import db_instance
from ..utils.auth import get_current_user
from datetime import datetime
from bson import ObjectId

router = APIRouter()

# Mock data for fallback
mock_goals = [
    {
        "_id": "goal_1",
        "name": "Buy Gaming Laptop",
        "target_amount": 75000,
        "current_amount": 25000,
        "deadline": "2026-12-31T23:59:59",
        "category": "Electronics",
        "created_at": datetime.now().isoformat()
    },
    {
        "_id": "goal_2",
        "name": "Goa Trip",
        "target_amount": 15000,
        "current_amount": 8000,
        "deadline": "2026-08-15T23:59:59",
        "category": "Travel",
        "created_at": datetime.now().isoformat()
    }
]

@router.post("/", response_model=Goal)
async def create_goal(goal: GoalCreate, current_user: dict = Depends(get_current_user)):
    goal_dict = goal.model_dump()
    goal_dict["user_id"] = current_user.get("_id", "mock_user")
    goal_dict["created_at"] = datetime.now()
    
    if db_instance.db is not None:
        new_goal = await db_instance.db["goals"].insert_one(goal_dict)
        created_goal = await db_instance.db["goals"].find_one({"_id": new_goal.inserted_id})
        created_goal["_id"] = str(created_goal["_id"])
        return created_goal
    else:
        goal_dict["_id"] = f"goal_{len(mock_goals) + 1}"
        mock_goals.append(goal_dict)
        return goal_dict

@router.get("/", response_model=list[Goal])
async def get_goals(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("_id", "mock_user")
    
    if db_instance.db is not None:
        goals = await db_instance.db["goals"].find({"user_id": user_id}).to_list(100)
        for goal in goals:
            goal["_id"] = str(goal["_id"])
        return goals
    else:
        return mock_goals

@router.get("/summary")
async def get_goals_summary(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("_id", "mock_user")
    
    if db_instance.db is not None:
        goals = await db_instance.db["goals"].find({"user_id": user_id}).to_list(100)
    else:
        goals = mock_goals
    
    total_target = sum(g.get("target_amount", 0) for g in goals)
    total_saved = sum(g.get("current_amount", 0) for g in goals)
    completed = len([g for g in goals if g.get("current_amount", 0) >= g.get("target_amount", 0)])
    
    return {
        "total_goals": len(goals),
        "total_target": total_target,
        "total_saved": total_saved,
        "remaining": total_target - total_saved,
        "completed_goals": completed,
        "progress_percentage": (total_saved / total_target * 100) if total_target > 0 else 0
    }

@router.put("/{goal_id}", response_model=Goal)
async def update_goal(goal_id: str, goal_update: GoalUpdate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("_id", "mock_user")
    update_data = {k: v for k, v in goal_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now()
    
    if db_instance.db is not None:
        result = await db_instance.db["goals"].update_one(
            {"_id": ObjectId(goal_id), "user_id": user_id},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Goal not found")
        updated_goal = await db_instance.db["goals"].find_one({"_id": ObjectId(goal_id)})
        updated_goal["_id"] = str(updated_goal["_id"])
        return updated_goal
    else:
        for i, goal in enumerate(mock_goals):
            if goal.get("_id") == goal_id:
                mock_goals[i].update(update_data)
                return mock_goals[i]
        raise HTTPException(status_code=404, detail="Goal not found")

@router.delete("/{goal_id}")
async def delete_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("_id", "mock_user")
    
    if db_instance.db is not None:
        result = await db_instance.db["goals"].delete_one(
            {"_id": ObjectId(goal_id), "user_id": user_id}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Goal not found")
    else:
        global mock_goals
        mock_goals = [g for g in mock_goals if g.get("_id") != goal_id]
    
    return {"message": "Goal deleted successfully"}

@router.post("/{goal_id}/contribute")
async def contribute_to_goal(goal_id: str, amount: float, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("_id", "mock_user")
    
    if db_instance.db is not None:
        goal = await db_instance.db["goals"].find_one(
            {"_id": ObjectId(goal_id), "user_id": user_id}
        )
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        new_amount = goal.get("current_amount", 0) + amount
        await db_instance.db["goals"].update_one(
            {"_id": ObjectId(goal_id)},
            {"$set": {"current_amount": new_amount, "updated_at": datetime.now()}}
        )
        updated_goal = await db_instance.db["goals"].find_one({"_id": ObjectId(goal_id)})
        updated_goal["_id"] = str(updated_goal["_id"])
        return updated_goal
    else:
        for i, goal in enumerate(mock_goals):
            if goal.get("_id") == goal_id:
                mock_goals[i]["current_amount"] = mock_goals[i].get("current_amount", 0) + amount
                return mock_goals[i]
        raise HTTPException(status_code=404, detail="Goal not found")
