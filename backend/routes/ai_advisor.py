from fastapi import APIRouter, Depends
from ..database import db_instance, get_mock_expenses
from ..config import settings
from ..utils.auth import get_current_user
from ..routes.expenses import mock_expenses_list
import httpx
from datetime import datetime

router = APIRouter()

@router.get("/")
async def get_ai_advice(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("_id", "mock_user")

    if db_instance.db is not None:
        query = {"user_id": user_id} if user_id != "mock_user" else {}
        expenses = await db_instance.db["expenses"].find(query).to_list(100)
    else:
        # Use in-memory mock list, populate from file if empty
        if not mock_expenses_list:
            mock_expenses_list.extend(await get_mock_expenses())
        expenses = mock_expenses_list
        
    if not expenses:
        return {"advice": ["Add some expenses to get personalized AI advice!"]}
    
    # Prepare data for LLM
    summary = {}
    for exp in expenses:
        cat = exp["category"]
        summary[cat] = summary.get(cat, 0) + exp["amount"]
    
    total_spending = sum(summary.values())
    monthly_income = current_user.get("monthly_income", 0)
    
    # Build context-aware prompt
    context = f"""User spending summary (last 30 days): {summary}
Total spent: ₹{total_spending}
Monthly income: ₹{monthly_income}
Savings potential: ₹{monthly_income - total_spending if monthly_income > total_spending else 'Negative - overspending!'}

As a financial advisor for Indian students, provide 3 short, actionable, and specific suggestions to:
1. Reduce unnecessary spending
2. Optimize budget allocation
3. Build better saving habits

Keep each suggestion under 100 characters and make them practical."""
    
    # Fallback advice generator based on spending analysis
    def generate_fallback_advice(summary, total_spending):
        advice = []
        if summary:
            max_cat = max(summary, key=summary.get)
            max_amount = summary[max_cat]
            max_pct = (max_amount / total_spending * 100) if total_spending > 0 else 0
            
            if max_pct > 40:
                advice.append(f"You're spending {max_pct:.0f}% on {max_cat}. Try reducing this by 20%.")
            else:
                advice.append(f"Consider reducing {max_cat} spending to increase savings.")
        
        # Add general advice
        categories = list(summary.keys())
        if "Entertainment" in categories and "Education" in categories:
            ent = summary.get("Entertainment", 0)
            edu = summary.get("Education", 0)
            if ent > edu:
                advice.append(f"You're spending more on Entertainment (₹{ent}) than Education (₹{edu}).")
        
        if "Food" in categories:
            food_amt = summary["Food"]
            if food_amt > 5000:
                advice.append("Food expenses are high. Try cooking more meals at home.")
        
        # Ensure we have 3 pieces of advice
        default_tips = [
            "Set a weekly budget and track every expense.",
            "Look for student discounts on food, travel, and shopping.",
            "Cook meals at home 3x/week to save ₹1000+ monthly.",
            "Use public transport instead of cabs to cut travel costs.",
            "Wait 24 hours before making non-essential purchases."
        ]
        
        while len(advice) < 3:
            advice.append(default_tips[len(advice) % len(default_tips)])
        
        return advice[:3]
    
    if not settings.OPENROUTER_API_KEY or settings.OPENROUTER_API_KEY == "your_openrouter_api_key_here" or settings.OPENROUTER_API_KEY == "":
        # Fallback advice if no API key
        advice = generate_fallback_advice(summary, total_spending)
        return {
            "advice": advice,
            "is_mock": True,
            "summary": summary
        }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "google/gemini-2.0-flash-001",
                    "messages": [{"role": "user", "content": context}]
                },
                timeout=30.0
            )
            data = response.json()
            
            if "choices" in data and len(data["choices"]) > 0:
                advice_text = data["choices"][0]["message"]["content"]
                # Parse numbered or bulleted list
                advice_list = []
                for line in advice_text.split("\n"):
                    line = line.strip()
                    if line and (line[0].isdigit() or line.startswith("-") or line.startswith("*")):
                        # Remove numbering/bullets
                        cleaned = line.lstrip("0123456789.-* ")
                        if cleaned:
                            advice_list.append(cleaned)
                
                if not advice_list:
                    # If no structured list found, split by periods
                    advice_list = [s.strip() for s in advice_text.split(".") if s.strip() and len(s) > 10][:3]
                
                return {
                    "advice": advice_list[:3] if advice_list else generate_fallback_advice(summary, total_spending),
                    "summary": summary,
                    "is_ai_generated": True
                }
            else:
                raise Exception("No choices in response")
                
    except Exception as e:
        # Return fallback on any error
        advice = generate_fallback_advice(summary, total_spending)
        return {
            "advice": advice,
            "summary": summary,
            "is_mock": True,
            "error": str(e)
        }

@router.get("/insights")
async def get_spending_insights(current_user: dict = Depends(get_current_user)):
    """Get detailed spending insights and patterns"""
    user_id = current_user.get("_id", "mock_user")
    
    if db_instance.db is not None:
        query = {"user_id": user_id} if user_id != "mock_user" else {}
        expenses = await db_instance.db["expenses"].find(query).to_list(1000)
    else:
        expenses = await get_mock_expenses()
    
    if not expenses:
        return {"insights": [], "message": "Add expenses to see insights"}
    
    # Analyze patterns
    summary = {}
    for exp in expenses:
        cat = exp["category"]
        summary[cat] = summary.get(cat, 0) + exp["amount"]
    
    total = sum(summary.values())
    insights = []
    
    # Top spending category
    if summary:
        top_cat = max(summary, key=summary.get)
        top_amt = summary[top_cat]
        top_pct = (top_amt / total * 100) if total > 0 else 0
        insights.append({
            "type": "top_category",
            "title": f"Top Spending: {top_cat}",
            "value": f"₹{top_amt:.0f} ({top_pct:.1f}%)",
            "suggestion": f"You're spending {top_pct:.0f}% on {top_cat}. Consider setting a limit."
        })
    
    # Category diversity
    num_categories = len(summary)
    if num_categories < 3:
        insights.append({
            "type": "diversity",
            "title": "Limited Category Diversity",
            "value": f"{num_categories} categories",
            "suggestion": "Try to diversify your spending across more categories."
        })
    
    # Average transaction
    avg_transaction = total / len(expenses) if expenses else 0
    insights.append({
        "type": "average",
        "title": "Average Transaction",
        "value": f"₹{avg_transaction:.0f}",
        "suggestion": "Track small purchases - they add up quickly!" if avg_transaction < 200 else "Good job tracking expenses!"
    })
    
    return {"insights": insights, "summary": summary}
