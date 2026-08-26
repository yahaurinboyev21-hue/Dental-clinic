"use client";

import { createBrowserClient } from "@supabase/ssr";

// Brauzer (klient komponentlar) uchun Supabase klienti — auth cookie'lari bilan ishlaydi.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const PATIENT_FILES_BUCKET = "patient-files";
export const MAX_CONCURRENT_APPOINTMENTS = 2; // bir vaqtda nechta kreslo/xona mavjud
