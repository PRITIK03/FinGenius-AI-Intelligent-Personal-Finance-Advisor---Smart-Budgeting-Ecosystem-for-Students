from fastapi import APIRouter, Depends
from ..database import db_instance, get_mock_expenses
from ..utils.auth import get_current_user
from ..routes.expenses import mock_expenses_list
import pandas as pd
from sklearn.linear_model import LinearRegression
from datetime import datetime, timedelta
import numpy as np

router = APIRouter()

@router.get("/")
async def predict_expenses(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("_id", "mock_user")

    if db_instance.db is not None:
        query = {"user_id": user_id} if user_id != "mock_user" else {}
        expenses = await db_instance.db["expenses"].find(query).to_list(1000)
    else:
        # Use in-memory mock list, populate from file if empty
        if not mock_expenses_list:
            mock_expenses_list.extend(await get_mock_expenses())
        expenses = mock_expenses_list
        
    if len(expenses) < 5:
        return {"predicted_next_month": 0, "message": "Not enough data for prediction", "trend": "stable"}
    
    try:
        df = pd.DataFrame(expenses)
        df['date'] = pd.to_datetime(df['date'])
        # Aggregate by date to have one point per day for better regression
        daily_spending = df.groupby(df['date'].dt.date)['amount'].sum().reset_index()
        daily_spending['date_numeric'] = daily_spending['date'].apply(lambda x: x.toordinal())
        
        X = daily_spending[['date_numeric']]
        y = daily_spending['amount']
        
        model = LinearRegression()
        model.fit(X, y)
        
        # Predict for the next 30 days
        next_30_days = []
        last_date = daily_spending['date'].max()
        for i in range(1, 31):
            future_date = last_date + timedelta(days=i)
            pred = model.predict([[future_date.toordinal()]])[0]
            next_30_days.append(max(0, pred))
            
        predicted_total = round(sum(next_30_days), 2)
        
        # Calculate savings potential based on user's monthly income if available
        monthly_income = current_user.get("monthly_income", 0)
        predicted_savings = max(0, monthly_income - predicted_total) if monthly_income > 0 else None
        
        return {
            "predicted_next_month": predicted_total,
            "predicted_savings": round(predicted_savings, 2) if predicted_savings else None,
            "trend": "increasing" if model.coef_[0] > 0 else "decreasing",
            "confidence": "medium" if len(expenses) > 20 else "low"
        }
    except Exception as e:
        return {"predicted_next_month": 0, "error": str(e), "trend": "unknown"}

@router.get("/by-category")
async def predict_by_category(current_user: dict = Depends(get_current_user)):
    """Predict spending by category for next month"""
    user_id = current_user.get("_id", "mock_user")

    if db_instance.db is not None:
        query = {"user_id": user_id} if user_id != "mock_user" else {}
        expenses = await db_instance.db["expenses"].find(query).to_list(1000)
    else:
        # Use in-memory mock list, populate from file if empty
        if not mock_expenses_list:
            mock_expenses_list.extend(await get_mock_expenses())
        expenses = mock_expenses_list
    
    if len(expenses) < 5:
        return {"predictions": {}, "message": "Not enough data"}
    
    try:
        df = pd.DataFrame(expenses)
        df['date'] = pd.to_datetime(df['date'])
        df['month'] = df['date'].dt.to_period('M')
        
        # Group by month and category
        monthly_category = df.groupby(['month', 'category'])['amount'].sum().reset_index()
        
        predictions = {}
        for category in monthly_category['category'].unique():
            cat_data = monthly_category[monthly_category['category'] == category]
            if len(cat_data) >= 2:
                # Simple trend: average of last 2 months with slight growth factor
                recent = cat_data.sort_values('month').tail(2)['amount'].mean()
                predictions[category] = round(recent * 1.05, 2)  # 5% growth assumption
            else:
                predictions[category] = round(cat_data['amount'].mean(), 2)
        
        return {"predictions": predictions, "total_predicted": round(sum(predictions.values()), 2)}
    except Exception as e:
        return {"predictions": {}, "error": str(e)}
