def categorize_expense(description: str) -> str:
    description = description.lower()
    
    categories = {
        "Food": ["food", "lunch", "dinner", "breakfast", "swiggy", "zomato", "restaurant", "cafe", "canteen", "snacks", "groceries", "milk", "egg"],
        "Travel": ["travel", "auto", "ola", "uber", "bus", "train", "flight", "petrol", "diesel", "fuel", "metro", "rickshaw"],
        "Education": ["books", "tuition", "course", "udemy", "coursera", "exam", "stationery", "pen", "notebook", "college", "university", "fees"],
        "Entertainment": ["movie", "netflix", "prime", "spotify", "gaming", "steam", "concert", "club", "party", "hotstar"],
        "Shopping": ["amazon", "flipkart", "myntra", "clothes", "shoes", "shopping", "gift", "electronics", "laptop", "mobile"],
        "Health": ["medicine", "doctor", "hospital", "gym", "protein", "pharmacy"],
        "Bills": ["rent", "electricity", "water", "wifi", "internet", "recharge", "mobile bill", "gas"]
    }
    
    for category, keywords in categories.items():
        if any(keyword in description for keyword in keywords):
            return category
            
    return "Others"
