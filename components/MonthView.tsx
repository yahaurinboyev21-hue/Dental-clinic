"use client";

import { formatDateISO } from "@/lib/utils";
import type { Appointment } from "@/types";

interface MonthViewProps {
  monthDate: Date;
  appointmentsByDate: Record<string, Appointment[]>;
  onDayClick: (date: Date) => void;
}

const DAY_NAMES = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];

export function MonthView({ monthDate, appointmentsByDate, onDayClick }: MonthViewProps) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const todayISO = formatDateISO(new Date());

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {DAY_NAMES.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const iso = formatDateISO(day);
          const count = appointmentsByDate[iso]?.length ?? 0;
          const isToday = iso === todayISO;
          return (
            <button
              key={iso}
              onClick={() => onDayClick(day)}
              className={`aspect-square rounded-lg border p-1 flex flex-col items-center justify-center text-xs hover:shadow-md transition-shadow ${
                isToday ? "border-primary bg-primary/5 font-bold" : "bg-card"
              }`}
            >
              <span>{day.getDate()}</span>
              {count > 0 && (
                <span className="mt-0.5 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 leading-4">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
