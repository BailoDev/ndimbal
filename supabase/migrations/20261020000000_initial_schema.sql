create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'citizen' check (role in ('citizen', 'officer', 'admin')),
  full_name text,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('ND-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  title text not null check (char_length(trim(title)) between 5 and 120),
  description text not null check (char_length(trim(description)) between 10 and 1000),
  category text not null check (category in ('roads', 'water', 'electricity', 'waste', 'healthcare', 'education', 'agriculture', 'public_safety', 'other')),
  location text not null check (char_length(trim(location)) > 0),
  street_name text,
  latitude double precision,
  longitude double precision,
  status text not null default 'submitted' check (status in ('submitted', 'review', 'progress', 'resolved', 'rejected')),
  photo_url text,
  officer_notes text,
  assigned_to text,
  assigned_institution text,
  assignment_status text not null default 'pending' check (assignment_status in ('pending', 'auto_assigned', 'manually_assigned', 'needs_manual_assignment')),
  is_urgent boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);

create index reports_created_at_idx on public.reports (created_at desc);
create index reports_reference_idx on public.reports (reference);
create index reports_category_status_idx on public.reports (category, status);

create table public.routing_rules (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('roads', 'water', 'electricity', 'waste', 'healthcare', 'education', 'agriculture', 'public_safety', 'other', '*')),
  location_pattern text not null,
  institution text not null,
  priority integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('submission', 'assignment', 'status_change')),
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

create table public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  storage_path text not null unique,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now()
);

create index voice_notes_report_idx on public.voice_notes (report_id);

