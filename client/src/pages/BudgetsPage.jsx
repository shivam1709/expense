import { useEffect, useState } from 'react';
import { api, currentMonth, formatCurrency } from '../api';
import MonthPicker from '../components/MonthPicker.jsx';

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState('');

  function load() {
    setLoading(true);
    api.get(`/budgets?month=${month}`).then((data) => {
      setBudgets(data);
      setLoading(false);
    });
  }

  useEffect(load, [month]);

  function startEdit(b) {
    setEditing(b.categoryId);
    setValue(b.budget > 0 ? String(b.budget) : '');
  }

  async function save(categoryId) {
    await api.put('/budgets', { month, categoryId, amount: Number(value) || 0 });
    setEditing(null);
    load();
  }

  const totalBudget = budgets.reduce((s, b) => s + b.budget, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Budgets</h1>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {totalBudget > 0 && (
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Total budgeted</p>
            <p className="font-semibold">{formatCurrency(totalBudget)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Total spent</p>
            <p className={`font-semibold ${totalSpent > totalBudget ? 'text-red-500' : ''}`}>
              {formatCurrency(totalSpent)}
            </p>
          </div>
        </div>
      )}

      <div className="card p-4">
        {loading ? (
          <p className="text-center text-slate-400 py-8">Loading…</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {budgets.map((b) => (
              <li key={b.categoryId} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">
                    {b.icon} {b.name}
                  </span>
                  {editing === b.categoryId ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="input w-28 py-1.5"
                        value={value}
                        autoFocus
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && save(b.categoryId)}
                      />
                      <button onClick={() => save(b.categoryId)} className="btn-primary py-1.5 px-3 text-sm">
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(b)}
                      className="text-sm text-slate-500 hover:text-brand-600"
                    >
                      {b.budget > 0 ? formatCurrency(b.budget) : 'Set budget'}
                    </button>
                  )}
                </div>
                {b.budget > 0 && (
                  <div className="mt-2">
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          b.status === 'over' ? 'bg-red-500' : b.status === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, b.percentUsed || 0)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatCurrency(b.spent)} spent · {formatCurrency(Math.max(0, b.remaining))} left
                      {b.status === 'over' && (
                        <span className="text-red-500"> · over by {formatCurrency(b.spent - b.budget)}</span>
                      )}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
