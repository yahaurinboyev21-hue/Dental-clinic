"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { formatUZS } from "@/lib/utils";
import type { Appointment } from "@/types";
import { History, Loader2 } from "lucide-react";

interface PatientHistoryProps {
  phone: string;
  excludeId?: string;
}

export function PatientHistory({ phone, excludeId }: PatientHistoryProps) {
  const [visits, setVisits] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    supabase
      .from("appointments")
      .select("*")
      .eq("phone", phone)
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        setVisits(((data as Appointment[]) ?? []).filter((v) => v.id !== excludeId));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, phone, excludeId]);

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return null;

  return (
    <div className="col-span-2 border-t pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
      >
        <History className="h-3.5 w-3.5" />
        {open ? "Tashrif tarixini yashirish" : "Bemor tashrif tarixini ko'rish"}
      </button>

      {open && (
        <div className="mt-2 max-h-40 overflow-y-auto space-y-1 pr-1">
          {loading && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Yuklanmoqda...
            </p>
          )}
          {!loading && visits.length === 0 && (
            <p className="text-xs text-muted-foreground">Oldingi tashriflar topilmadi.</p>
          )}
          {!loading &&
            visits.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-2 rounded-md bg-muted px-2 py-1 text-xs"
              >
                <span className="truncate">
                  {v.appointment_date} · {v.appointment_time.slice(0, 5)} — {v.service}
                </span>
                <span className="shrink-0 font-medium">{formatUZS(v.amount)}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
