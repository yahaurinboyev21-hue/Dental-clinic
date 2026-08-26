# Dental CRM — O'rnatish qo'llanmasi

## 1. O'rnatish
```
npm install
cp .env.local.example .env.local
```
`.env.local` faylini o'zingizning Supabase va Telegram ma'lumotlaringiz bilan to'ldiring.

## 2. Supabase
1. supabase.com'da yangi loyiha yarating.
2. SQL Editor'ga o'ting va `supabase/schema.sql` faylidagi kodni to'liq bajaring.
3. Project Settings > API bo'limidan URL, anon key va service_role key'ni oling.

## 3. Xodim hisobini yaratish (LOGIN)
Ilova endi himoyalangan — kirish uchun Supabase orqali xodim hisobi kerak. Ommaviy ro'yxatdan o'tish
sahifasi ataylab yo'q (faqat administrator xodimlarga hisob ochadi):

1. Supabase Dashboard > Authentication > Users > **Add user**.
2. Email va parol kiriting (masalan: admin@klinika.uz).
3. Shu email/parol bilan `/login` sahifasidan kiring.

Xohlagancha xodim hisobi qo'shishingiz mumkin — barchasi bir xil ma'lumotlarni ko'radi (RLS orqali
faqat "authenticated" foydalanuvchilarga ruxsat berilgan).

## 4. Telegram bot
1. @BotFather orqali yangi bot yarating, TELEGRAM_BOT_TOKEN'ni oling.
2. Botga /start yozing, so'ng @userinfobot yoki botning update'lari orqali o'z chat_id'ingizni (TELEGRAM_ADMIN_CHAT_ID) aniqlang.

## 5. Lokal ishga tushirish
```
npm run dev
```

## 6. Vercel'ga deploy qilish
1. Loyihani GitHub'ga push qiling va Vercel'da import qiling.
2. Barcha .env o'zgaruvchilarini Vercel Environment Variables bo'limiga qo'shing (shu jumladan CRON_SECRET).
3. `vercel.json`dagi cron sozlamasi avtomatik ishga tushadi: har kuni 03:00 UTC = 08:00 Toshkent vaqtida.

## Sozlanadigan narsalar
- **Bir vaqtga nechta bemor sig'adi (kreslo/xona soni):** `lib/supabase/client.ts` faylidagi
  `MAX_CONCURRENT_APPOINTMENTS` o'zgaruvchisi (standart: 2). Shu sondan oshganda modal oynada
  amber rangli ogohlantirish chiqadi.
- **Dizayn rangi:** `app/globals.css` dagi `--primary` CSS o'zgaruvchisi (hozir teal/tibbiy rang).
- **Yorug'/qorong'i rejim:** yuqori panelda oy/quyosh tugmasi orqali almashtiriladi (next-themes).

## Yangi imkoniyatlar (v1.1)
- 🔒 Login/parol himoyasi (Supabase Auth + middleware, barcha sahifalar himoyalangan)
- ⚠️ Xona/kreslo sig'imi ogohlantirishi (bir vaqtga ortiqcha bemor yozilganda)
- 🕓 Bemor tashrif tarixi (telefon raqami bo'yicha oldingi barcha qabullar)
- 🖼️ Rentgen/foto uchun ichki preview (havola bosmasdan ko'rish)
- 📅 Kun / Hafta / Oy ko'rinishlari
- 📊 Excel export va Chop etish (Print)
- 🎨 Tibbiy teal palitra, gradient fon, dark mode

## Deploy

Vercel: https://dental-clinic-pi-bice.vercel.app
