-- Execute este arquivo no SQL Editor do projeto Supabase do Cash.
-- Cada evento pertence a um usuário e as políticas RLS impedem acesso cruzado.
create table if not exists public.cash_sync_events (
  sequence bigint generated always as identity primary key,
  event_id text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity text not null check (entity in (
    'usuarios', 'categorias', 'movimentacoes', 'contas_recorrentes',
    'cartoes', 'contas_pagamentos', 'metas'
  )),
  record_id text not null,
  operation text not null check (operation in ('upsert', 'delete')),
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cash_sync_events_user_sequence_idx
  on public.cash_sync_events (user_id, sequence);

alter table public.cash_sync_events enable row level security;

revoke all on public.cash_sync_events from anon, authenticated;
grant select, insert on public.cash_sync_events to authenticated;
grant usage, select on sequence public.cash_sync_events_sequence_seq to authenticated;

drop policy if exists "Read own Cash sync events" on public.cash_sync_events;
create policy "Read own Cash sync events"
  on public.cash_sync_events for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Append own Cash sync events" on public.cash_sync_events;
create policy "Append own Cash sync events"
  on public.cash_sync_events for insert to authenticated
  with check ((select auth.uid()) = user_id);
