import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Plus, Trash2, Edit2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { getBudgets, getBudgetAlerts, getBudgetStatus, createBudget, updateBudget, deleteBudget } from '../api';

interface Budget {
  _id: string;
  category: string;
  monthly_limit: number;
  alert_threshold: number;
}

interface BudgetStatus {
  category: string;
  monthly_limit: number;
  current_spending: number;
  remaining: number;
  percentage_used: number;
  alert_triggered: boolean;
}

const categoryColors: { [key: string]: string } = {
  Food: 'bg-orange-500',
  Travel: 'bg-blue-500',
  Education: 'bg-purple-500',
  Entertainment: 'bg-pink-500',
  Shopping: 'bg-rose-500',
  Health: 'bg-red-500',
  Bills: 'bg-amber-500',
  Others: 'bg-slate-500'
};

const Budgets = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [status, setStatus] = useState<BudgetStatus[]>([]);
  const [alerts, setAlerts] = useState<BudgetStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [newBudget, setNewBudget] = useState({
    category: 'Food',
    monthly_limit: '',
    alert_threshold: 80
  });

  const categories = ['Food', 'Travel', 'Education', 'Entertainment', 'Shopping', 'Health', 'Bills', 'Others'];

  const fetchData = async () => {
    try {
      const [budgetsRes, statusRes, alertsRes] = await Promise.all([
        getBudgets(),
        getBudgetStatus(),
        getBudgetAlerts()
      ]);
      setBudgets(budgetsRes.data);
      setStatus(statusRes.data);
      setAlerts(alertsRes.data?.alerts || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBudget({
        category: newBudget.category,
        monthly_limit: parseFloat(newBudget.monthly_limit),
        alert_threshold: newBudget.alert_threshold
      });
      setNewBudget({ category: 'Food', monthly_limit: '', alert_threshold: 80 });
      setShowAddModal(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create budget');
    }
  };

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;
    try {
      await updateBudget(editingBudget._id, {
        monthly_limit: editingBudget.monthly_limit,
        alert_threshold: editingBudget.alert_threshold
      });
      setEditingBudget(null);
      fetchData();
    } catch (error) {
      console.error('Error updating budget:', error);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    try {
      await deleteBudget(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center dark:bg-slate-900">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto dark:bg-slate-900 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 dark:text-white">Budget Management</h1>
        <p className="text-slate-500 dark:text-slate-400">Set and track your monthly spending limits</p>
      </header>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl dark:bg-amber-900/30 dark:border-amber-800"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">Budget Alerts</h3>
          </div>
          <div className="space-y-1">
            {alerts.map((alert) => (
              <p key={alert.category} className="text-sm text-amber-700 dark:text-amber-400">
                {alert.category}: You've used {alert.percentage_used.toFixed(0)}% of your budget
                (₹{alert.current_spending.toFixed(0)} / ₹{alert.monthly_limit.toFixed(0)})
              </p>
            ))}
          </div>
        </motion.div>
      )}

      {/* Add Budget Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          Set New Budget
        </button>
      </div>

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {status.map((budgetStatus, idx) => {
          const budget = budgets.find(b => b.category === budgetStatus.category);
          if (!budget) return null;

          return (
            <motion.div
              key={budget._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-shadow dark:bg-slate-800 ${
                budgetStatus.alert_triggered ? 'border-red-200 dark:border-red-800' : 'border-slate-100 dark:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                    categoryColors[budgetStatus.category] || 'bg-slate-500'
                  }`}>
                    <span className="text-lg">
                      {budgetStatus.category === 'Food' && '🍔'}
                      {budgetStatus.category === 'Travel' && '🚗'}
                      {budgetStatus.category === 'Education' && '📚'}
                      {budgetStatus.category === 'Entertainment' && '🎮'}
                      {budgetStatus.category === 'Shopping' && '🛍️'}
                      {budgetStatus.category === 'Health' && '💊'}
                      {budgetStatus.category === 'Bills' && '📄'}
                      {budgetStatus.category === 'Others' && '📦'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{budgetStatus.category}</h3>
                    <span className="text-xs text-slate-400 dark:text-slate-500">Monthly Budget</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingBudget(budget)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all dark:hover:bg-blue-900/30"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBudget(budget._id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500 dark:text-slate-400">Used</span>
                  <span className={`font-semibold ${
                    budgetStatus.alert_triggered ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-200'
                  }`}>
                    ₹{budgetStatus.current_spending.toFixed(0)} / ₹{budgetStatus.monthly_limit.toFixed(0)}
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-700">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(budgetStatus.percentage_used, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      budgetStatus.percentage_used >= 100
                        ? 'bg-red-500'
                        : budgetStatus.alert_triggered
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {budgetStatus.percentage_used.toFixed(1)}% used
                  </span>
                  {budgetStatus.alert_triggered ? (
                    <span className="flex items-center gap-1 text-xs text-red-600 font-medium dark:text-red-400">
                      <AlertCircle className="w-3 h-3" />
                      Alert triggered
                    </span>
                  ) : budgetStatus.percentage_used < 100 ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium dark:text-emerald-400">
                      <CheckCircle className="w-3 h-3" />
                      On track
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 p-3 rounded-xl dark:bg-slate-700">
                  <p className="text-slate-400 text-xs dark:text-slate-500">Remaining</p>
                  <p className={`font-semibold ${
                    budgetStatus.remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-200'
                  }`}>
                    ₹{budgetStatus.remaining.toFixed(0)}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl dark:bg-slate-700">
                  <p className="text-slate-400 text-xs dark:text-slate-500">Alert At</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-200">{budget.alert_threshold}%</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {status.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-slate-800">
            <Wallet className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2 dark:text-white">No budgets set</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">Create budgets to track and control your spending</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700"
          >
            Set Your First Budget
          </button>
        </div>
      )}

      {/* Add Budget Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md p-8 rounded-[32px] shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Set Budget</h3>
              <form onSubmit={handleCreateBudget} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                  <select
                    value={newBudget.category}
                    onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Monthly Limit (₹)</label>
                  <input
                    type="number"
                    required
                    value={newBudget.monthly_limit}
                    onChange={(e) => setNewBudget({ ...newBudget, monthly_limit: e.target.value })}
                    placeholder="5000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Alert Threshold (%)
                    <span className="text-xs text-slate-400 font-normal ml-2">Warn when exceeded</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newBudget.alert_threshold}
                    onChange={(e) => setNewBudget({ ...newBudget, alert_threshold: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200"
                  >
                    Set Budget
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Budget Modal */}
      <AnimatePresence>
        {editingBudget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingBudget(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md p-8 rounded-[32px] shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Edit Budget</h3>
              <p className="text-slate-500 mb-4">{editingBudget.category}</p>
              <form onSubmit={handleUpdateBudget} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Monthly Limit (₹)</label>
                  <input
                    type="number"
                    required
                    value={editingBudget.monthly_limit}
                    onChange={(e) => setEditingBudget({ ...editingBudget, monthly_limit: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Alert Threshold (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editingBudget.alert_threshold}
                    onChange={(e) => setEditingBudget({ ...editingBudget, alert_threshold: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingBudget(null)}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200"
                  >
                    Update Budget
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

export default Budgets;
