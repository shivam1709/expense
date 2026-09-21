import { useEffect, useState } from 'react';
import { api, formatCurrency } from '../api';
import { useAuth } from '../context/AuthContext.jsx';

const today = () => new Date().toISOString().slice(0, 10);

export default function SettlePage() {
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { user, partner } = useAuth();

  function load() {
    setLoading(true);
    Promise.all([api.get('/settlements/balance'), api.get('/settlements')]).then(([b, h]) => {
      setBalance(b);
      setHistory(h);
      setLoading(false);
    });
  }

  useEffect(load, []);

  async function recordSettlement(e) {
    e.preventDefault();
    setError('');
    if (!amount || Number(amount) <= 0) return setError('Enter a valid amount.');
    if (!balance.owedBy) return setError('Nothing to settle right now.');
    setSaving(true);
    try {
      await api.post('/settlements', {
        fromUser: balance.owedBy,
        toUser: balance.owedTo,
        amount: Number(amount),
        date: today(),
        note,
      });
      setAmount('');
      setNote('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this settlement record?')) return;
    await api.delete(`/settlements/${id}`);
    load();
  }

  if (loading) return <p className="text-center text-slate-400 py-20">Loading…</p>;

  const owedByName = balance.owedBy === user?.id ? user.name : partner?.name;
  const owedToName = balance.owedTo === user?.id ? user.name : partner?.name;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Settle up</h1>

      <div className="card p-6 text-center">
        {!balance.owedBy ? (
          <>
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-semibold text-green-600">You're all settled up!</p>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-1">
              <span className="font-semibold">{owedByName}</span> owes{' '}
              <span className="font-semibold">{owedToName}</span>
            </p>
            <p className="text-3xl font-bold">{formatCurrency(balance.netAmount)}</p>
          </>
        )}
      </div>

      {balance.owedBy && (
        <form onSubmit={recordSettlement} className="card p-4 space-y-3">
          <h2 className="font-semibold text-sm">Record a payment</h2>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              placeholder={`Up to ${formatCurrency(balance.netAmount)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setAmount(String(balance.netAmount))}
              className="btn-secondary shrink-0"
            >
              Full amount
            </button>
          </div>
          <input
            className="input"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Recording…' : `Mark ${owedByName} as paid`}
          </button>
        </form>
      )}

      <div className="card p-4">
        <h2 className="font-semibold mb-3">Settlement history</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No settlements recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.map((h) => (
              <li key={h.id} className="py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {h.fromName} → {h.toName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {h.date}
                    {h.note && ` · ${h.note}`}
                  </p>
                </div>
                <span className="font-semibold text-sm">{formatCurrency(h.amount)}</span>
                <button
                  onClick={() => handleDelete(h.id)}
                  className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
