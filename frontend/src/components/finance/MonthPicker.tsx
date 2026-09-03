import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";

interface MonthPickerProps {
  reference: string;
  onChange: (reference: string) => void;
}

function shiftMonth(reference: string, amount: number) {
  const [year, month] = reference.split("-").map(Number);
  const next = new Date(year, month - 1 + amount, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function labelFor(reference: string) {
  if (!reference) return "Selecionar mês";
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${reference}-01T12:00:00`));
}

export default function MonthPicker({ reference, onChange }: MonthPickerProps) {
  return (
    <div className="flex items-center gap-1 rounded-2xl border border-border/70 bg-card/75 p-1 shadow-sm" data-testid="month-picker-control">
      <Button type="button" variant="ghost" size="icon-sm" onClick={() => reference && onChange(shiftMonth(reference, -1))} aria-label="Mês anterior" data-testid="month-picker-previous-button">
        <ChevronLeft className="size-4" />
      </Button>
      <label className="flex min-w-[142px] cursor-pointer items-center justify-center gap-2 px-1 text-sm font-medium capitalize" data-testid="month-picker-label">
        <CalendarDays className="size-4 text-primary" />
        <span data-testid="month-picker-value">{labelFor(reference)}</span>
        <input className="sr-only" type="month" value={reference} onChange={(event) => onChange(event.target.value)} aria-label="Selecionar mês" data-testid="month-picker-input" />
      </label>
      <Button type="button" variant="ghost" size="icon-sm" onClick={() => reference && onChange(shiftMonth(reference, 1))} aria-label="Próximo mês" data-testid="month-picker-next-button">
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}