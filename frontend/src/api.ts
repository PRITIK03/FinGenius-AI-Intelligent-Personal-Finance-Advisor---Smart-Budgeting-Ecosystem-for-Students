import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

export const getExpenses = () => api.get('/expenses/');
export const addExpense = (data: { amount: number; description: string; date?: string }) => api.post('/expenses/', data);
export const getSummary = () => api.get('/expenses/summary');
export const getPrediction = () => api.get('/predict/');
export const getAIAdvice = () => api.get('/ai-advice/');

export default api;
