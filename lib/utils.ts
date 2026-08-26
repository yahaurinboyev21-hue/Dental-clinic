import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import imageCompression from "browser-image-compression";
import type { PaymentStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUZS(amount: number): string {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(amount || 0)) + " so'm";
}

export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^998/, "");
  const d = digits.slice(0, 9);
  let out = "+998";
  if (d.length > 0) out += " " + d.slice(0, 2);
  if (d.length > 2) out += " " + d.slice(2, 5);
  if (d.length > 5) out += " " + d.slice(5, 7);
  if (d.length > 7) out += " " + d.slice(7, 9);
  return out;
}

export function getPaymentStatus(amount: number, paidAmount: number): PaymentStatus {
  if (paidAmount <= 0) return "unpaid";
  if (paidAmount >= amount) return "paid";
  return "partial";
}

export async function compressImageFile(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
  };
  try {
    return await imageCompression(file, options);
  } catch (err) {
    console.error("Rasmni siqishda xatolik:", err);
    return file;
  }
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function generateTimeSlots(startHour = 9, endHour = 21, stepMinutes = 30): string[] {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}
