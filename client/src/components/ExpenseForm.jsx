import { useState } from 'react';

const today = () => new Date().toISOString().slice(0, 10);

export default function ExpenseForm({ categories, users, initial, onSubmit, onCancel, submitLabel = 'Save' }) {
  const [form, setForm] = useState(() => ({
    amount: initial?.amount ?? '',
    description: initial?.description ?? '',
    categoryId: initial?.categoryId ?? categories[0]?.id ?? '',
    paidBy: initial?.paidBy ?? users[0]?.id ?? '',
    date: initial?.date ?? today(),
    isShared: initial?.isShared ?? false,
    splitType: initial?.splitType && initial.splitType !== 'none' ? initial.splitType : 'equal',
    splitPayerShare: initial?.splitPayerShare ?? 50,
    notes: initial?.notes ?? '',
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
        splitPayerShare: Number(form.splitPayerShare),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const otherUser = users.find((u) => u.id !== Number(form.paidBy));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Amount</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className="input"
          value={form.amount}
          onChange={(e) => set('amount', e.target.value)}
          placeholder="0.00"
          autoFocus
        />
      </div>
      <div>
        <label className="label">Description</label>
        <input
          className="input"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="e.g. Grocery run at Whole Foods"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
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
          <label className="label">Date</label>
          <input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </div>
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
        Split this expense with {otherUser?.name || 'partner'}
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
              <label className="label">
                Payer's share ({form.splitPayerShare}% / {100 - form.splitPayerShare}% for {otherUser?.name})
              </label>
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

      <div>
        <label className="label">Notes (optional)</label>
        <textarea
          className="input"
          rows={2}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
