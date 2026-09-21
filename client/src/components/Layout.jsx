import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/expenses', label: 'Expenses', icon: '🧾' },
  { to: '/budgets', label: 'Budgets', icon: '🎯' },
  { to: '/recurring', label: 'Recurring', icon: '🔁' },
  { to: '/settle', label: 'Settle', icon: '🤝' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <span className="text-xl">💜</span>
            <span>Our Expenses</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDark}
              className="h-9 w-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:opacity-80"
              aria-label="Toggle dark mode"
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
              style={{ backgroundColor: user?.color }}
              title={user?.name}
            >
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              Log out
            </button>
          </div>
        </div>
        <nav className="hidden md:flex max-w-3xl mx-auto px-4 gap-1 pb-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-5">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                  isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
