import { Eye, EyeOff, LockKeyhole, ShieldCheck, WalletCards } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { login } from "@/lib/auth";

interface LoginLocationState { from?: string }

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const currentUser = queryClient.getQueryData(["auth-me"]);
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: ({ user }) => {
      queryClient.setQueryData(["auth-me"], user);
      const target = (location.state as LoginLocationState | null)?.from ?? "/";
      navigate(target, { replace: true });
    },
    onError: (caught) => setError(caught instanceof ApiError && caught.status === 401 ? "E-mail ou senha incorretos." : "Não foi possível entrar agora. Tente novamente."),
  });

  if (currentUser) return <Navigate to="/" replace />;
  const submit = (event: FormEvent) => { event.preventDefault(); setError(""); mutation.mutate({ email, password }); };

  return <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white" data-testid="login-page"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(20,184,166,0.28),transparent_36rem),radial-gradient(circle_at_85%_80%,rgba(14,116,144,0.2),transparent_34rem)]" /><div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-5 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10"><section className="hidden max-w-xl lg:block" data-testid="login-intro"><div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-teal-500 text-slate-950"><WalletCards className="size-6" /></span><span className="font-heading text-2xl font-semibold" data-testid="login-brand">cash</span></div><p className="mt-12 font-mono text-[10px] uppercase tracking-[0.24em] text-teal-300" data-testid="login-intro-kicker">Área financeira privada</p><h1 className="mt-4 font-heading text-6xl font-semibold leading-[1.02] tracking-tight" data-testid="login-intro-title">Seu dinheiro.<br />Só seu.</h1><p className="mt-6 max-w-md text-base leading-7 text-slate-300" data-testid="login-intro-description">Acesse sua visão mensal, faturas, contas e metas em um ambiente protegido por sessão.</p><div className="mt-10 flex items-center gap-3 text-sm text-slate-300" data-testid="login-security-note"><ShieldCheck className="size-5 text-teal-300" /> Senha protegida e sessão privada</div></section><section className="mx-auto w-full max-w-md" data-testid="login-form-section"><div className="mb-8 flex items-center gap-3 lg:hidden"><span className="flex size-11 items-center justify-center rounded-2xl bg-teal-500 text-slate-950"><WalletCards className="size-5" /></span><span className="font-heading text-xl font-semibold" data-testid="login-mobile-brand">cash</span></div><div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-xl sm:p-9" data-testid="login-card"><span className="flex size-11 items-center justify-center rounded-xl bg-teal-400/15 text-teal-300"><LockKeyhole className="size-5" /></span><h2 className="mt-6 font-heading text-3xl font-semibold tracking-tight" data-testid="login-title">Acesso do proprietário</h2><p className="mt-2 text-sm leading-6 text-slate-300" data-testid="login-description">Entre com seu e-mail e senha para continuar.</p><form onSubmit={submit} className="mt-7 space-y-5" data-testid="login-form"><label className="block text-xs font-medium text-slate-300" data-testid="login-email-label">E-mail<Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" required className="mt-2 h-12 border-white/15 bg-slate-950/50 text-white placeholder:text-slate-500" data-testid="login-email-input" /></label><label className="block text-xs font-medium text-slate-300" data-testid="login-password-label">Senha<div className="relative mt-2"><Input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" required minLength={8} className="h-12 border-white/15 bg-slate-950/50 pr-12 text-white placeholder:text-slate-500" data-testid="login-password-input" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:text-white" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} data-testid="login-password-visibility-button">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></label>{error && <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200" role="alert" data-testid="login-error-message">{error}</p>}<Button type="submit" disabled={mutation.isPending} className="h-12 w-full bg-teal-500 text-slate-950 hover:bg-teal-400" data-testid="login-submit-button">{mutation.isPending ? "Entrando..." : "Entrar no cash"}</Button></form><p className="mt-5 text-center text-xs text-slate-400" data-testid="login-account-note">Conta única · sem cadastro público</p></div></section></div></main>;
}