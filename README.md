# FinGenius AI: Intelligent Personal Finance Advisor

FinGenius AI is a smart, AI-powered personal finance advisor designed specifically for students. It helps users track expenses, analyze spending behavior, predict future savings, and generate personalized financial advice.

## 🚀 Features
- **Smart Categorization:** Automatically classifies expenses using keyword-based ML.
- **Spending Dashboard:** Interactive charts showing monthly trends and category breakdowns.
- **AI Financial Advisor:** Personalized suggestions generated via LLM integration (OpenRouter).
- **Budget Prediction:** Linear Regression models to forecast next month's spending.
- **Glassmorphic UI:** Modern, clean, and interactive interface built with React and Framer Motion.

## 🛠️ Tech Stack
- **Frontend:** React (Vite), Tailwind CSS, Framer Motion, Recharts, Lucide Icons.
- **Backend:** FastAPI, Python, Motor (Async MongoDB Driver).
- **ML/AI:** Scikit-learn, Pandas, OpenRouter API.
- **Database:** MongoDB (with Mock JSON fallback support).

## 🏃 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (optional, fallback available)

### Backend Setup
1. `cd backend`
2. `python -m venv venv`
3. `.\venv\Scripts\Activate.ps1` (Windows) or `source venv/bin/activate` (Mac/Linux)
4. `pip install -r requirements.txt`
5. Copy `.env.example` to `.env` and add your keys.
6. `uvicorn app:app --reload`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`

### Seed Data (Optional)
To populate with sample data:
`python dataset/generate_mock.py`

## 📄 License
MIT
