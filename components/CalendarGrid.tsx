"use client";

import { generateTimeSlots } from "@/lib/utils";
import { PatientCard } from "@/components/PatientCard";
import { Plus } from "lucide-react";
import type { Appointment } from "@/types";

interface CalendarGridProps {
  appointments: Appointment[];
  onSlotClick: (time: string) => void;
  onPatientClick: (appointment: Appointment) => void;
}

export function CalendarGrid({ appointments, onSlotClick, onPatientClick }: CalendarGridProps) {
  const slots = generateTimeSlots(9, 21, 30);

  const getAppointmentsForSlot = (time: string) =>
    appointments.filter((a) => a.appointment_time.slice(0, 5) === time);

  return (
    <div className="w-full">
      {/* Mobil: vertikal kunlik ro'yxat */}
      <div className="flex flex-col gap-2 md:hidden">
        {slots.map((time) => {
          const slotAppointments = getAppointmentsForSlot(time);
          return (
            <div key={time} className="flex gap-3 border-b pb-2">
              <div className="w-14 shrink-0 pt-2 text-sm font-medium text-muted-foreground">
                {time}
              </div>
              <div className="flex-1 flex flex-col gap-2">
                {slotAppointments.map((a) => (
                  <PatientCard key={a.id} appointment={a} onClick={() => onPatientClick(a)} />
                ))}
                <button
                  onClick={() => onSlotClick(time)}
                  className="flex items-center justify-center gap-1 rounded-lg border border-dashed p-2 text-xs text-muted-foreground hover:bg-accent"
                >
                  <Plus className="h-3 w-3" /> Bemor qo'shish
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Kompyuter: keng soatlik grid */}
      <div className="hidden md:block">
        {slots.map((time) => {
          const slotAppointments = getAppointmentsForSlot(time);
          const isHour = time.endsWith(":00");
          return (
            <div key={time} className={`flex gap-3 border-b py-2 ${isHour ? "bg-muted/30" : ""}`}>
              <div className="w-16 shrink-0 pt-1 text-sm font-semibold text-muted-foreground">
                {time}
              </div>
              <div className="flex-1 flex flex-wrap gap-2">
                {slotAppointments.map((a) => (
                  <div key={a.id} className="w-56">
                    <PatientCard appointment={a} onClick={() => onPatientClick(a)} />
                  </div>
                ))}
                <button
                  onClick={() => onSlotClick(time)}
                  className="w-40 flex items-center justify-center gap-1 rounded-lg border border-dashed p-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" /> Qo'shish
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
