import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Transaction } from "@/types/expense";
import { TrendingUp, TrendingDown, Lightbulb, Target } from "lucide-react";

function yyyymm(d: string) {
  return d.slice(0, 7);
}

function sumBy(list: Transaction[], fn: (t: Transaction) => boolean) {
  return list.filter(fn).reduce((a, b) => a + (b.amount || 0), 0);
}

export function SmartInsights({ transactions }: { transactions: Transaction[] }) {
  const insights = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1));
    const months = Array.from(new Set(sorted.map((t) => yyyymm(t.date)))).slice(0, 3);

    const m0 = months[0];
    const m1 = months[1];

    const in0 = sumBy(sorted, (t) => yyyymm(t.date) === m0 && t.type === "income");
    const ex0 = sumBy(sorted, (t) => yyyymm(t.date) === m0 && t.type === "expense");

    const in1 = m1 ? sumBy(sorted, (t) => yyyymm(t.date) === m1 && t.type === "income") : 0;
    const ex1 = m1 ? sumBy(sorted, (t) => yyyymm(t.date) === m1 && t.type === "expense") : 0;

    const deltaEx = m1 ? ex0 - ex1 : 0;
    const deltaPct = m1 && ex1 > 0 ? (deltaEx / ex1) * 100 : 0;

    // top category this month
    const catMap = new Map<string, number>();
    for (const t of sorted) {
      if (yyyymm(t.date) !== m0) continue;
      if (t.type !== "expense") continue;
      catMap.set(t.category, (catMap.get(t.category) || 0) + (t.amount || 0));
    }
    const topCat = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])[0];

    // simple budget suggestion: top category budget = average of last 2 months * 0.9
    let suggestedBudget: { category: string; amount: number } | null = null;
    if (topCat && m1) {
      const cat = topCat[0];
      const exCat0 = sumBy(sorted, (t) => yyyymm(t.date) === m0 && t.type === "expense" && t.category === cat);
      const exCat1 = sumBy(sorted, (t) => yyyymm(t.date) === m1 && t.type === "expense" && t.category === cat);
      const avg = (exCat0 + exCat1) / 2;
      suggestedBudget = { category: cat, amount: Math.max(0, Math.round(avg * 0.9)) };
    }

    return {
      month: m0,
      in0,
      ex0,
      deltaEx,
      deltaPct,
      topCat: topCat ? { name: topCat[0], amount: topCat[1] } : null,
      suggestedBudget,
    };
  }, [transactions]);

  return (
    <div className="space-y-3">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            بینش‌های هوشمند
          </CardTitle>
          <CardDescription>خلاصه‌ی قابل‌عمل از رفتار مالی شما.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 bg-card p-3">
              <div className="text-xs text-muted-foreground">درآمد این ماه</div>
              <div className="mt-1 text-base font-semibold">{insights.in0.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-3">
              <div className="text-xs text-muted-foreground">هزینه این ماه</div>
              <div className="mt-1 text-base font-semibold">{insights.ex0.toLocaleString()}</div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">تغییر هزینه نسبت به ماه قبل</div>
              {insights.deltaEx >= 0 ? (
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="h-4 w-4" /> {Math.abs(insights.deltaPct).toFixed(0)}%
                </div>
              ) : (
                <div className="flex items-center gap-1 text-sm">
                  <TrendingDown className="h-4 w-4" /> {Math.abs(insights.deltaPct).toFixed(0)}%
                </div>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {insights.deltaEx >= 0
                ? "هزینه‌ها بیشتر شده؛ شاید نیاز به سقف‌بندی دسته‌ها داشته باشید."
                : "خوب پیش رفتید؛ هزینه‌ها کمتر شده."}
            </div>
          </div>

          {insights.topCat && (
            <div className="rounded-xl border border-border/60 bg-card p-3">
              <div className="text-sm font-medium">بیشترین هزینه این ماه</div>
              <div className="mt-1 flex items-center justify-between">
                <div className="text-sm">{insights.topCat.name}</div>
                <div className="text-sm font-semibold">{insights.topCat.amount.toLocaleString()}</div>
              </div>
            </div>
          )}

          {insights.suggestedBudget && (
            <div className="rounded-xl border border-border/60 bg-card p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4" />
                پیشنهاد سقف بودجه
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                برای دسته «{insights.suggestedBudget.category}» سقف ماهانه حدود{" "}
                <span className="font-semibold">{insights.suggestedBudget.amount.toLocaleString()}</span> تعیین کنید.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}