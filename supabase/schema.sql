-- Kengaytmalar
create extension if not exists "uuid-ossp";

-- Qabullar jadvali
create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  phone text not null,
  service text not null,
  amount numeric not null default 0,
  paid_amount numeric not null default 0,
  payment_status text not null default 'unpaid' check (payment_status in ('paid', 'partial', 'unpaid')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  appointment_date date not null,
  appointment_time time not null,
  duration_minutes integer not null default 30,
  recall_date date,
  notes text,
  file_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_appointments_date on appointments (appointment_date);
create index if not exists idx_appointments_phone on appointments (phone);

-- Realtime uchun jadvalni publication'ga qo'shish
alter publication supabase_realtime add table appointments;

-- Row Level Security — FAQAT tizimga kirgan (authenticated) xodimlarga ruxsat beriladi.
alter table appointments enable row level security;

create policy "Faqat xodimlar: o'qish" on appointments
  for select using (auth.role() = 'authenticated');

create policy "Faqat xodimlar: qo'shish" on appointments
  for insert with check (auth.role() = 'authenticated');

create policy "Faqat xodimlar: yangilash" on appointments
  for update using (auth.role() = 'authenticated');

create policy "Faqat xodimlar: o'chirish" on appointments
  for delete using (auth.role() = 'authenticated');

-- Storage bucket (Rentgen / Foto fayllar uchun)
insert into storage.buckets (id, name, public)
values ('patient-files', 'patient-files', true)
on conflict (id) do nothing;

-- Fayllarni faqat tizimga kirgan xodimlar yuklay/o'chira oladi.
-- "public: true" bucket bo'lgani uchun to'g'ridan-to'g'ri havola orqali ko'rish (select) hammaga ochiq —
-- bu Telegram/brauzerda rasmni ko'rsatish uchun zarur. Agar bu ham yopiq bo'lishi kerak bo'lsa,
-- bucket'ni public: false qiling va signed URL ishlatish kerak bo'ladi.
create policy "Patient files: o'qish (public)" on storage.objects
  for select using (bucket_id = 'patient-files');

create policy "Patient files: yuklash (faqat xodimlar)" on storage.objects
  for insert with check (bucket_id = 'patient-files' and auth.role() = 'authenticated');

create policy "Patient files: o'chirish (faqat xodimlar)" on storage.objects
  for delete using (bucket_id = 'patient-files' and auth.role() = 'authenticated');
