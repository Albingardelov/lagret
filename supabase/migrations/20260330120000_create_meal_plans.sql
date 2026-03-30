-- Create meal_plans table
create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  date date not null,
  recipe_id int references recipes(id) on delete set null,
  title text not null,
  created_at timestamptz not null default now(),
  unique(household_id, date)
);

-- RLS
alter table meal_plans enable row level security;

create policy "Users can view own household meal plans"
  on meal_plans for select
  using (is_household_member(household_id));

create policy "Users can insert own household meal plans"
  on meal_plans for insert
  with check (is_household_member(household_id));

create policy "Users can update own household meal plans"
  on meal_plans for update
  using (is_household_member(household_id));

create policy "Users can delete own household meal plans"
  on meal_plans for delete
  using (is_household_member(household_id));

-- Enable realtime
alter publication supabase_realtime add table meal_plans;
