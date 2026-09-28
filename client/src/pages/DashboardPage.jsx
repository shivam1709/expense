import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { api, currentMonth, formatCurrency, formatMonthLabel } from '../api';
import MonthPicker from '../components/MonthPicker.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [balance, setBalance] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, partner } = useAuth();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get(`/expenses/stats/summary?month=${month}`),
      api.get('/expenses/stats/trend?months=6'),
      api.get(`/budgets?month=${month}`),
      api.get('/settlements/balance'),
      api.get(`/expenses?month=${month}&limit=6`),
    ]).then(([s, t, b, bal, r]) => {
      if (cancelled) return;
      setSummary(s);
      setTrend(t);
      setBudgets(b.filter((x) => x.budget > 0));
      setBalance(bal);
      setRecent(r);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const delta = useMemo(() => {
    if (!summary) return null;
    if (!summary.previousMonthTotal) return null;
    const diff = summary.total - summary.previousMonthTotal;
    const pct = Math.round((diff / summary.previousMonthTotal) * 100);
    return { diff, pct };
  }, [summary]);

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading your statement…</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Monthly Statement</h1>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Total spent</p>
          <p className="text-2xl font-bold">{formatCurrency(summary.total)}</p>
          {delta && (
            <p className={`text-xs mt-1 ${delta.diff > 0 ? 'text-red-500' : 'text-green-600'}`}>
              {delta.diff > 0 ? '▲' : '▼'} {Math.abs(delta.pct)}% vs last month
            </p>
          )}
        </div>
        <BalanceCard balance={balance} user={user} partner={partner} />
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Spending by category</h2>
          <span className="text-xs text-slate-400">{summary.count} expenses</span>
        </div>
        {summary.categories.length === 0 ? (
          <EmptyState text="No expenses logged this month yet." />
        ) : (
          <CategoryPie categories={summary.categories} total={summary.total} />
        )}
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">Spending by person</h2>
        {!summary.byPerson?.some((p) => p.total > 0) ? (
          <EmptyState text="No expenses logged this month yet." />
        ) : (
          <PersonSplit byPerson={summary.byPerson} total={summary.total} />
        )}
      </div>

      {budgets.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Budget check-in</h2>
            <Link to="/budgets" className="text-xs text-brand-600 font-medium">
              Manage →
            </Link>
          </div>
          <div className="space-y-3">
            {budgets.map((b) => (
              <BudgetBar key={b.categoryId} budget={b} />
            ))}
          </div>
        </div>
      )}

      <div className="card p-4">
        <h2 className="font-semibold mb-3">6-month trend</h2>
        <TrendChart trend={trend} />
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Recent expenses</h2>
          <Link to="/expenses" className="text-xs text-brand-600 font-medium">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState text="Nothing here yet — add your first expense." />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recent.map((e) => (
              <li key={e.id} className="py-2.5 flex items-center gap-3">
                <span className="text-xl">{e.categoryIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.description}</p>
                  <p className="text-xs text-slate-500">
                    {e.categoryName} · {e.paidByName} · {e.date}
                  </p>
                </div>
                <span className="font-semibold text-sm">{formatCurrency(e.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="text-sm text-slate-400 text-center py-6">{text}</p>;
}

function BalanceCard({ balance, user, partner }) {
  if (!balance || !balance.owedBy) {
    return (
      <div className="card p-4">
        <p className="text-xs text-slate-500 mb-1">Balance</p>
        <p className="text-lg font-bold text-green-600">All settled 🎉</p>
      </div>
    );
  }
  const iAmOwed = balance.owedTo === user?.id;
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-500 mb-1">Balance</p>
      <p className="text-lg font-bold">
        {iAmOwed ? (
          <span className="text-green-600">+{formatCurrency(balance.netAmount)}</span>
        ) : (
          <span className="text-red-500">-{formatCurrency(balance.netAmount)}</span>
        )}
      </p>
      <p className="text-xs text-slate-500 mt-1">
        {iAmOwed ? `${partner?.name || 'They'} owes you` : `You owe ${partner?.name || 'them'}`}
      </p>
    </div>
  );
}

function CategoryPie({ categories, total }) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="w-full sm:w-1/2 h-52">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={categories}
              dataKey="total"
              nameKey="name"
              innerRadius="55%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="none"
            >
              {categories.map((c) => (
                <Cell key={c.categoryId} fill={c.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatCurrency(value), name]}
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 w-full space-y-2">
        {categories.map((c) => (
          <li key={c.categoryId} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
            <span className="flex-1 truncate">
              {c.icon} {c.name}
            </span>
            <span className="text-slate-400 text-xs">{Math.round((c.total / total) * 100)}%</span>
            <span className="font-medium">{formatCurrency(c.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PersonSplit({ byPerson, total }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {byPerson.map((p) => (
          <div key={p.userId}>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-sm truncate">{p.name}</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(p.total)}</p>
            <p className="text-xs text-slate-400">
              {total > 0 ? Math.round((p.total / total) * 100) : 0}% of household spend
            </p>
          </div>
        ))}
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
        {byPerson.map((p) => (
          <div
            key={p.userId}
            style={{
              width: `${total > 0 ? (p.total / total) * 100 : 100 / byPerson.length}%`,
              backgroundColor: p.color,
            }}
          />
        ))}
      </div>
      <p className="text-xs text-slate-400">
        Includes your full share of any split expenses, not just what you personally paid upfront.
      </p>
    </div>
  );
}

function BudgetBar({ budget }) {
  const pct = Math.min(100, budget.percentUsed || 0);
  const color =
    budget.status === 'over' ? 'bg-red-500' : budget.status === 'warning' ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>
          {budget.icon} {budget.name}
        </span>
        <span className="text-slate-500">
          {formatCurrency(budget.spent)} / {formatCurrency(budget.budget)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {budget.status === 'over' && (
        <p className="text-xs text-red-500 mt-1">Over budget by {formatCurrency(budget.spent - budget.budget)}</p>
      )}
    </div>
  );
}

function TrendChart({ trend }) {
  const data = trend.map((t) => ({ ...t, label: formatMonthLabel(t.month).split(' ')[0] }));
  return (
    <div className="h-48">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: -20, right: 10 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={50} />
          <Tooltip
            formatter={(value) => formatCurrency(value)}
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
          />
          <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fill="url(#trendFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
