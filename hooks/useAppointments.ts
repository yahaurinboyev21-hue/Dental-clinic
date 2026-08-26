"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getPaymentStatus } from "@/lib/utils";
import type { Appointment, AppointmentInput } from "@/types";

export function useAppointments(dateISO: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("appointment_date", dateISO)
      .order("appointment_time", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setAppointments((data as Appointment[]) ?? []);
    }
    setLoading(false);
  }, [dateISO]);

  useEffect(() => {
    fetchAppointments();

    const channel = supabase
      .channel(`appointments-${dateISO}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `appointment_date=eq.${dateISO}`,
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateISO, fetchAppointments]);

  const addAppointment = useCallback(async (input: AppointmentInput) => {
    const payment_status = getPaymentStatus(input.amount, input.paid_amount);
    const { data, error } = await supabase
      .from("appointments")
      .insert([{ ...input, payment_status }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Appointment;
  }, []);

  const updateAppointment = useCallback(
    async (id: string, input: Partial<AppointmentInput>) => {
      const patch: Partial<Appointment> = { ...input };
      if (input.amount !== undefined || input.paid_amount !== undefined) {
        const current = appointments.find((a) => a.id === id);
        const amount = input.amount ?? current?.amount ?? 0;
        const paid = input.paid_amount ?? current?.paid_amount ?? 0;
        patch.payment_status = getPaymentStatus(amount, paid);
      }
      const { data, error } = await supabase
        .from("appointments")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Appointment;
    },
    [appointments]
  );

  const deleteAppointment = useCallback(async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }, []);

  return {
    appointments,
    loading,
    error,
    refetch: fetchAppointments,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  };
}

// Hafta/oy ko'rinishlari uchun — berilgan sana oralig'idagi barcha qabullarni sana bo'yicha guruhlab qaytaradi.
export function useAppointmentsRange(startISO: string, endISO: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRange = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .gte("appointment_date", startISO)
      .lte("appointment_date", endISO)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    if (!error) {
      setAppointments((data as Appointment[]) ?? []);
    }
    setLoading(false);
  }, [startISO, endISO]);

  useEffect(() => {
    fetchRange();

    const channel = supabase
      .channel(`appointments-range-${startISO}-${endISO}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          fetchRange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [startISO, endISO, fetchRange]);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      if (!map[a.appointment_date]) map[a.appointment_date] = [];
      map[a.appointment_date].push(a);
    }
    return map;
  }, [appointments]);

  return { appointments, appointmentsByDate, loading, refetch: fetchRange };
}
