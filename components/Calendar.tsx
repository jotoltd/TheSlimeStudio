"use client";

import { useEffect, useRef, useState } from "react";

function toISO(d: Date) {
  const copy = new Date(d);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().split("T")[0];
}

function fromISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

export default function Calendar({
  value,
  onChange,
  min,
  disableDays = [],
}: {
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  disableDays?: number[];
}) {
  const [open, setOpen] = useState(false);
  const selected = fromISO(value);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const minDate = min ? fromISO(min) : null;

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function isDisabled(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    if (disableDays.includes(d.getDay())) return true;
    if (!minDate) return false;
    const minMidnight = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    return d < minMidnight;
  }

  function isSelected(day: number) {
    return (
      viewYear === selected.getFullYear() &&
      viewMonth === selected.getMonth() &&
      day === selected.getDate()
    );
  }

  function isToday(day: number) {
    const t = new Date();
    return viewYear === t.getFullYear() && viewMonth === t.getMonth() && day === t.getDate();
  }

  function selectDay(day: number) {
    if (isDisabled(day)) return;
    const d = new Date(viewYear, viewMonth, day);
    onChange(toISO(d));
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  const displayDate = selected.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm text-left bg-white flex items-center justify-between focus:outline-none focus:border-[#ff2d78]"
      >
        <span>{displayDate}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink/40">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 bg-white rounded-2xl shadow-lg border border-ink/10 p-3 md:p-4 w-[270px] md:w-[300px] left-0 sm:left-auto sm:right-0">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="w-8 h-8 rounded-full hover:bg-ink/5 grid place-items-center text-ink/60">
              ‹
            </button>
            <span className="font-display text-sm">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="w-8 h-8 rounded-full hover:bg-ink/5 grid place-items-center text-ink/60">
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_NAMES.map((d, i) => (
              <div key={i} className="text-center text-[0.7rem] text-ink/40 font-medium py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const disabled = isDisabled(day);
              const sel = isSelected(day);
              const today = isToday(day);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(day)}
                  className={`h-9 rounded-lg text-sm transition-colors ${
                    disabled
                      ? "text-ink/20 cursor-not-allowed"
                      : sel
                      ? "bg-[#ff2d78] text-white font-semibold"
                      : today
                      ? "bg-[#ff2d78]/10 text-[#ff2d78] font-semibold hover:bg-[#ff2d78]/20"
                      : "text-ink hover:bg-ink/5"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
