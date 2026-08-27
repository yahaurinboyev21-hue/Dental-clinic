import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Appointment } from "@/types";

export const dynamic = "force-dynamic";

function getTashkentDateISO(): string {
  const now = new Date();
  // O'zbekiston UTC+5, DST yo'q — shuning uchun doimiy siljish yetarli.
  const tashkentMs = now.getTime() + 5 * 60 * 60 * 1000;
  const tashkent = new Date(tashkentMs);
  const y = tashkent.getUTCFullYear();
  const m = String(tashkent.getUTCMonth() + 1).padStart(2, "0");
  const d = String(tashkent.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const STATUS_EMOJI: Record<Appointment["status"], string> = {
  pending: "🟡",
  in_progress: "🟢",
  completed: "🔵",
  cancelled: "🔴",
};

const PAYMENT_EMOJI: Record<Appointment["payment_status"], string> = {
  paid: "✅",
  partial: "⚠️",
  unpaid: "❌",
};

export async function GET(request: NextRequest) {
  // Vercel Cron so'rovlarini himoyalash uchun ixtiyoriy tekshiruv
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
    // Sinov uchun ?date=YYYY-MM-DD orqali boshqa sanani ko'rsatish mumkin (CRON_SECRET bilan himoyalangan).
    const dateOverride = request.nextUrl.searchParams.get("date");
    const todayISO = dateOverride || getTashkentDateISO();

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("appointment_date", todayISO)
      .neq("status", "cancelled")
      .order("appointment_time", { ascending: true });

    if (error) throw new Error(error.message);

    const appointments = (data as Appointment[]) ?? [];

    const dateLabel = new Date(todayISO + "T00:00:00").toLocaleDateString("uz-UZ", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let message = `🦷 <b>Bugungi qabullar — ${dateLabel}</b>\n\n`;

    if (appointments.length === 0) {
      message += "Bugun rejalashtirilgan qabullar yo'q.";
    } else {
      appointments.forEach((a, i) => {
        message +=
          `${i + 1}. ⏰ <b>${a.appointment_time.slice(0, 5)}</b> — ${a.first_name} ${a.last_name}\n` +
          `   ${STATUS_EMOJI[a.status]} ${a.service}\n` +
          `   📞 ${a.phone}  |  ${PAYMENT_EMOJI[a.payment_status]} ${a.payment_status}\n\n`;
      });
      message += `\nJami: <b>${appointments.length}</b> ta qabul`;
    }

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
      throw new Error(`Telegram xatoligi: ${JSON.stringify(tgResult)}`);
    }

    return NextResponse.json({ success: true, count: appointments.length });
  } catch (err: any) {
    console.error("telegram-cron xatolik:", err);
    return NextResponse.json({ error: err.message ?? "Noma'lum xatolik" }, { status: 500 });
  }
}
