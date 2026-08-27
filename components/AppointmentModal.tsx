"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PatientHistory } from "@/components/PatientHistory";
import { Upload, Trash2, Loader2, AlertTriangle, X, Phone, Pencil } from "lucide-react";
import { supabase, PATIENT_FILES_BUCKET, MAX_CONCURRENT_APPOINTMENTS } from "@/lib/supabase/client";
import {
  compressImageFile,
  formatPhoneInput,
  formatUZS,
  getPaymentStatus,
} from "@/lib/utils";
import type { Appointment, AppointmentInput, AppointmentStatus } from "@/types";

const SERVICES = [
  "Konsultatsiya",
  "Tish davolash (karies)",
  "Kanal davolash",
  "Tish olib tashlash",
  "Implantatsiya",
  "Protezlash",
  "Tish tozalash",
  "Oqartirish",
  "Breket taqish",
  "Rentgen",
];

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: "pending", label: "🟡 Kutilmoqda" },
  { value: "in_progress", label: "🟢 Xonada" },
  { value: "completed", label: "🔵 Yakunlandi" },
  { value: "cancelled", label: "🔴 Bekor qilindi" },
];

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  defaultTime?: string;
  appointment?: Appointment | null;
  appointmentsForDay: Appointment[];
  onSave: (input: AppointmentInput, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const EMPTY_FORM: AppointmentInput = {
  first_name: "",
  last_name: "",
  phone: "+998 ",
  service: SERVICES[0],
  amount: 0,
  paid_amount: 0,
  status: "pending",
  appointment_date: "",
  appointment_time: "09:00",
  duration_minutes: 30,
  recall_date: null,
  recall_time: null,
  notes: null,
  file_url: null,
};

function isImageUrl(url: string) {
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url) || url.includes("supabase.co");
}

