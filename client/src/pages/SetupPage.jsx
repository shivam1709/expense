import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

const empty = { name: '', email: '', password: '' };

export default function SetupPage() {
  const [checking, setChecking] = useState(true);
  const [people, setPeople] = useState([{ ...empty }, { ...empty }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/auth/setup-status').then((data) => {
      if (!data.needsSetup) navigate('/login', { replace: true });
      setChecking(false);
    });
  }, [navigate]);

  function updatePerson(idx, field, value) {
    setPeople((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/setup', { users: people });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (checking) return null;

  if (done) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-xl font-semibold mb-2">You're all set up!</h1>
        <p className="text-slate-500">Taking you to login…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-brand-50 to-pink-50 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">💜</div>
          <h1 className="text-2xl font-bold">Welcome to Our Expenses</h1>
          <p className="text-slate-500 mt-1">
            Set up accounts for the two of you. This household only ever has two members.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-5 space-y-5">
          {people.map((p, idx) => (
            <div key={idx} className="space-y-3">
              <h2 className="font-semibold text-sm text-brand-600 dark:text-brand-400">
                Person {idx + 1}
              </h2>
              <div>
                <label className="label">Name</label>
                <input
                  className="input"
                  required
                  value={p.name}
                  onChange={(e) => updatePerson(idx, 'name', e.target.value)}
                  placeholder={idx === 0 ? 'Your name' : "Partner's name"}
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  required
                  value={p.email}
                  onChange={(e) => updatePerson(idx, 'email', e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input"
                  required
                  minLength={6}
                  value={p.password}
                  onChange={(e) => updatePerson(idx, 'password', e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
              {idx === 0 && <hr className="border-slate-200 dark:border-slate-800" />}
            </div>
          ))}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Setting up…' : 'Create our household'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          Already set up? <Link to="/login" className="text-brand-600 font-medium">Log in</Link>
        </p>
      </div>
    </div>
  );
}
