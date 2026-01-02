import { useEffect, useMemo, useState } from "react";
import { Plus, Repeat, Trash2, ChevronLeft, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category, Transaction } from "@/types/expense";
import { toast } from "sonner";

export type RecurringTemplate = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  subcategory?: string;
  description: string;
  cadence: "weekly" | "monthly";
  nextRunDate: string; // YYYY-MM-DD
  tags?: string[];
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addWeeks(ymd: string, n: number) {
  const d = new Date(ymd + "T00:00:00");
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

function addMonths(ymd: string, n: number) {
  const d = new Date(ymd + "T00:00:00");
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  // clamp day
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}

function storageKey(userId?: string) {
  return `siaflow.recurring.v1.${userId || "anon"}`;
}

export function loadRecurringTemplates(userId?: string): RecurringTemplate[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveRecurringTemplates(userId: string | undefined, list: RecurringTemplate[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(list));
}

export async function processRecurringDue(
  userId: string | undefined,
  templates: RecurringTemplate[],
  addTransaction: (t: Omit<Transaction, "id">) => Promise<void>
) {
  if (!userId) return { created: 0, updated: templates };
  const now = todayYMD();
  let created = 0;

  const updated = templates.map((tpl) => ({ ...tpl }));
  for (let i = 0; i < updated.length; i++) {
    const t = updated[i];
    // create at most 12 missed occurrences at once to avoid runaway
    let guard = 0;
    while (t.nextRunDate <= now && guard < 12) {
      await addTransaction({
        amount: t.amount,
        type: t.type,
        category: t.category,
        subcategory: t.subcategory,
        description: t.description,
        date: t.nextRunDate,
        isRecurring: true,
        tags: t.tags || [],
      });
      created += 1;
      t.nextRunDate = t.cadence === "weekly" ? addWeeks(t.nextRunDate, 1) : addMonths(t.nextRunDate, 1);
      guard += 1;
    }
  }
  return { created, updated };
}

type Props = {
  userId?: string;
  categories: Category[];
  onBack: () => void;
  addTransaction: (t: Omit<Transaction, "id">) => Promise<void>;
};

export function RecurringManager({ userId, categories, onBack, addTransaction }: Props) {
  const [templates, setTemplates] = useState<RecurringTemplate[]>(() => loadRecurringTemplates(userId));
  const [mode, setMode] = useState<"list" | "edit">("list");
  const [editing, setEditing] = useState<RecurringTemplate | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // reload on user change
    setTemplates(loadRecurringTemplates(userId));
  }, [userId]);

  const categoryOptions = useMemo(() => categories.map((c) => c.name), [categories]);
  const subcats = useMemo(() => {
    const cat = categories.find((c) => c.name === (editing?.category || ""));
    return cat?.subcategories || [];
  }, [categories, editing?.category]);

  const persist = (next: RecurringTemplate[]) => {
    setTemplates(next);
    saveRecurringTemplates(userId, next);
  };

  const createNew = () => {
    const base: RecurringTemplate = {
      id: uid(),
      type: "expense",
      amount: 0,
      category: categoryOptions[0] || "سایر",
      description: "",
      cadence: "monthly",
      nextRunDate: todayYMD(),
      tags: [],
    };
    setEditing(base);
    setMode("edit");
  };

  const edit = (t: RecurringTemplate) => {
    setEditing({ ...t });
    setMode("edit");
  };

  const remove = (id: string) => {
    const next = templates.filter((t) => t.id !== id);
    persist(next);
    toast.success("حذف شد");
  };

  const save = () => {
    if (!editing) return;
    if (!editing.amount || editing.amount <= 0) {
      toast.error("مبلغ معتبر وارد کنید");
      return;
    }
    if (!editing.category) {
      toast.error("دسته‌بندی را انتخاب کنید");
      return;
    }
    const next = (() => {
      const idx = templates.findIndex((t) => t.id === editing.id);
      if (idx === -1) return [editing, ...templates];
      const copy = templates.slice();
      copy[idx] = editing;
      return copy;
    })();
    persist(next);
    setMode("list");
    setEditing(null);
    toast.success("ذخیره شد");
  };

  const runNow = async () => {
    setBusy(true);
    try {
      const res = await processRecurringDue(userId, templates, addTransaction);
      persist(res.updated);
      if (res.created > 0) toast.success(`${res.created} تراکنش تکرارشونده ایجاد شد`);
      else toast.message("چیزی برای ایجاد نبود");
    } catch (e: any) {
      toast.error(e?.message || "خطا");
    } finally {
      setBusy(false);
    }
  };

  if (mode === "edit" && editing) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => { setMode("list"); setEditing(null); }} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            بازگشت
          </Button>
          <Button onClick={save} className="gap-2">
            <Save className="h-4 w-4" />
            ذخیره
          </Button>
        </div>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">تراکنش تکرارشونده</CardTitle>
            <CardDescription>هر هفته یا هر ماه به صورت خودکار ثبت می‌شود.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>نوع</Label>
                <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">هزینه</SelectItem>
                    <SelectItem value="income">درآمد</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>چرخه</Label>
                <Select value={editing.cadence} onValueChange={(v) => setEditing({ ...editing, cadence: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">هفتگی</SelectItem>
                    <SelectItem value="monthly">ماهانه</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>مبلغ</Label>
              <Input inputMode="numeric" value={String(editing.amount || "")}
                onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value || 0) })} />
            </div>

            <div className="space-y-2">
              <Label>دسته‌بندی</Label>
              <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v, subcategory: undefined })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {subcats.length > 0 && (
              <div className="space-y-2">
                <Label>زیر دسته</Label>
                <Select value={editing.subcategory || ""} onValueChange={(v) => setEditing({ ...editing, subcategory: v || undefined })}>
                  <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                  <SelectContent>
                    {subcats.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>توضیحات</Label>
              <Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>تاریخ اجرای بعدی</Label>
              <Input type="date" value={editing.nextRunDate} onChange={(e) => setEditing({ ...editing, nextRunDate: e.target.value })} />
            </div>

            <Button variant="destructive" className="w-full gap-2" onClick={() => { remove(editing.id); setMode("list"); setEditing(null); }}>
              <Trash2 className="h-4 w-4" />
              حذف
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          بازگشت
        </Button>
        <Button onClick={createNew} className="gap-2">
          <Plus className="h-4 w-4" />
          جدید
        </Button>
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              تراکنش‌های تکرارشونده
            </CardTitle>
            <CardDescription>برای اجاره، قبض، حقوق و…</CardDescription>
          </div>
          <Button variant="secondary" size="sm" onClick={runNow} disabled={busy}>
            اجرای امروز
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.length === 0 ? (
            <div className="text-sm text-muted-foreground">هنوز چیزی اضافه نکرده‌اید.</div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => edit(t)}
                  className="w-full rounded-xl border border-border/60 bg-card px-3 py-3 text-left active:scale-[0.99] transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{t.description || t.category}</div>
                    <div className="text-sm font-semibold">{t.amount.toLocaleString()}</div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground flex items-center justify-between">
                    <span>{t.cadence === "weekly" ? "هفتگی" : "ماهانه"} • {t.type === "expense" ? "هزینه" : "درآمد"}</span>
                    <span>بعدی: {t.nextRunDate}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}