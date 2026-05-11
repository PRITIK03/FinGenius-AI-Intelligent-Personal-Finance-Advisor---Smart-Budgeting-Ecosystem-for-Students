import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, BarChart3, PieChart as PieChartIcon, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getExpenses, getSummary, getCategoryPredictions, getSpendingInsights } from '../api';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6'];

const Analytics = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [predictions, setPredictions] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const fetchData = async () => {
    try {
      const [expensesRes, summaryRes, predictionsRes, insightsRes] = await Promise.all([
        getExpenses({ limit: 1000 }),
        getSummary(),
        getCategoryPredictions(),
        getSpendingInsights()
      ]);
      setExpenses(expensesRes.data);
      setSummary(summaryRes.data);
      setPredictions(predictionsRes.data);
      setInsights(insightsRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare daily spending data
  const getDailyData = () => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    return dateRange.map(date => {
      const dayExpenses = expenses.filter(e => {
        const expDate = typeof e.date === 'string' ? parseISO(e.date) : new Date(e.date);
        return isSameDay(expDate, date);
      });
      
      return {
        date: format(date, 'MMM dd'),
        amount: dayExpenses.reduce((sum, e) => sum + e.amount, 0),
        count: dayExpenses.length
      };
    });
  };

  // Prepare category trend data
  const getCategoryTrends = () => {
    if (!summary?.category_wise) return [];
    
    return Object.entries(summary.category_wise).map(([name, value]) => ({
      name,
      value,
      percentage: summary.total_spending > 0 ? ((value as number) / summary.total_spending * 100).toFixed(1) : 0
    }));
  };

  // Weekly comparison
  const getWeeklyComparison = () => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now);
    const thisWeekEnd = endOfWeek(now);
    const lastWeekStart = subDays(thisWeekStart, 7);
    const lastWeekEnd = subDays(thisWeekEnd, 7);
    
    const thisWeekExpenses = expenses.filter(e => {
      const date = typeof e.date === 'string' ? parseISO(e.date) : new Date(e.date);
      return date >= thisWeekStart && date <= thisWeekEnd;
    });
    
    const lastWeekExpenses = expenses.filter(e => {
      const date = typeof e.date === 'string' ? parseISO(e.date) : new Date(e.date);
      return date >= lastWeekStart && date <= lastWeekEnd;
    });
    
    const thisWeekTotal = thisWeekExpenses.reduce((sum, e) => sum + e.amount, 0);
    const lastWeekTotal = lastWeekExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    const change = lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal * 100) : 0;
    
    return { thisWeekTotal, lastWeekTotal, change };
  };

  const dailyData = getDailyData();
  const categoryData = getCategoryTrends();
  const weeklyComparison = getWeeklyComparison();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center dark:bg-slate-900">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto dark:bg-slate-900 min-h-screen">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 dark:text-white">Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400">Deep insights into your spending patterns</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl dark:bg-slate-800">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                timeRange === range
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
            </button>
          ))}
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-xl dark:bg-blue-900/30">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">Total Spending</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{summary?.total_spending?.toFixed(0) || 0}</p>
          <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">{summary?.total_transactions || 0} transactions</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-xl dark:bg-emerald-900/30">
              <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">Avg. Daily</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            ₹{(summary?.total_spending / (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90))?.toFixed(0) || 0}
          </p>
          <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">per day</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-xl ${weeklyComparison.change > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'}`}>
              {weeklyComparison.change > 0 ? (
                <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">vs Last Week</span>
          </div>
          <p className={`text-2xl font-bold ${weeklyComparison.change > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {weeklyComparison.change > 0 ? '+' : ''}{weeklyComparison.change.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">
            ₹{weeklyComparison.thisWeekTotal.toFixed(0)} this week
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 rounded-xl dark:bg-purple-900/30">
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">Top Category</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {categoryData.length > 0 ? categoryData[0].name : 'N/A'}
          </p>
          <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">
            {categoryData.length > 0 ? `${categoryData[0].percentage}% of total` : ''}
          </p>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Daily Spending Trend */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 mb-6 dark:text-white">Daily Spending Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.95)'}}
                  labelStyle={{color: '#1e293b'}}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{fill: '#3b82f6', strokeWidth: 2, r: 4}}
                  activeDot={{r: 6}}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 mb-6 dark:text-white">Category Distribution</h3>
          <div className="h-[300px] flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.95)'}}
                  formatter={(value: number) => `₹${value.toFixed(0)}`}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-40 space-y-2">
              {categoryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}} />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{entry.name}</span>
                  <span className="text-xs text-slate-400 ml-auto">{entry.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Predictions & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Predictions */}
        {predictions?.predictions && Object.keys(predictions.predictions).length > 0 && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 dark:text-white">
              <PieChartIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Predicted Next Month
            </h3>
            <p className="text-sm text-slate-500 mb-4 dark:text-slate-400">
              Based on your spending patterns
            </p>
            <div className="space-y-3">
              {Object.entries(predictions.predictions).map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl dark:bg-slate-700">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{category}</span>
                  <span className="font-bold text-slate-900 dark:text-slate-200">₹{(amount as number).toFixed(0)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100 dark:bg-purple-900/30 dark:border-purple-800">
                <span className="font-semibold text-purple-700 dark:text-purple-300">Total Predicted</span>
                <span className="font-bold text-purple-700 dark:text-purple-300">₹{predictions.total_predicted?.toFixed(0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* AI Insights */}
        {insights?.insights && insights.insights.length > 0 && (
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-lg">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-200" />
              Smart Insights
            </h3>
            <div className="space-y-4">
              {insights.insights.map((insight: any, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-blue-50">{insight.title}</span>
                    <span className="font-bold text-white">{insight.value}</span>
                  </div>
                  <p className="text-sm text-blue-100">{insight.suggestion}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
