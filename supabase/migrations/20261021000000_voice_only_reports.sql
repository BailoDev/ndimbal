alter table public.reports
  add column if not exists voice_upload_token uuid;

create or replace function public.submit_report_with_voice(
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
returns table (
  id uuid,
  reference text,
  assigned_institution text,
  voice_upload_token uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  submitted_report record;
  upload_token uuid := gen_random_uuid();
begin
  select submitted.* into submitted_report
  from public.submit_report(
    p_title,
    p_description,
    p_category,
    p_location,
    p_street_name,
    p_latitude,
    p_longitude,
    p_photo_url,
    p_is_urgent
  ) as submitted;

  update public.reports
  set voice_upload_token = upload_token
  where reports.id = submitted_report.id;

  return query
  select submitted_report.id,
         submitted_report.reference,
         submitted_report.assigned_institution,
         upload_token;
end;
$$;

create or replace function public.can_upload_voice_note(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reports r
    where p_object_name in (
      r.id::text || '/' || r.voice_upload_token::text || '.webm',
      r.id::text || '/' || r.voice_upload_token::text || '.m4a'
    )
      and r.voice_upload_token is not null
  ) or exists (
    select 1
    from public.voice_notes vn
    where vn.storage_path = p_object_name
  );
$$;

create or replace function public.attach_voice_note(
  p_report_id uuid,
  p_upload_token uuid,
  p_duration_seconds integer,
  p_extension text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  voice_path text;
begin
  if p_extension not in ('webm', 'm4a') then
    raise exception 'Unsupported voice-note format';
  end if;

  voice_path := p_report_id::text || '/' || p_upload_token::text || '.' || p_extension;

  if exists (
    select 1 from public.voice_notes vn
    where vn.report_id = p_report_id and vn.storage_path = voice_path
  ) then
    return;
  end if;

  if not exists (
    select 1 from public.reports r
    where r.id = p_report_id and r.voice_upload_token = p_upload_token
  ) then
    raise exception 'Invalid voice upload token';
  end if;

  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'voice-notes' and o.name = voice_path
  ) then
    raise exception 'Voice file has not been uploaded';
  end if;

  insert into public.voice_notes (report_id, storage_path, duration_seconds)
  values (p_report_id, voice_path, greatest(p_duration_seconds, 0));

  update public.reports
  set voice_upload_token = null
  where id = p_report_id and voice_upload_token = p_upload_token;
end;
$$;

revoke all on function public.submit_report_with_voice(text, text, text, text, text, double precision, double precision, text, boolean) from public;
revoke all on function public.can_upload_voice_note(text) from public;
revoke all on function public.attach_voice_note(uuid, uuid, integer, text) from public;
grant execute on function public.submit_report_with_voice(text, text, text, text, text, double precision, double precision, text, boolean) to anon, authenticated;
grant execute on function public.can_upload_voice_note(text) to anon, authenticated;
grant execute on function public.attach_voice_note(uuid, uuid, integer, text) to anon, authenticated;

create policy "Submitters can upload voice notes with a report token"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'voice-notes'
    and public.can_upload_voice_note(name)
  );
