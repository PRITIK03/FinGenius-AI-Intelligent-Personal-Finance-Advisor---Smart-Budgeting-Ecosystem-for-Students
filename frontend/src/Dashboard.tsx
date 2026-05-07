import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { 
  LayoutDashboard, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  PlusCircle, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  Loader2,
  Edit2,
  Trash2,
  Target,
  Menu,
  X,
  Download,
  LogOut
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getExpenses, getSummary, getPrediction, getAIAdvice, 
  addExpense, updateExpense, deleteExpense, getCategories, exportCSV,
  getGoalsSummary
} from './api';
import { useAuth } from './context/AuthContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6'];

const categoryIcons: { [key: string]: string } = {
  Food: '🍔',
  Travel: '🚗',
  Education: '📚',
  Entertainment: '🎮',
  Shopping: '🛍️',
  Health: '💊',
  Bills: '📄',
  Others: '📦'
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [goalsSummary, setGoalsSummary] = useState<any>(null);
  const [advice, setAdvice] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [newExpense, setNewExpense] = useState({ 
    amount: '', 
    description: '', 
    category: '',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      const [expRes, sumRes, predRes, advRes, catRes, goalsRes] = await Promise.all([
        getExpenses(),
        getSummary(),
        getPrediction(),
        getAIAdvice(),
        getCategories(),
        getGoalsSummary().catch(() => ({ data: null }))
      ]);
      setExpenses(expRes.data);
      setSummary(sumRes.data);
      setPrediction(predRes.data);
      setAdvice(advRes.data.advice || []);
      setCategories(catRes.data?.categories || []);
      setGoalsSummary(goalsRes.data);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addExpense({ 
        amount: parseFloat(newExpense.amount), 
        description: newExpense.description,
        category: newExpense.category || undefined,
        date: newExpense.date
      });
      setNewExpense({ amount: '', description: '', category: '', date: new Date().toISOString().split('T')[0] });
      setShowAddModal(false);
      fetchData();
    } catch (error) {
      console.error("Error adding expense", error);
    }
  };

  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    try {
      await updateExpense(editingExpense._id, {
        amount: parseFloat(editingExpense.amount),
        description: editingExpense.description,
        category: editingExpense.category,
        date: editingExpense.date
      });
      setEditingExpense(null);
      setShowEditModal(false);
      fetchData();
    } catch (error) {
      console.error("Error updating expense", error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await deleteExpense(id);
      fetchData();
    } catch (error) {
      console.error("Error deleting expense", error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await exportCSV();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'expenses.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting", error);
    }
  };

  const startEditing = (expense: any) => {
    setEditingExpense({
      ...expense,
      date: new Date(expense.date).toISOString().split('T')[0]
    });
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  // Calculate dynamic values
  const monthlyIncome = user?.monthly_income || 0;
  const totalSpending = summary?.total_spending || 0;
  const actualSavings = Math.max(0, monthlyIncome - totalSpending);
  const totalBalance = actualSavings + (goalsSummary?.total_saved || 0);

  const chartData = expenses.slice(0, 7).reverse().map(e => ({
    date: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    amount: e.amount
  }));

  const pieData = summary ? Object.keys(summary.category_wise).map(cat => ({
    name: cat,
    value: summary.category_wise[cat]
  })) : [];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col hidden md:flex">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Wallet className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">FinGenius AI</h1>
          </div>
          <button
            onClick={() => {
              setDarkMode(!darkMode);
              localStorage.setItem('darkMode', (!darkMode).toString());
            }}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5 text-slate-600" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>
        </div>
        
        <nav className="space-y-1 flex-1">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-600 rounded-xl font-medium transition-all">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link to="/analytics" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-medium transition-all">
            <TrendingUp className="w-5 h-5" />
            Analytics
          </Link>
          <Link to="/budgets" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-medium transition-all">
            <PieChartIcon className="w-5 h-5" />
            Budgets
          </Link>
          <Link to="/goals" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-medium transition-all">
            <Target className="w-5 h-5" />
            Goals
          </Link>
        </nav>

        <div className="space-y-3">
          <div className="p-4 bg-blue-600 rounded-2xl text-white">
            <p className="text-xs text-blue-100 mb-1">Total Balance</p>
            <p className="text-xl font-bold">₹{totalBalance.toFixed(0)}</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="mt-4 w-full bg-white text-blue-600 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Add Expense
            </button>
          </div>
          
          <button 
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl text-sm font-medium transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 p-4 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Wallet className="text-white w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">FinGenius AI</h1>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        
        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-2"
            >
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-600 rounded-xl font-medium">
                <LayoutDashboard className="w-5 h-5" /> Dashboard
              </Link>
              <Link to="/analytics" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-slate-500">
                <TrendingUp className="w-5 h-5" /> Analytics
              </Link>
              <Link to="/budgets" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-slate-500">
                <PieChartIcon className="w-5 h-5" /> Budgets
              </Link>
              <Link to="/goals" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-slate-500">
                <Target className="w-5 h-5" /> Goals
              </Link>
              <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 text-red-500 w-full">
                <LogOut className="w-5 h-5" /> Logout
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8 mt-16 md:mt-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.full_name?.split(' ')[0] || 'Student'}!
            </h2>
            <p className="text-slate-500">Here's what's happening with your money today.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 font-bold">
              {user?.full_name?.charAt(0) || 'S'}
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 rounded-2xl">
                <TrendingUp className="text-blue-600 w-6 h-6" />
              </div>
              <span className="flex items-center text-emerald-500 text-sm font-medium bg-emerald-50 px-2 py-1 rounded-lg">
                <ArrowDownRight className="w-4 h-4 mr-1" />
                12%
              </span>
            </div>
            <p className="text-slate-500 text-sm font-medium">Total Spending</p>
            <h3 className="text-3xl font-bold text-slate-900">₹{summary?.total_spending || 0}</h3>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-50 rounded-2xl">
                <Sparkles className="text-purple-600 w-6 h-6" />
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium">Predicted Next Month</p>
            <h3 className="text-3xl font-bold text-slate-900">
              ₹{prediction?.predicted_next_month || 'Calculating...'}
            </h3>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-50 rounded-2xl">
                <Wallet className="text-amber-600 w-6 h-6" />
              </div>
              <span className={`flex items-center text-sm font-medium px-2 py-1 rounded-lg ${
                actualSavings >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
              }`}>
                {actualSavings >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                {monthlyIncome > 0 ? ((actualSavings / monthlyIncome) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <p className="text-slate-500 text-sm font-medium">Monthly Savings</p>
            <h3 className="text-3xl font-bold text-slate-900">₹{actualSavings.toFixed(0)}</h3>
            {monthlyIncome > 0 && (
              <p className="text-xs text-slate-400 mt-1">Income: ₹{monthlyIncome.toFixed(0)}</p>
            )}
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h4 className="text-lg font-bold text-slate-900 mb-6">Spending Trend</h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h4 className="text-lg font-bold text-slate-900 mb-6">Category Distribution</h4>
            <div className="h-[300px] flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-1/3 space-y-2">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                    <span className="text-xs font-medium text-slate-600">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights & Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-200" />
              <h4 className="text-lg font-bold">AI Financial Advice</h4>
            </div>
            <div className="space-y-4">
              {advice.map((item, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={idx} 
                  className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm"
                >
                  <p className="text-sm text-blue-50 leading-relaxed">{item}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-bold text-slate-900">Recent Transactions</h4>
              <Link 
                to="/analytics" 
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                See all
              </Link>
            </div>
            <div className="space-y-4">
              {expenses.slice(0, 5).map((exp, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-white transition-colors">
                      <span className="text-xl">
                        {categoryIcons[exp.category] || '📦'}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{exp.description}</p>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{exp.category} • {new Date(exp.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="font-bold text-slate-900">₹{exp.amount}</p>
                      <p className="text-xs text-slate-400">{new Date(exp.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditing(exp)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(exp._id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md p-8 rounded-[32px] shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Add New Expense</h3>
              <form onSubmit={handleAddExpense} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Amount (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    placeholder="e.g. 250"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                  <input 
                    type="text" 
                    required
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                    placeholder="What did you buy?"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Category (Optional)</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="">Auto-categorize</option>
                    {categories.map((cat) => (
                      <option key={cat.name} value={cat.name}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
                  <input 
                    type="date" 
                    required
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                  >
                    Save Expense
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Expense Modal */}
      <AnimatePresence>
        {showEditModal && editingExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md p-8 rounded-[32px] shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Edit Expense</h3>
              <form onSubmit={handleEditExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Amount (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={editingExpense.amount}
                    onChange={(e) => setEditingExpense({...editingExpense, amount: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                  <input 
                    type="text" 
                    required
                    value={editingExpense.description}
                    onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                  <select
                    value={editingExpense.category}
                    onChange={(e) => setEditingExpense({...editingExpense, category: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    {categories.map((cat) => (
                      <option key={cat.name} value={cat.name}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
                  <input 
                    type="date" 
                    required
                    value={editingExpense.date}
                    onChange={(e) => setEditingExpense({...editingExpense, date: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                  >
                    Update Expense
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
