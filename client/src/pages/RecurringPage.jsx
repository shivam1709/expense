import { useEffect, useState } from 'react';
import { api, formatCurrency } from '../api';
import Modal from '../components/Modal.jsx';

export default function RecurringPage() {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  function load() {
    setLoading(true);
    api.get('/recurring').then((data) => {
      setTemplates(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
    Promise.all([api.get('/categories'), api.get('/users')]).then(([c, u]) => {
      setCategories(c);
      setUsers(u);
    });
  }, []);

  async function toggleActive(t) {
    await api.put(`/recurring/${t.id}`, { ...formToBody(t), active: !t.active });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this recurring expense? Past generated expenses will stay.')) return;
    await api.delete(`/recurring/${id}`);
    load();
  }

  async function handleCreate(body) {
    await api.post('/recurring', body);
    setModal(null);
    load();
  }

  async function handleUpdate(body) {
    await api.put(`/recurring/${modal.template.id}`, { ...body, active: modal.template.active });
    setModal(null);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Recurring expenses</h1>
      </div>
      <p className="text-sm text-slate-500">
        Rent, subscriptions, and other bills that repeat monthly. We'll add them to your expenses automatically
        each month.
      </p>

      <div className="card p-4">
        {loading ? (
          <p className="text-center text-slate-400 py-8">Loading…</p>
        ) : templates.length === 0 ? (
          <p className="text-center text-slate-400 py-8">No recurring expenses yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {templates.map((t) => (
              <li key={t.id} className="py-3 flex items-center gap-3">
                <span className="text-2xl shrink-0">{t.categoryIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description}</p>
                  <p className="text-xs text-slate-500">
                    {t.categoryName} · {t.paidByName} · day {t.dayOfMonth} of month
                    {t.isShared && ' · split'}
                  </p>
                </div>
                <span className="font-semibold text-sm shrink-0">{formatCurrency(t.amount)}</span>
                <button
                  onClick={() => toggleActive(t)}
                  className={`h-6 w-11 rounded-full flex items-center px-0.5 shrink-0 transition ${
                    t.active ? 'bg-brand-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                  aria-label="Toggle active"
                >
                  <span className="h-5 w-5 rounded-full bg-white shadow" />
                </button>
                <button
                  onClick={() => setModal({ mode: 'edit', template: t })}
                  className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={() => setModal({ mode: 'add' })}
        className="btn-primary fixed bottom-24 md:bottom-8 right-6 shadow-lg z-10"
      >
        + Add recurring
      </button>

      {modal && (
        <Modal
          title={modal.mode === 'add' ? 'Add recurring expense' : 'Edit recurring expense'}
          onClose={() => setModal(null)}
        >
          <RecurringForm
            categories={categories}
            users={users}
            initial={modal.template}
            onSubmit={modal.mode === 'add' ? handleCreate : handleUpdate}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function formToBody(t) {
  return {
    description: t.description,
    amount: t.amount,
    categoryId: t.categoryId,
    paidBy: t.paidBy,
    isShared: t.isShared,
    splitType: t.splitType,
    splitPayerShare: t.splitPayerShare,
    dayOfMonth: t.dayOfMonth,
  };
}

function RecurringForm({ categories, users, initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({
    description: initial?.description ?? '',
    amount: initial?.amount ?? '',
    categoryId: initial?.categoryId ?? categories[0]?.id ?? '',
    paidBy: initial?.paidBy ?? users[0]?.id ?? '',
    dayOfMonth: initial?.dayOfMonth ?? 1,
    isShared: initial?.isShared ?? false,
    splitType: initial?.splitType && initial.splitType !== 'none' ? initial.splitType : 'equal',
    splitPayerShare: initial?.splitPayerShare ?? 50,
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.amount || Number(form.amount) <= 0) return setError('Enter a valid amount.');
    if (!form.description.trim()) return setError('Description is required.');
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        amount: Number(form.amount),
        categoryId: Number(form.categoryId),
        paidBy: Number(form.paidBy),
        dayOfMonth: Number(form.dayOfMonth),
        splitPayerShare: Number(form.splitPayerShare),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Description</label>
        <input
          className="input"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="e.g. Netflix, Rent"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Day of month</label>
          <input
            type="number"
            min="1"
            max="28"
            className="input"
            value={form.dayOfMonth}
            onChange={(e) => set('dayOfMonth', e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="label">Category</label>
        <select className="input" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Paid by</label>
        <div className="grid grid-cols-2 gap-2">
          {users.map((u) => (
            <button
              type="button"
              key={u.id}
              onClick={() => set('paidBy', u.id)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                Number(form.paidBy) === u.id
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              {u.name}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
        <input
          type="checkbox"
          checked={form.isShared}
          onChange={(e) => set('isShared', e.target.checked)}
          className="h-4 w-4 rounded accent-brand-600"
        />
        Split this expense
      </label>
      {form.isShared && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => set('splitType', 'equal')}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm ${
                form.splitType === 'equal' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-900'
              }`}
            >
              Split 50 / 50
            </button>
            <button
              type="button"
              onClick={() => set('splitType', 'custom')}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm ${
                form.splitType === 'custom' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-900'
              }`}
            >
              Custom split
            </button>
          </div>
          {form.splitType === 'custom' && (
            <div>
              <label className="label">Payer's share ({form.splitPayerShare}%)</label>
              <input
                type="range"
                min="0"
                max="100"
                value={form.splitPayerShare}
                onChange={(e) => set('splitPayerShare', e.target.value)}
                className="w-full accent-brand-600"
              />
            </div>
          )}
        </div>
      )}
      {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
