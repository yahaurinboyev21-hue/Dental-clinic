import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Appointment } from "@/types";

export const dynamic = "force-dynamic";

// Bemor qabulidan necha daqiqa oldin eslatma yuborilishi kerakligi.
const REMINDER_MINUTES_BEFORE = 30;
// Tekshiruv oynasi kengligi — tashqi cron chaqiruv oralig'idan (masalan 10 daqiqa)
// kichik bo'lmasligi kerak, aks holda ba'zi qabullar chetlab o'tilishi mumkin.
const WINDOW_MINUTES = 15;

function getTashkentNow(): Date {
  const now = new Date();
  // O'zbekiston UTC+5, DST yo'q — shuning uchun doimiy siljish yetarli.
  return new Date(now.getTime() + 5 * 60 * 60 * 1000);
}

function getTashkentDateISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
    }
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!botToken || !chatId) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN yoki TELEGRAM_ADMIN_CHAT_ID sozlanmagan" },
      { status: 500 }
    );
  }

  try {
    const supabase = createServiceRoleClient();
    const tashkentNow = getTashkentNow();
    const todayISO = getTashkentDateISO(tashkentNow);
    const nowMinutes = tashkentNow.getUTCHours() * 60 + tashkentNow.getUTCMinutes();

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    console.log("DEBUG url=", JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL));
    console.log("DEBUG todayISO=", todayISO, "nowMinutes=", nowMinutes);
    console.log(
      "DEBUG serviceKey len=",
      serviceKey.length,
      "starts=",
      serviceKey.slice(0, 12),
      "ends=",
      serviceKey.slice(-8)
    );

    const { data: allToday, error: allTodayErr } = await supabase
      .from("appointments")
      .select("id, appointment_date, reminder_sent")
      .eq("appointment_date", todayISO);
    console.log("DEBUG allToday=", JSON.stringify(allToday), "err=", JSON.stringify(allTodayErr));

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("appointment_date", todayISO)
      .eq("reminder_sent", false)
      .neq("status", "cancelled")
      .order("appointment_time", { ascending: true });

    console.log("DEBUG mainQuery data=", JSON.stringify(data), "error=", JSON.stringify(error));

    if (error) throw new Error(error.message);

    const appointments = (data as Appointment[]) ?? [];

    // Qabulgacha REMINDER_MINUTES_BEFORE atrofida (WINDOW_MINUTES oynasi bilan) qolgan yozuvlar.
    const dueAppointments = appointments.filter((a) => {
      const [h, m] = a.appointment_time.slice(0, 5).split(":").map(Number);
      const apptMinutes = h * 60 + m;
      const minutesUntil = apptMinutes - nowMinutes;
      return (
        minutesUntil <= REMINDER_MINUTES_BEFORE &&
        minutesUntil > REMINDER_MINUTES_BEFORE - WINDOW_MINUTES
      );
    });

    let sentCount = 0;
    for (const a of dueAppointments) {
      const message =
        `⏰ <b>30 daqiqadan keyin qabul boshlanadi</b>\n\n` +
        `👤 ${a.first_name} ${a.last_name}\n` +
        `🕐 ${a.appointment_time.slice(0, 5)}\n` +
        `🦷 ${a.service}\n` +
        `📞 ${a.phone}`;

      const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      });

      const tgResult = await tgResponse.json();
      if (!tgResult.ok) {
        console.error(`Telegram xatoligi (appointment ${a.id}):`, tgResult);
        continue;
      }

      await supabase.from("appointments").update({ reminder_sent: true }).eq("id", a.id);
      sentCount++;
    }

    return NextResponse.json({ success: true, remindersSent: sentCount, checked: appointments.length });
  } catch (err: any) {
    console.error("telegram-reminder xatolik:", err);
    return NextResponse.json({ error: err.message ?? "Noma'lum xatolik" }, { status: 500 });
  }
}
