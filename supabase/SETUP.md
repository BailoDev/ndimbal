# Supabase setup

## Apply the database schema

In the Supabase Dashboard for the project configured in `.env.local`, open **SQL Editor** and run the migration files in timestamp order. For a new project, run `migrations/20261020000000_initial_schema.sql` first, then `migrations/20261021000000_voice_only_reports.sql`. If the initial schema is already installed, run only the voice-only reports migration. The migrations create the tables, policies, report RPCs, routing rules, notification triggers, and private voice-note bucket used by the app.

Set the site URL and allowed redirect URLs for the local and deployed app. The app intentionally has no public signup flow. To prevent account creation through Supabase's API too, open **Authentication → Settings** and disable **Allow new users to sign up** (the setting may be under **User Signups**). Existing users can still sign in.

## Create the first administrator

1. In Supabase Dashboard, open **Authentication → Users → Add user** and create `admin@gmail.com`. Set a unique password and confirm the user if prompted. Do not save the password in this repository.
2. In the Supabase SQL Editor, run:

```sql
update public.profiles as p
set role = 'admin'
from auth.users as u
where u.id = p.id
  and lower(u.email) = lower('admin137@gmail.com');
```

3. Verify that the profile has the `admin` role, then sign in to the app again. The admin dashboard can list users, grant `officer` or `admin` roles, and view/manage all reports.

New signups are always assigned the `citizen` role by a database trigger. Do not put a service-role key in the Vite environment or browser code.

## Environment

The frontend reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the root `.env.local`. These must belong to the same Supabase project where the migration is applied. The anon/publishable key is intended for the browser; database permissions are enforced by row-level security.

//chekcing for authentication
select u.email, p.id, p.role
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('admin@gmail.com');