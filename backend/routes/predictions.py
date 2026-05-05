from fastapi import APIRouter
from ..database import db_instance, get_mock_expenses
import pandas as pd
from sklearn.linear_model import LinearRegression
from datetime import datetime, timedelta
import numpy as np

router = APIRouter()

@router.get("/")
async def predict_expenses():
    if db_instance.db is not None:
        expenses = await db_instance.db["expenses"].find().to_list(1000)
    else:
        expenses = await get_mock_expenses()
        
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
        
        return {
            "predicted_next_month": predicted_total,
            "trend": "increasing" if model.coef_[0] > 0 else "decreasing"
        }
    except Exception as e:
        return {"predicted_next_month": 0, "error": str(e), "trend": "unknown"}
