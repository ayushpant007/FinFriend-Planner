create extension if not exists pgcrypto;

create table if not exists public.investors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  dob date,
  mobile text,
  dependents integer,
  retirement_age integer,
  arn text,
  converted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.investors
  add column if not exists converted boolean not null default false;

create table if not exists public.investor_reports (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.investors(id) on delete cascade,
  report_id text not null unique,
  report_type text not null default 'financial',
  planner_data jsonb not null default '{}'::jsonb,
  detailed_report jsonb,
  sip_report jsonb,
  generated_at timestamptz not null default now()
);

create index if not exists investor_reports_investor_id_idx
  on public.investor_reports(investor_id);

create index if not exists investor_reports_generated_at_idx
  on public.investor_reports(generated_at desc);

alter table public.investors enable row level security;
alter table public.investor_reports enable row level security;

-- No public policies are created. The application reaches these tables through
-- the server-side managed Supabase connection, while browser access remains
-- blocked by RLS.