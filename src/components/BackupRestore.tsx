import { useMemo, useState } from "react";
import { ChevronLeft, Download, Upload, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Transaction, Category } from "@/types/expense";
import type { SavingGoal } from "@/hooks/useSavingGoals";
import type { Debt } from "@/hooks/useDebts";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type Props = {
  onBack: () => void;
  transactions: Transaction[];
  categories: Category[];
  goals: SavingGoal[];
  debts: Debt[];
  addTransaction: (t: Omit<Transaction, "id">) => Promise<void>;
  addCategory: (c: Omit<Category, "id">) => Promise<void>;
  addGoal: (g: any) => Promise<void>;
  addDebt: (d: any) => Promise<void>;
};

function downloadBlob(name: string, data: Blob) {
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function BackupRestore(props: Props) {
  const [importing, setImporting] = useState(false);

  const payload = useMemo(() => {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      transactions: props.transactions,
      categories: props.categories,
      goals: props.goals,
      debts: props.debts,
    };
  }, [props.transactions, props.categories, props.goals, props.debts]);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    downloadBlob(`siaflow-backup-${new Date().toISOString().slice(0,10)}.json`, blob);
    toast.success("خروجی JSON آماده شد");
  };

  const exportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const txSheet = XLSX.utils.json_to_sheet(props.transactions);
    const catSheet = XLSX.utils.json_to_sheet(props.categories);
    const goalsSheet = XLSX.utils.json_to_sheet(props.goals);
    const debtsSheet = XLSX.utils.json_to_sheet(props.debts);
    XLSX.utils.book_append_sheet(wb, txSheet, "transactions");
    XLSX.utils.book_append_sheet(wb, catSheet, "categories");
    XLSX.utils.book_append_sheet(wb, goalsSheet, "goals");
    XLSX.utils.book_append_sheet(wb, debtsSheet, "debts");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    downloadBlob(`siaflow-backup-${new Date().toISOString().slice(0,10)}.xlsx`, blob);
    toast.success("خروجی Excel آماده شد");
  };

  const importJSON = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const tx: any[] = Array.isArray(data?.transactions) ? data.transactions : [];
      const cats: any[] = Array.isArray(data?.categories) ? data.categories : [];
      const goals: any[] = Array.isArray(data?.goals) ? data.goals : [];
      const debts: any[] = Array.isArray(data?.debts) ? data.debts : [];

      // Import order: categories -> transactions -> goals -> debts
      let cAdded = 0, tAdded = 0, gAdded = 0, dAdded = 0;

      for (const c of cats) {
        if (!c?.name) continue;
        await props.addCategory({
          name: String(c.name),
          type: (c.type === "income" ? "income" : "expense"),
          icon: String(c.icon || "Circle"),
          color: String(c.color || "hsl(0, 0%, 50%)"),
          subcategories: Array.isArray(c.subcategories) ? c.subcategories : [],
          budget: typeof c.budget === "number" ? c.budget : undefined,
        } as any);
        cAdded++;
      }

      for (const t of tx) {
        if (typeof t?.amount !== "number" || !t?.type || !t?.category || !t?.date) continue;
        await props.addTransaction({
          amount: Number(t.amount),
          type: t.type === "income" ? "income" : "expense",
          category: String(t.category),
          subcategory: t.subcategory ? String(t.subcategory) : undefined,
          description: String(t.description || ""),
          date: String(t.date).slice(0,10),
          isRecurring: Boolean(t.isRecurring),
          tags: Array.isArray(t.tags) ? t.tags : [],
        });
        tAdded++;
      }

      for (const g of goals) {
        if (!g?.name || typeof g?.targetAmount !== "number") continue;
        await props.addGoal({
          name: String(g.name),
          targetAmount: Number(g.targetAmount),
          currentAmount: Number(g.currentAmount || 0),
          deadline: g.deadline ? String(g.deadline) : undefined,
          color: String(g.color || ""),
        } as any);
        gAdded++;
      }

      for (const d of debts) {
  if (!d?.name || typeof d?.totalAmount !== "number") continue;
  await props.addDebt({
    name: String(d.name),
    totalAmount: Number(d.totalAmount),
    paidAmount: Number(d.paidAmount || 0),
    creditor: String(d.creditor || ""),
    reason: d.reason ? String(d.reason) : undefined,
    dueDate: d.dueDate ? String(d.dueDate) : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);
  dAdded++;
}

      toast.success(`بازیابی انجام شد: دسته ${cAdded} • تراکنش ${tAdded} • هدف ${gAdded} • بدهی ${dAdded}`);
    } catch (e: any) {
      toast.error(e?.message || "فایل نامعتبر است");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
      <div className="mb-4">
        <Button variant="ghost" onClick={props.onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          بازگشت
        </Button>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">پشتیبان‌گیری و بازیابی</CardTitle>
          <CardDescription>خروجی بگیرید یا فایل بکاپ را وارد کنید.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={exportJSON} variant="secondary" className="gap-2">
              <FileJson className="h-4 w-4" />
              JSON
            </Button>
            <Button onClick={exportXLSX} variant="secondary" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-3">
            <div className="text-sm font-medium flex items-center gap-2">
              <Upload className="h-4 w-4" />
              بازیابی از JSON
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <input
                type="file"
                accept="application/json"
                disabled={importing}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importJSON(f);
                  e.currentTarget.value = "";
                }}
                className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border/60 file:bg-card file:px-3 file:py-2 file:text-xs file:font-medium"
              />
              {importing && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              نکته: اگر دیتابیس خالی باشد سریع‌تر است. در صورت تکرار، ممکن است آیتم‌ها دوباره اضافه شوند.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}