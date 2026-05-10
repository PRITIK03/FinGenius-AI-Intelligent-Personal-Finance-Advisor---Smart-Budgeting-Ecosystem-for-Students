import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const register = (data: { email: string; full_name: string; password: string; monthly_income?: number }) =>
  api.post('/auth/register', data);
export const login = (data: { email: string; password: string }) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data: { full_name?: string; monthly_income?: number }) =>
  api.put('/auth/me', data);

// Expense APIs
export const getExpenses = (params?: { category?: string; start_date?: string; end_date?: string; limit?: number }) =>
  api.get('/expenses/', { params });
export const getExpense = (id: string) => api.get(`/expenses/${id}`);
export const addExpense = (data: { amount: number; description: string; category?: string; date?: string }) =>
  api.post('/expenses/', data);
export const updateExpense = (id: string, data: { amount?: number; description?: string; category?: string; date?: string }) =>
  api.put(`/expenses/${id}`, data);
export const deleteExpense = (id: string) => api.delete(`/expenses/${id}`);
export const getSummary = (params?: { start_date?: string; end_date?: string }) =>
  api.get('/expenses/summary', { params });
export const getCategories = () => api.get('/expenses/categories/list');

// Prediction APIs
export const getPrediction = () => api.get('/predict/');
export const getCategoryPredictions = () => api.get('/predict/by-category');

// AI Advisor APIs
export const getAIAdvice = () => api.get('/ai-advice/');
export const getSpendingInsights = () => api.get('/ai-advice/insights');

// Goals APIs
export const getGoals = () => api.get('/goals/');
export const getGoalsSummary = () => api.get('/goals/summary');
export const createGoal = (data: { name: string; target_amount: number; current_amount?: number; deadline?: string; category?: string }) =>
  api.post('/goals/', data);
export const updateGoal = (id: string, data: any) => api.put(`/goals/${id}`, data);
export const deleteGoal = (id: string) => api.delete(`/goals/${id}`);
export const contributeToGoal = (id: string, amount: number) =>
  api.post(`/goals/${id}/contribute`, null, { params: { amount } });

// Budget APIs
export const getBudgets = () => api.get('/budgets/');
export const getBudgetStatus = () => api.get('/budgets/status');
export const getBudgetAlerts = () => api.get('/budgets/alerts');
export const createBudget = (data: { category: string; monthly_limit: number; alert_threshold?: number }) =>
  api.post('/budgets/', data);
export const updateBudget = (id: string, data: any) => api.put(`/budgets/${id}`, data);
export const deleteBudget = (id: string) => api.delete(`/budgets/${id}`);

// Export APIs
export const exportCSV = () => api.get('/export/csv', { responseType: 'blob' });
export const exportJSON = () => api.get('/export/json', { responseType: 'blob' });
export const exportExcel = () => api.get('/export/excel', { responseType: 'blob' });
export const exportPDF = () => api.get('/export/pdf', { responseType: 'blob' });

// Import APIs
export const importCSV = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/import/csv', formData);
};

export default api;