insert into public.routing_rules (category, location_pattern, institution, priority) values
  ('water', '*', 'NAWEC', 10),
  ('electricity', '*', 'NAWEC', 10),
  ('roads', 'kanifing', 'KMC', 20),
  ('roads', 'serekunda', 'KMC', 20),
  ('roads', 'bakau', 'KMC', 20),
  ('roads', 'bundung', 'KMC', 20),
  ('roads', 'lamin', 'KMC', 20),
  ('roads', '*', 'GRA', 5),
  ('waste', 'kanifing', 'KMC', 20),
  ('waste', 'serekunda', 'KMC', 20),
  ('waste', 'bakau', 'KMC', 20),
  ('waste', 'bundung', 'KMC', 20),
  ('waste', 'lamin', 'KMC', 20),
  ('waste', '*', 'BANJUL CITY COUNCIL', 5),
  ('healthcare', '*', 'EFSTH', 5),
  ('education', '*', 'MoBSE', 5),
  ('agriculture', '*', 'Department of Agriculture', 5),
  ('public_safety', '*', 'GPF', 5);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, 'citizen', nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('officer', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.owns_report(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reports
    where id = p_report_id and created_by = auth.uid()
  );
$$;

create or replace function public.route_new_report()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  matched_institution text;
begin
  new.created_by := auth.uid();
  new.status := 'submitted';
  new.officer_notes := null;
  new.assigned_to := null;

  select rr.institution into matched_institution
  from public.routing_rules rr
  where rr.is_active
    and rr.category in (new.category, '*')
    and (rr.location_pattern = '*' or lower(new.location) like '%' || lower(rr.location_pattern) || '%')
  order by rr.priority desc
  limit 1;

  new.assigned_institution := matched_institution;
  new.assignment_status := case
    when matched_institution is null then 'needs_manual_assignment'
    else 'auto_assigned'
  end;
  new.updated_at := now();
  return new;
end;
$$;

create trigger reports_route_before_insert
  before insert on public.reports
  for each row execute function public.route_new_report();

create or replace function public.notify_report_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into public.notifications (report_id, user_id, type, title, body)
    values (new.id, new.created_by, 'submission', 'Report received', 'Your report has been submitted.');
  elsif old.status is distinct from new.status then
    insert into public.notifications (report_id, user_id, type, title, body)
    values (new.id, new.created_by, 'status_change', 'Report status updated', 'Your report status is now ' || replace(new.status, '_', ' ') || '.');
  elsif old.assigned_institution is distinct from new.assigned_institution or old.assigned_to is distinct from new.assigned_to then
    insert into public.notifications (report_id, user_id, type, title, body)
    values (new.id, new.created_by, 'assignment', 'Report assignment updated', 'Your report assignment has been updated.');
  end if;
  return new;
end;
$$;

create trigger reports_notify_after_insert
  after insert on public.reports
  for each row execute function public.notify_report_changes();

create trigger reports_notify_after_update
  after update of status, assigned_institution, assigned_to on public.reports
  for each row execute function public.notify_report_changes();

create or replace function public.submit_report(
  p_title text,
  p_description text,
  p_category text,
  p_location text,
  p_street_name text,
  p_latitude double precision,
  p_longitude double precision,
  p_photo_url text,
  p_is_urgent boolean
)
returns table (id uuid, reference text, assigned_institution text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  insert into public.reports (
    title, description, category, location, street_name, latitude, longitude, photo_url, is_urgent
  ) values (
    p_title, p_description, p_category, p_location, nullif(trim(p_street_name), ''),
    p_latitude, p_longitude, nullif(trim(p_photo_url), ''), coalesce(p_is_urgent, false)
  )
  returning reports.id, reports.reference, reports.assigned_institution;
end;
$$;

create or replace function public.list_all_profiles()
returns table (id uuid, role text, full_name text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;
  return query select p.id, p.role, p.full_name, p.created_at from public.profiles p order by p.created_at desc;
end;
$$;

create or replace function public.set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;
  if p_role not in ('citizen', 'officer', 'admin') then
    raise exception 'Invalid user role';
  end if;
  if p_user_id = auth.uid() and p_role <> 'admin' then
    raise exception 'You cannot remove your own administrator role';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

create or replace function public.set_report_urgent(p_report_id uuid, p_is_urgent boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Staff access required';
  end if;
  update public.reports set is_urgent = p_is_urgent, updated_at = now() where id = p_report_id;
  if not found then
    raise exception 'Report not found';
  end if;
end;
$$;

create or replace function public.update_report(
  p_report_id uuid,
  p_status text,
  p_assigned_to text,
  p_officer_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Staff access required';
  end if;
  update public.reports
  set status = p_status,
      assigned_to = nullif(trim(p_assigned_to), ''),
      officer_notes = nullif(trim(p_officer_notes), ''),
      assignment_status = case
        when nullif(trim(p_assigned_to), '') is null then 'needs_manual_assignment'
        else 'manually_assigned'
      end,
      updated_at = now()
  where id = p_report_id;
  if not found then
    raise exception 'Report not found';
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.routing_rules enable row level security;
alter table public.notifications enable row level security;
alter table public.voice_notes enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "Staff can read all reports"
  on public.reports for select to authenticated
  using (public.is_staff());

create policy "Public can read routing rules"
  on public.routing_rules for select to anon, authenticated
  using (true);

create policy "Users can read their notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy "Users can mark their notifications read"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Staff can read voice note metadata"
  on public.voice_notes for select to authenticated
  using (public.is_staff());

create policy "Report owners can attach voice notes"
  on public.voice_notes for insert to authenticated
  with check (public.owns_report(report_id));

create view public.public_reports with (security_barrier = true) as
  select id, reference, title, description, category, location, status,
         photo_url, assigned_institution, is_urgent, created_at, updated_at
  from public.reports;

revoke all on public.profiles, public.reports, public.routing_rules, public.notifications, public.voice_notes from anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.reports to authenticated;
grant select on public.public_reports to anon, authenticated;
grant select on public.routing_rules to anon, authenticated;
grant select, update (is_read) on public.notifications to authenticated;
grant select on public.voice_notes to authenticated;
grant insert on public.voice_notes to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.owns_report(uuid) from public, anon;
revoke all on function public.route_new_report() from public, anon, authenticated;
revoke all on function public.notify_report_changes() from public, anon, authenticated;
revoke all on function public.submit_report(text, text, text, text, text, double precision, double precision, text, boolean) from public;
revoke all on function public.list_all_profiles() from public, anon;
revoke all on function public.set_user_role(uuid, text) from public, anon;
revoke all on function public.set_report_urgent(uuid, boolean) from public, anon;
revoke all on function public.update_report(uuid, text, text, text) from public, anon;

grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.owns_report(uuid) to authenticated;
grant execute on function public.submit_report(text, text, text, text, text, double precision, double precision, text, boolean) to anon, authenticated;
grant execute on function public.list_all_profiles() to authenticated;
grant execute on function public.set_user_role(uuid, text) to authenticated;
grant execute on function public.set_report_urgent(uuid, boolean) to authenticated;
grant execute on function public.update_report(uuid, text, text, text) to authenticated;

insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', false)
on conflict (id) do nothing;

create policy "Users can upload voice notes to their folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'voice-notes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Staff can read voice note files"
  on storage.objects for select to authenticated
  using (bucket_id = 'voice-notes' and public.is_staff());