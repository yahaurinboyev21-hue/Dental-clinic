"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Wallet, TrendingUp, AlertTriangle, Users, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatUZS } from "@/lib/utils";

interface Stats {
  todayRevenue: number;
  monthRevenue: number;
  outstandingDebt: number;
  patientCount: number;
  completedCount: number;
}

interface FinanceDashboardProps {
  todayISO: string;
}

export function FinanceDashboard({ todayISO }: FinanceDashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      const monthStart = todayISO.slice(0, 7) + "-01";

      const [todayRes, monthRes, debtRes, patientsRes, completedRes] = await Promise.all([
        supabase.from("appointments").select("paid_amount").eq("appointment_date", todayISO),
        supabase
          .from("appointments")
          .select("paid_amount")
          .gte("appointment_date", monthStart)
          .lte("appointment_date", todayISO),
        supabase
          .from("appointments")
          .select("amount, paid_amount")
          .neq("payment_status", "paid")
          .neq("status", "cancelled"),
        supabase
          .from("appointments")
          .select("phone")
          .gte("appointment_date", monthStart)
          .lte("appointment_date", todayISO),
        supabase
          .from("appointments")
          .select("id")
          .eq("status", "completed")
          .gte("appointment_date", monthStart)
          .lte("appointment_date", todayISO),
      ]);

      const todayRevenue = (todayRes.data ?? []).reduce(
        (sum: number, r: any) => sum + (r.paid_amount ?? 0),
        0
      );
      const monthRevenue = (monthRes.data ?? []).reduce(
        (sum: number, r: any) => sum + (r.paid_amount ?? 0),
        0
      );
      const outstandingDebt = (debtRes.data ?? []).reduce(
        (sum: number, r: any) => sum + Math.max((r.amount ?? 0) - (r.paid_amount ?? 0), 0),
        0
      );
      const uniquePhones = new Set((patientsRes.data ?? []).map((r: any) => r.phone));
      const completedCount = (completedRes.data ?? []).length;

      setStats({
        todayRevenue,
        monthRevenue,
        outstandingDebt,
        patientCount: uniquePhones.size,
        completedCount,
      });
      setLoading(false);
    }
    loadStats();
  }, [todayISO]);

  const cards = [
    { title: "Bugungi tushum", value: stats ? formatUZS(stats.todayRevenue) : "...", icon: Wallet },
    { title: "Oylik umumiy daromad", value: stats ? formatUZS(stats.monthRevenue) : "...", icon: TrendingUp },
    {
      title: "Kutilayotgan qarzdorliklar",
      value: stats ? formatUZS(stats.outstandingDebt) : "...",
      icon: AlertTriangle,
    },
    { title: "Bemorlar soni (oylik)", value: stats ? String(stats.patientCount) : "...", icon: Users },
    {
      title: "Yakunlangan muolajalar",
      value: stats ? String(stats.completedCount) : "...",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle>{c.title}</CardTitle>
            <c.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${loading ? "animate-pulse text-muted-foreground" : ""}`}>
              {c.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
