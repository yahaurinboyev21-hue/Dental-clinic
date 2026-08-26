export type AppointmentStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type PaymentStatus = "paid" | "partial" | "unpaid";

export interface Appointment {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  service: string;
  amount: number;
  paid_amount: number;
  payment_status: PaymentStatus;
  status: AppointmentStatus;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:mm:ss yoki HH:mm
  duration_minutes: number;
  recall_date: string | null;
  notes: string | null;
  file_url: string | null;
  reminder_sent: boolean;
  created_at: string;
}

export type AppointmentInput = Omit<Appointment, "id" | "created_at" | "payment_status" | "reminder_sent">;
