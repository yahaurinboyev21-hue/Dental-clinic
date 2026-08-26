"use client";

import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import type { Appointment } from "@/types";

interface ExportButtonsProps {
  appointments: Appointment[];
  label: string;
}

export function ExportButtons({ appointments, label }: ExportButtonsProps) {
  function exportExcel() {
    const rows = appointments.map((a) => ({
      Sana: a.appointment_date,
      Vaqt: a.appointment_time.slice(0, 5),
      Ism: a.first_name,
      Familiya: a.last_name,
      Telefon: a.phone,
      Xizmat: a.service,
      Summa: a.amount,
      "Olingan summa": a.paid_amount,
      Qarzdorlik: Math.max(a.amount - a.paid_amount, 0),
      "To'lov holati": a.payment_status,
      Status: a.status,
      Izoh: a.notes ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Qabullar");
    XLSX.writeFile(wb, `qabullar-${label}.xlsx`);
  }

  return (
    <div className="flex gap-2 print:hidden">
      <Button variant="outline" size="sm" onClick={exportExcel}>
        <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4 mr-1" /> Chop etish
      </Button>
    </div>
  );
}
