import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Supabase Free reja limitlari.
const DB_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB
const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB
const WARNING_THRESHOLD = 0.8; // 80%

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
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
    const { data, error } = await supabase.rpc("get_storage_stats").single();
    if (error) throw new Error(error.message);

    const stats = data as { db_size_bytes: number; files_size_bytes: number };
    const dbBytes = Number(stats.db_size_bytes ?? 0);
    const filesBytes = Number(stats.files_size_bytes ?? 0);
    const dbPercent = dbBytes / DB_LIMIT_BYTES;
    const filesPercent = filesBytes / STORAGE_LIMIT_BYTES;
    const overThreshold = dbPercent >= WARNING_THRESHOLD || filesPercent >= WARNING_THRESHOLD;

    if (overThreshold) {
      const message =
        `⚠️ <b>Bepul xotira limiti tugab bormoqda</b>\n\n` +
        `🗄️ Ma'lumotlar bazasi: ${formatMB(dbBytes)} MB / 500 MB (${Math.round(dbPercent * 100)}%)\n` +
        `🖼️ Fayllar (rasmlar): ${formatMB(filesBytes)} MB / 1024 MB (${Math.round(filesPercent * 100)}%)\n\n` +
        `Tavsiya: eski yozuvlarni Excel'ga eksport qilib arxivlang yoki Supabase rejasini yangilashni ko'rib chiqing.`;

      const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
      });
      const tgResult = await tgResponse.json();
      if (!tgResult.ok) {
        console.error("Telegram xatoligi:", tgResult);
      }
    }

    return NextResponse.json({
      success: true,
      dbBytes,
      filesBytes,
      dbPercent: Math.round(dbPercent * 100),
      filesPercent: Math.round(filesPercent * 100),
      alertSent: overThreshold,
    });
  } catch (err: any) {
    console.error("storage-check xatolik:", err);
    return NextResponse.json({ error: err.message ?? "Noma'lum xatolik" }, { status: 500 });
  }
}
