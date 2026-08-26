"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { CalendarGrid } from "@/components/CalendarGrid";
import { WeekView } from "@/components/WeekView";
import { MonthView } from "@/components/MonthView";
import { FinanceDashboard } from "@/components/FinanceDashboard";
import { AppointmentModal } from "@/components/AppointmentModal";
import { ExportButtons } from "@/components/ExportButtons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppointments, useAppointmentsRange } from "@/hooks/useAppointments";
import { supabase } from "@/lib/supabase/client";
import { formatDateISO } from "@/lib/utils";
import type { Appointment, AppointmentInput } from "@/types";

type ViewMode = "day" | "week" | "month";

function getWeekStart(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Home() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const dateISO = useMemo(() => formatDateISO(selectedDate), [selectedDate]);
  const todayISO = useMemo(() => formatDateISO(new Date()), []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [defaultTime, setDefaultTime] = useState<string | undefined>(undefined);

  const { appointments, addAppointment, updateAppointment, deleteAppointment } =
    useAppointments(dateISO);

  // Hafta/oy ko'rinishi uchun — tanlangan sana joylashgan oyning butun oralig'i olinadi
  // (hafta ko'rinishi ham shu ma'lumotdan foydalanadi).
  const monthStart = useMemo(
    () => formatDateISO(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)),
    [selectedDate]
  );
  const monthEnd = useMemo(
    () => formatDateISO(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)),
    [selectedDate]
  );
  const { appointmentsByDate } = useAppointmentsRange(monthStart, monthEnd);

  const filteredAppointments = useMemo(() => {
    if (!search.trim()) return appointments;
    const q = search.trim().toLowerCase();
    return appointments.filter(
      (a) =>
        `${a.first_name} ${a.last_name}`.toLowerCase().includes(q) ||
        a.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""))
    );
  }, [appointments, search]);

  function changeDay(offset: number) {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + offset);
      return next;
    });
  }

  function openAddModal(time: string) {
    setEditingAppointment(null);
    setDefaultTime(time);
    setModalOpen(true);
  }

  function openEditModal(appointment: Appointment) {
    setEditingAppointment(appointment);
    setDefaultTime(undefined);
    setModalOpen(true);
  }

  function goToDay(date: Date) {
    setSelectedDate(date);
    setViewMode("day");
  }

  async function handleSave(input: AppointmentInput, id?: string) {
    if (id) {
      await updateAppointment(id, input);
    } else {
      await addAppointment(input);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen p-3 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" /> Dental CRM
        </h1>
        <div className="flex items-center gap-2">
          <SearchBar value={search} onChange={setSearch} />
          <ThemeToggle />
          <Button variant="outline" size="icon" onClick={handleSignOut} title="Chiqish">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <FinanceDashboard todayISO={todayISO} />

      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex rounded-lg border p-1">
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {mode === "day" ? "Kun" : mode === "week" ? "Hafta" : "Oy"}
            </button>
          ))}
        </div>
        <ExportButtons
          appointments={viewMode === "day" ? filteredAppointments : Object.values(appointmentsByDate).flat()}
          label={dateISO}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-card p-2">
        <Button variant="outline" size="icon" onClick={() => changeDay(viewMode === "month" ? -30 : viewMode === "week" ? -7 : -1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center">
          <span className="font-semibold">
            {mounted
              ? viewMode === "month"
                ? selectedDate.toLocaleDateString("uz-UZ", { month: "long", year: "numeric" })
                : selectedDate.toLocaleDateString("uz-UZ", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
              : " "}
          </span>
          <button
            className="text-xs text-primary underline print:hidden"
            onClick={() => setSelectedDate(new Date())}
          >
            Bugunga qaytish
          </button>
        </div>
        <Button variant="outline" size="icon" onClick={() => changeDay(viewMode === "month" ? 30 : viewMode === "week" ? 7 : 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {viewMode === "day" && (
        <CalendarGrid
          appointments={filteredAppointments}
          onSlotClick={openAddModal}
          onPatientClick={openEditModal}
        />
      )}

      {viewMode === "week" && (
        <WeekView
          weekStart={getWeekStart(selectedDate)}
          appointmentsByDate={appointmentsByDate}
          onDayClick={goToDay}
        />
      )}

      {viewMode === "month" && (
        <MonthView
          monthDate={selectedDate}
          appointmentsByDate={appointmentsByDate}
          onDayClick={goToDay}
        />
      )}

      <AppointmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        date={dateISO}
        defaultTime={defaultTime}
        appointment={editingAppointment}
        appointmentsForDay={appointments}
        onSave={handleSave}
        onDelete={deleteAppointment}
      />
    </main>
  );
}
