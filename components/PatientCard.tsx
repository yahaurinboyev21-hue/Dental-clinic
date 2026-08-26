"use client";

import { Badge } from "@/components/ui/badge";
import { formatUZS } from "@/lib/utils";
import type { Appointment } from "@/types";

const STATUS_MAP: Record<
  Appointment["status"],
  { label: string; variant: "yellow" | "green" | "blue" | "red" }
> = {
  pending: { label: "🟡 Kutilmoqda", variant: "yellow" },
  in_progress: { label: "🟢 Xonada", variant: "green" },
  completed: { label: "🔵 Yakunlandi", variant: "blue" },
  cancelled: { label: "🔴 Bekor qilindi", variant: "red" },
};

const PAYMENT_MAP: Record<
  Appointment["payment_status"],
  { label: string; variant: "green" | "yellow" | "red" }
> = {
  paid: { label: "To'liq", variant: "green" },
  partial: { label: "Qisman", variant: "yellow" },
  unpaid: { label: "To'lanmadi", variant: "red" },
};

interface PatientCardProps {
  appointment: Appointment;
  onClick: () => void;
}

export function PatientCard({ appointment, onClick }: PatientCardProps) {
  const status = STATUS_MAP[appointment.status];
  const payment = PAYMENT_MAP[appointment.payment_status];

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border bg-card p-2 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-1"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate">
          {appointment.first_name} {appointment.last_name}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          {appointment.appointment_time.slice(0, 5)}
        </span>
      </div>
      <span className="text-xs text-muted-foreground truncate">{appointment.service}</span>
      <div className="flex flex-wrap items-center gap-1">
        <Badge variant={status.variant} className="text-[10px] px-1.5 py-0">
          {status.label}
        </Badge>
        <Badge variant={payment.variant} className="text-[10px] px-1.5 py-0">
          {payment.label}
        </Badge>
      </div>
      <span className="text-xs font-medium">{formatUZS(appointment.amount)}</span>
    </button>
  );
}