export function AppointmentModal({
  open,
  onOpenChange,
  date,
  defaultTime,
  appointment,
  appointmentsForDay,
  onSave,
  onDelete,
}: AppointmentModalProps) {
  const [form, setForm] = useState<AppointmentInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  useEffect(() => {
    if (appointment) {
      const { id, created_at, payment_status, ...rest } = appointment;
      setForm(rest);
      setIsViewMode(true);
    } else {
      setForm({
        ...EMPTY_FORM,
        appointment_date: date,
        appointment_time: defaultTime ?? "09:00",
      });
      setIsViewMode(false);
    }
    setErrorMsg(null);
  }, [appointment, date, defaultTime, open]);

  const debt = Math.max(form.amount - form.paid_amount, 0);
  const paymentStatus = getPaymentStatus(form.amount, form.paid_amount);

  // Shu vaqt oralig'ida allaqachon nechta bemor bor — kreslo/xona sig'imidan oshib ketishni oldini olish uchun.
  const slotCount = useMemo(() => {
    return appointmentsForDay.filter(
      (a) =>
        a.id !== appointment?.id &&
        a.status !== "cancelled" &&
        a.appointment_time.slice(0, 5) === form.appointment_time
    ).length;
  }, [appointmentsForDay, appointment, form.appointment_time]);
  const overCapacity = slotCount >= MAX_CONCURRENT_APPOINTMENTS;

  function update<K extends keyof AppointmentInput>(key: K, value: AppointmentInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErrorMsg(null);
    try {
      const compressed = await compressImageFile(file);
      const filePath = `${form.phone.replace(/\D/g, "") || "no-phone"}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(PATIENT_FILES_BUCKET)
        .upload(filePath, compressed, { upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(PATIENT_FILES_BUCKET).getPublicUrl(filePath);
      update("file_url", data.publicUrl);
    } catch (err: any) {
      setErrorMsg(`Faylni yuklashda xatolik: ${err.message ?? err}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setErrorMsg("Ism va Familiya kiritilishi shart.");
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      await onSave(form, appointment?.id);
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(`Saqlashda xatolik: ${err.message ?? err}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!appointment || !onDelete) return;
    if (!confirm("Ushbu yozuvni o'chirishga ishonchingiz komilmi?")) return;
    setSaving(true);
    try {
      await onDelete(appointment.id);
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(`O'chirishda xatolik: ${err.message ?? err}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="flex-row items-center justify-between space-y-0 pr-6">
          <DialogTitle>
            {isViewMode ? "Bemor ma'lumotlari" : appointment ? "Bemorni tahrirlash" : "Yangi bemor qo'shish"}
          </DialogTitle>
          {isViewMode && (
            <Button variant="outline" size="icon" onClick={() => setIsViewMode(false)} title="Tahrirlash">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </DialogHeader>

        {isViewMode ? (
          <div className="space-y-3">
            <div>
              <div className="text-lg font-semibold">
                {form.first_name} {form.last_name}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{form.phone}</span>
                {form.phone.replace(/\D/g, "").length >= 9 && (
                  <a
                    href={`tel:${form.phone.replace(/\D/g, "")}`}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-input hover:bg-accent"
                    title="Qo'ng'iroq qilish"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Sana / Vaqt</div>
                <div>
                  {form.appointment_date} · {form.appointment_time.slice(0, 5)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Xizmat turi</div>
                <div>{form.service}</div>
              </div>
            </div>

            <div className="rounded-md bg-muted p-2 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span>Summasi: {formatUZS(form.amount)}</span>
                <span>Olingan: {formatUZS(form.paid_amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>
                  Qarzdorlik:{" "}
                  <strong className={debt > 0 ? "text-destructive" : ""}>{formatUZS(debt)}</strong>
                </span>
                <span>
                  Holat:{" "}
                  {paymentStatus === "paid" ? "To'liq" : paymentStatus === "partial" ? "Qisman" : "To'lanmadi"}
                </span>
              </div>
            </div>

            <div className="text-sm">
              <span className="text-xs text-muted-foreground">Qabul statusi: </span>
              {STATUS_OPTIONS.find((s) => s.value === form.status)?.label}
            </div>

            {form.recall_date && (
              <div className="text-sm">
                <span className="text-xs text-muted-foreground">Keyingi chaqiruv: </span>
                {form.recall_date}
                {form.recall_time ? ` · ${form.recall_time.slice(0, 5)}` : ""}
              </div>
            )}

            {form.file_url && isImageUrl(form.file_url) && (
              <button type="button" onClick={() => setImagePreviewOpen(true)} className="block">
                <img
                  src={form.file_url}
                  alt="Rentgen / Foto"
                  className="h-24 w-24 rounded-md border object-cover"
                />
              </button>
            )}
            {form.file_url && !isImageUrl(form.file_url) && (
              <a href={form.file_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                Faylni ko'rish
              </a>
            )}

            {form.notes && (
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Izoh</div>
                <div className="whitespace-pre-wrap">{form.notes}</div>
              </div>
            )}

            <PatientHistory phone={form.phone} excludeId={appointment?.id} />
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Ism</Label>
            <Input
              value={form.first_name}
              onChange={(e) => update("first_name", e.target.value)}
              placeholder="Ism"
            />
          </div>
          <div className="space-y-1">
            <Label>Familiya</Label>
            <Input
              value={form.last_name}
              onChange={(e) => update("last_name", e.target.value)}
              placeholder="Familiya"
            />
          </div>

          <div className="col-span-2 space-y-1">
            <Label>Telefon raqami</Label>
            <div className="flex gap-2">
              <Input
                value={form.phone}
                onChange={(e) => update("phone", formatPhoneInput(e.target.value))}
                placeholder="+998 90 123 45 67"
              />
              {form.phone.replace(/\D/g, "").length >= 9 && (
                <a
                  href={`tel:${form.phone.replace(/\D/g, "")}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input hover:bg-accent"
                  title="Qo'ng'iroq qilish"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Sana</Label>
            <Input
              type="date"
              value={form.appointment_date}
              onChange={(e) => update("appointment_date", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Vaqt</Label>
            <Input
              type="time"
              value={form.appointment_time}
              onChange={(e) => update("appointment_time", e.target.value)}
            />
          </div>

          {overCapacity && (
            <div className="col-span-2 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-2 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Bu vaqtga allaqachon <strong>{slotCount}</strong> ta bemor yozilgan (sig'im:{" "}
                {MAX_CONCURRENT_APPOINTMENTS} ta kreslo). Baribir shu vaqtga qo'shishingiz mumkin,
                lekin band bo'lib qolmasligiga ishonch hosil qiling.
              </span>
            </div>
          )}

          <div className="col-span-2 space-y-1">
            <Label>Xizmat turi</Label>
            <input
              list="services-list"
              value={form.service}
              onChange={(e) => update("service", e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base md:text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Xizmat turini tanlang yoki kiriting"
            />
            <datalist id="services-list">
              {SERVICES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1">
            <Label>Summasi (UZS)</Label>
            <Input
              type="number"
              min={0}
              value={form.amount === 0 ? "" : form.amount}
              onChange={(e) => update("amount", e.target.value === "" ? 0 : Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label>Olingan summa (UZS)</Label>
            <Input
              type="number"
              min={0}
              value={form.paid_amount === 0 ? "" : form.paid_amount}
              onChange={(e) => update("paid_amount", e.target.value === "" ? 0 : Number(e.target.value))}
            />
          </div>

          <div className="col-span-2 rounded-md bg-muted p-2 text-sm flex items-center justify-between">
            <span>
              Qarzdorlik:{" "}
              <strong className={debt > 0 ? "text-destructive" : ""}>{formatUZS(debt)}</strong>
            </span>
            <span>
              Holat:{" "}
              {paymentStatus === "paid"
                ? "To'liq"
                : paymentStatus === "partial"
                ? "Qisman"
                : "To'lanmadi"}
            </span>
          </div>

          <div className="col-span-2 space-y-1">
            <Label>Qabul statusi</Label>
            <Select value={form.status} onValueChange={(v) => update("status", v as AppointmentStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Navbatdagi chaqiruv sanasi</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={form.recall_date ?? ""}
                onChange={(e) => update("recall_date", e.target.value || null)}
              />
              <Input
                type="time"
                className="w-28"
                value={form.recall_time ?? ""}
                onChange={(e) => update("recall_time", e.target.value || null)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Rentgen / Foto</Label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 cursor-pointer rounded-md border border-dashed px-3 py-1.5 text-xs hover:bg-accent">
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3" />
                )}
                Yuklash
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
              {form.file_url && !isImageUrl(form.file_url) && (
                <a
                  href={form.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary underline"
                >
                  Faylni ko'rish
                </a>
              )}
            </div>
            {form.file_url && isImageUrl(form.file_url) && (
              <button type="button" onClick={() => setImagePreviewOpen(true)} className="block">
                <img
                  src={form.file_url}
                  alt="Rentgen / Foto"
                  className="mt-2 h-24 w-24 rounded-md border object-cover"
                />
              </button>
            )}
          </div>

          <div className="col-span-2 space-y-1">
            <Label>Izoh</Label>
            <Textarea
              value={form.notes ?? ""}
              onChange={(e) => update("notes", e.target.value || null)}
              placeholder="Qo'shimcha izoh..."
            />
          </div>

          <PatientHistory phone={form.phone} excludeId={appointment?.id} />
        </div>
        )}

        {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}

        <DialogFooter className="gap-2">
          {isViewMode ? (
            <>
              {appointment && onDelete && (
                <Button variant="destructive" onClick={handleDelete} disabled={saving} className="mr-auto">
                  <Trash2 className="h-4 w-4 mr-1" /> O'chirish
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Yopish
              </Button>
            </>
          ) : (
            <>
              {appointment && onDelete && (
                <Button variant="destructive" onClick={handleDelete} disabled={saving} className="mr-auto">
                  <Trash2 className="h-4 w-4 mr-1" /> O'chirish
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => (appointment ? setIsViewMode(true) : onOpenChange(false))}
                disabled={saving}
              >
                Bekor qilish
              </Button>
              <Button onClick={handleSubmit} disabled={saving || uploading}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Saqlash
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {imagePreviewOpen && form.file_url && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
        onClick={() => setImagePreviewOpen(false)}
      >
        <img
          src={form.file_url}
          alt="Rentgen / Foto"
          className="max-h-full max-w-full rounded-md object-contain"
        />
        <button
          type="button"
          onClick={() => setImagePreviewOpen(false)}
          className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-black hover:bg-white"
          aria-label="Yopish"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    )}
    </>
  );
}
