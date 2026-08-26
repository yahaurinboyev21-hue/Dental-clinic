"use client";

import { formatDateISO, formatUZS } from "@/lib/utils";
import type { Appointment } from "@/types";

interface WeekViewProps {
  weekStart: Date;
  appointmentsByDate: Record<string, Appointment[]>;
  onDayClick: (date: Date) => void;
}

const DAY_NAMES = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];

export function WeekView({ weekStart, appointmentsByDate, onDayClick }: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const todayISO = formatDateISO(new Date());

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {days.map((day) => {
        const iso = formatDateISO(day);
        const dayAppointments = appointmentsByDate[iso] ?? [];
        const revenue = dayAppointments.reduce((s, a) => s + a.paid_amount, 0);
        const isToday = iso === todayISO;
        return (
          <button
            key={iso}
            onClick={() => onDayClick(day)}
            className={`rounded-lg border p-2 text-left hover:shadow-md transition-shadow ${
              isToday ? "border-primary bg-primary/5" : "bg-card"
            }`}
          >
            <div className="text-xs text-muted-foreground">{DAY_NAMES[day.getDay()]}</div>
            <div className="text-lg font-bold">{day.getDate()}</div>
            <div className="mt-1 text-xs">
              <span className="font-semibold">{dayAppointments.length}</span> ta qabul
            </div>
            <div className="text-[10px] text-muted-foreground truncate">{formatUZS(revenue)}</div>
          </button>
        );
      })}
    </div>
  );
}
