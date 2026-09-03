import { ArrowRight, CheckCircle2, ShieldCheck, WalletCards } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const slides = [
  { icon: WalletCards, title: "Bem-vindo ao cash", text: "Seu controle financeiro pessoal: saldo, contas, cartões e metas em um só lugar." },
  { icon: ShieldCheck, title: "Enxergue o saldo seguro", text: "O Saldo Livre Real desconta o que ainda vai vencer e mostra quanto é seguro gastar." },
  { icon: CheckCircle2, title: "Vamos começar", text: "Escolha o mês, lance uma movimentação e acompanhe o impacto dela no seu planejamento." },
];

interface OnboardingProps { onFinish: () => void }

export default function Onboarding({ onFinish }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const slide = slides[step];
  const Icon = slide.icon;
  const isLast = step === slides.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md" role="dialog" aria-modal="true" data-testid="onboarding-overlay">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-card p-7 shadow-2xl sm:p-10" data-testid="onboarding-card">
        <button type="button" onClick={onFinish} className="absolute right-6 top-5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground" data-testid="onboarding-skip-button">Pular</button>
        <div className="mx-auto flex max-w-sm flex-col items-center text-center">
          <div className="flex size-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-[0_20px_40px_-18px_var(--primary)]" data-testid="onboarding-icon"><Icon className="size-9" /></div>
          <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-primary" data-testid="onboarding-step">Passo {step + 1} de {slides.length}</p>
          <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight" data-testid="onboarding-title">{slide.title}</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground" data-testid="onboarding-description">{slide.text}</p>
          <div className="mt-8 flex gap-2" data-testid="onboarding-progress">{slides.map((item, index) => <span key={item.title} className={`h-1.5 rounded-full transition-[width,background-color] ${index === step ? "w-9 bg-primary" : "w-1.5 bg-border"}`} data-testid={`onboarding-progress-${index}`} />)}</div>
          <Button type="button" className="mt-8 w-full gap-2" onClick={() => isLast ? onFinish() : setStep((current) => current + 1)} data-testid="onboarding-continue-button">{isLast ? "Começar" : "Continuar"}<ArrowRight className="size-4" /></Button>
        </div>
      </div>
    </div>
  );
}