import json
from datetime import datetime, timedelta
import random

def generate_mock_data():
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
            "date": date.isoformat()
        })
    
    expenses.sort(key=lambda x: x["date"])
    
    with open("dataset/mock_expenses.json", "w") as f:
        json.dump(expenses, f, indent=4)
    print("Successfully generated mock_expenses.json")

if __name__ == "__main__":
    generate_mock_data()
