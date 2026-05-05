import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import random

MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "fingenius_db"

async def seed_data():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    # Clear existing data
    await db["expenses"].delete_many({})
    
    categories = {
        "Food": ["Lunch at canteen", "Swiggy Dinner", "Zomato Pizza", "Coffee at Starbucks", "Evening Snacks", "Maggi & Eggs", "Restaurant Visit"],
        "Travel": ["Ola to College", "Uber Auto", "Metro Recharge", "Petrol for Bike", "Bus Fare", "Train Ticket"],
        "Education": ["Books for Sem 4", "Udemy Python Course", "Stationery Purchase", "Exam Fee", "Library Fine"],
        "Entertainment": ["Movie Ticket", "Netflix Subscription", "Gaming Parlor", "Club Entry", "Spotify Premium"],
        "Shopping": ["Amazon T-shirt", "Flipkart Shoes", "Mobile Case", "Backpack", "Birthday Gift"],
        "Bills": ["Mobile Recharge", "Wifi Bill", "Room Rent contribution", "Electricity bill"],
        "Others": ["Laundry", "Haircut", "Miscellaneous"]
    }
    
    expenses = []
    end_date = datetime.now()
    
    # Generate 50 random expenses for the last 30 days
    for _ in range(50):
        category = random.choice(list(categories.keys()))
        description = random.choice(categories[category])
        amount = random.randint(50, 2000)
        days_ago = random.randint(0, 30)
        date = end_date - timedelta(days=days_ago)
        
        expenses.append({
            "amount": amount,
            "category": category,
            "description": description,
            "date": date
        })
    
    # Sort by date
    expenses.sort(key=lambda x: x["date"])
    
    await db["expenses"].insert_many(expenses)
    print(f"Successfully seeded {len(expenses)} expenses.")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
