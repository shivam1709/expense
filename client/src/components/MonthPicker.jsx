import { shiftMonth, formatMonthLabel, currentMonth } from '../api';

export default function MonthPicker({ month, onChange }) {
  const isCurrent = month === currentMonth();
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(shiftMonth(month, -1))}
        className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:opacity-80"
        aria-label="Previous month"
      >
        ‹
      </button>
      <div className="font-semibold min-w-[9rem] text-center">{formatMonthLabel(month)}</div>
      <button
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={isCurrent}
        className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:opacity-80 disabled:opacity-30"
        aria-label="Next month"
      >
        ›
      </button>
    </div>
  );
}
