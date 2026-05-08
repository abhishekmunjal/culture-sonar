
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, company)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'company', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Diagnoses
create type public.diagnosis_status as enum ('draft','analyzing','ready','failed');

create table public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  status public.diagnosis_status not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.diagnoses enable row level security;
create index on public.diagnoses (user_id, created_at desc);

create policy "Owner can view diagnoses" on public.diagnoses
  for select using (auth.uid() = user_id);
create policy "Owner can insert diagnoses" on public.diagnoses
  for insert with check (auth.uid() = user_id);
create policy "Owner can update diagnoses" on public.diagnoses
  for update using (auth.uid() = user_id);
create policy "Owner can delete diagnoses" on public.diagnoses
  for delete using (auth.uid() = user_id);

-- Employees (HRMS)
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  diagnosis_id uuid not null references public.diagnoses(id) on delete cascade,
  employee_code text,
  full_name text,
  gender text,
  department text,
  job_level text,
  manager text,
  location text,
  date_of_joining date,
  tenure_years numeric,
  annual_ctc numeric,
  last_perf_rating numeric,
  employment_status text,
  created_at timestamptz not null default now()
);
alter table public.employees enable row level security;
create index on public.employees (diagnosis_id);

create policy "Owner can view employees" on public.employees
  for select using (exists (select 1 from public.diagnoses d where d.id = employees.diagnosis_id and d.user_id = auth.uid()));
create policy "Owner can insert employees" on public.employees
  for insert with check (exists (select 1 from public.diagnoses d where d.id = employees.diagnosis_id and d.user_id = auth.uid()));
create policy "Owner can delete employees" on public.employees
  for delete using (exists (select 1 from public.diagnoses d where d.id = employees.diagnosis_id and d.user_id = auth.uid()));

-- Engagement
create table public.engagement_responses (
  id uuid primary key default gen_random_uuid(),
  diagnosis_id uuid not null references public.diagnoses(id) on delete cascade,
  employee_code text,
  department text,
  manager text,
  engagement_score numeric,
  manager_effectiveness numeric,
  career_growth numeric,
  work_life_balance numeric,
  recognition numeric,
  belonging numeric,
  enps numeric,
  would_recommend text,
  submitted_on date,
  created_at timestamptz not null default now()
);
alter table public.engagement_responses enable row level security;
create index on public.engagement_responses (diagnosis_id);

create policy "Owner can view engagement" on public.engagement_responses
  for select using (exists (select 1 from public.diagnoses d where d.id = engagement_responses.diagnosis_id and d.user_id = auth.uid()));
create policy "Owner can insert engagement" on public.engagement_responses
  for insert with check (exists (select 1 from public.diagnoses d where d.id = engagement_responses.diagnosis_id and d.user_id = auth.uid()));
create policy "Owner can delete engagement" on public.engagement_responses
  for delete using (exists (select 1 from public.diagnoses d where d.id = engagement_responses.diagnosis_id and d.user_id = auth.uid()));

-- 1:1s
create table public.one_on_ones (
  id uuid primary key default gen_random_uuid(),
  diagnosis_id uuid not null references public.diagnoses(id) on delete cascade,
  manager_name text,
  report_name text,
  report_code text,
  last_one_on_one date,
  feeling_score numeric,
  attrition_risk text,
  looking_elsewhere text,
  top_concern text,
  action_committed text,
  created_at timestamptz not null default now()
);
alter table public.one_on_ones enable row level security;
create index on public.one_on_ones (diagnosis_id);

create policy "Owner can view 1on1s" on public.one_on_ones
  for select using (exists (select 1 from public.diagnoses d where d.id = one_on_ones.diagnosis_id and d.user_id = auth.uid()));
create policy "Owner can insert 1on1s" on public.one_on_ones
  for insert with check (exists (select 1 from public.diagnoses d where d.id = one_on_ones.diagnosis_id and d.user_id = auth.uid()));
create policy "Owner can delete 1on1s" on public.one_on_ones
  for delete using (exists (select 1 from public.diagnoses d where d.id = one_on_ones.diagnosis_id and d.user_id = auth.uid()));

-- Results (AI output)
create table public.diagnosis_results (
  diagnosis_id uuid primary key references public.diagnoses(id) on delete cascade,
  verdict text,
  health_score numeric,
  kpis jsonb,
  cohorts jsonb,
  risks jsonb,
  generated_at timestamptz not null default now()
);
alter table public.diagnosis_results enable row level security;

create policy "Owner can view results" on public.diagnosis_results
  for select using (exists (select 1 from public.diagnoses d where d.id = diagnosis_results.diagnosis_id and d.user_id = auth.uid()));
create policy "Owner can write results" on public.diagnosis_results
  for insert with check (exists (select 1 from public.diagnoses d where d.id = diagnosis_results.diagnosis_id and d.user_id = auth.uid()));
create policy "Owner can update results" on public.diagnosis_results
  for update using (exists (select 1 from public.diagnoses d where d.id = diagnosis_results.diagnosis_id and d.user_id = auth.uid()));
