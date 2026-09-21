import { useEffect, useState } from 'react';
import { api, currentMonth, formatCurrency } from '../api';
import MonthPicker from '../components/MonthPicker.jsx';
import Modal from '../components/Modal.jsx';
import ExpenseForm from '../components/ExpenseForm.jsx';

export default function ExpensesPage() {
  const [month, setMonth] = useState(currentMonth());
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { mode: 'add' | 'edit', expense? }

  useEffect(() => {
    Promise.all([api.get('/categories'), api.get('/users')]).then(([c, u]) => {
      setCategories(c);
      setUsers(u);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ month });
    if (categoryFilter) params.set('categoryId', categoryFilter);
    if (search) params.set('search', search);
    api.get(`/expenses?${params}`).then((data) => {
      setExpenses(data);
      setLoading(false);
    });
  }, [month, categoryFilter, search]);

  function refresh() {
    const params = new URLSearchParams({ month });
    if (categoryFilter) params.set('categoryId', categoryFilter);
    if (search) params.set('search', search);
    api.get(`/expenses?${params}`).then(setExpenses);
  }

  async function handleCreate(values) {
    await api.post('/expenses', values);
    setModal(null);
    refresh();
  }

  async function handleUpdate(values) {
    await api.put(`/expenses/${modal.expense.id}`, values);
    setModal(null);
    refresh();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${id}`);
    refresh();
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Expenses</h1>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="input flex-1"
          placeholder="Search description or notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input sm:w-48" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-500">{expenses.length} expenses</span>
          <span className="font-semibold">{formatCurrency(total)}</span>
        </div>

        {loading ? (
          <p className="text-center text-slate-400 py-8">Loading…</p>
        ) : expenses.length === 0 ? (
          <p className="text-center text-slate-400 py-8">No expenses match your filters.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {expenses.map((e) => (
              <li key={e.id} className="py-3 flex items-center gap-3">
                <span className="text-2xl shrink-0">{e.categoryIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.description}</p>
                  <p className="text-xs text-slate-500">
                    {e.categoryName} · {e.paidByName} · {e.date}
                    {e.isShared && ' · split'}
                    {e.isRecurring && ' · recurring'}
                  </p>
                  {e.notes && <p className="text-xs text-slate-400 mt-0.5 truncate">{e.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-sm">{formatCurrency(e.amount)}</span>
                  <button
                    onClick={() => setModal({ mode: 'edit', expense: e })}
                    className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm"
                    aria-label="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm"
                    aria-label="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={() => setModal({ mode: 'add' })} className="btn-primary fixed bottom-24 md:bottom-8 right-6 shadow-lg z-10">
        + Add expense
      </button>

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Add expense' : 'Edit expense'} onClose={() => setModal(null)}>
          <ExpenseForm
            categories={categories}
            users={users}
            initial={modal.expense}
            onSubmit={modal.mode === 'add' ? handleCreate : handleUpdate}
            onCancel={() => setModal(null)}
            submitLabel={modal.mode === 'add' ? 'Add expense' : 'Save changes'}
          />
        </Modal>
      )}
    </div>
  );
}
