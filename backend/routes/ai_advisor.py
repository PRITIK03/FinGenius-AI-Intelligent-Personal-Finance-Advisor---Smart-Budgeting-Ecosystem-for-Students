from fastapi import APIRouter
from ..database import db_instance, get_mock_expenses
from ..config import settings
import httpx

router = APIRouter()

@router.get("/")
async def get_ai_advice():
    if db_instance.db is not None:
        expenses = await db_instance.db["expenses"].find().to_list(100)
    else:
        expenses = await get_mock_expenses()
        
    if not expenses:
        return {"advice": ["Add some expenses to get personalized AI advice!"]}
    
    # Prepare data for LLM
    summary = {}
    for exp in expenses:
        cat = exp["category"]
        summary[cat] = summary.get(cat, 0) + exp["amount"]
    
    prompt = f"User spending summary: {summary}. As a financial advisor for students, give 3 short, actionable suggestions to save money."
    
    if not settings.OPENROUTER_API_KEY or settings.OPENROUTER_API_KEY == "your_openrouter_api_key_here" or settings.OPENROUTER_API_KEY == "":
        # Fallback advice if no API key
        max_cat = max(summary, key=summary.get) if summary else "Unknown"
        return {
            "advice": [
                f"Consider reducing spending on {max_cat} to increase savings.",
                "Set a weekly budget for Entertainment to avoid overspending.",
                "Track your daily small expenses like snacks, they add up quickly!"
            ],
            "is_mock": True
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
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
            data = response.json()
            advice_text = data["choices"][0]["message"]["content"]
            advice_list = [s.strip() for s in advice_text.split("\n") if s.strip() and (s.strip()[0].isdigit() or s.strip()[0] == "-" or s.strip()[0] == "*")]
            return {"advice": advice_list[:3]}
    except Exception as e:
        return {"advice": ["Stay disciplined with your spending!", "Always look for student discounts.", "Small savings today lead to big goals tomorrow!"], "error": str(e)}
