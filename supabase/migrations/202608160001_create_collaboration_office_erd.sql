-- Global collaboration office ERD.
-- This migration intentionally excludes RLS policies, authentication, seed data,
-- and updated_at triggers. Those are added when the server persistence flow exists.

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name varchar(80) not null check (char_length(btrim(name)) between 1 and 80),
  default_language varchar(5) not null default 'ko'
    check (default_language in ('ko', 'vi', 'en')),
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  guest_token text not null unique,
  name varchar(40) not null check (char_length(btrim(name)) between 1 and 40),
  country_code varchar(2) not null check (country_code in ('KR', 'VN')),
  avatar_id varchar(80) not null,
  preferred_language varchar(5) not null default 'ko'
    check (preferred_language in ('ko', 'vi', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.desks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  assigned_member_id uuid unique references public.members(id) on delete set null,
  label varchar(80) not null,
  zone varchar(24) not null default 'shared-office'
    check (zone in ('shared-office', 'korea-zone', 'vietnam-zone', 'meeting-room', 'focus-room')),
  position_x integer not null,
  position_y integer not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, label)
);

create table public.member_presence (
  member_id uuid primary key references public.members(id) on delete cascade,
  current_desk_id uuid references public.desks(id) on delete set null,
  connection_status varchar(16) not null default 'disconnected'
    check (connection_status in ('connected', 'disconnected')),
  attendance_status varchar(16) not null default 'checked_out'
    check (attendance_status in ('working', 'checked_out')),
  availability_status varchar(16) not null default 'available'
    check (availability_status in ('available', 'focus', 'meeting', 'vacation', 'remote_work', 'absent')),
  display_mode varchar(16) not null default 'ghost'
    check (display_mode in ('active', 'sleeping', 'ghost', 'vacation', 'remote')),
  status_message varchar(120),
  position_x integer not null default 0,
  position_y integer not null default 0,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  disconnected_at timestamptz,
  last_heartbeat_at timestamptz,
  last_active_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  action varchar(16) not null
    check (action in ('check_in', 'check_out', 'disconnect', 'reconnect')),
  occurred_at timestamptz not null default now(),
  note varchar(160)
);

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  title varchar(160) not null check (char_length(btrim(title)) between 1 and 160),
  status varchar(16) not null default 'planned'
    check (status in ('planned', 'in_progress', 'done', 'blocked')),
  is_public boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by_member_id uuid references public.members(id) on delete set null,
  title varchar(160) not null check (char_length(btrim(title)) between 1 and 160),
  event_type varchar(16) not null
    check (event_type in ('vacation', 'remote_work', 'absence', 'meeting', 'focus')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_all_day boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.calendar_event_participants (
  calendar_event_id uuid not null references public.calendar_events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  primary key (calendar_event_id, member_id)
);

create table public.meeting_rooms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by_member_id uuid references public.members(id) on delete set null,
  title varchar(160) not null check (char_length(btrim(title)) between 1 and 160),
  livekit_room_name varchar(120) not null unique,
  status varchar(16) not null default 'waiting'
    check (status in ('waiting', 'active', 'ended')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  check (ended_at is null or started_at is null or ended_at >= started_at)
);

create table public.meeting_participants (
  meeting_room_id uuid not null references public.meeting_rooms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (meeting_room_id, member_id),
  check (left_at is null or left_at >= joined_at)
);

create index members_workspace_country_idx
  on public.members (workspace_id, country_code);
create index desks_workspace_zone_idx
  on public.desks (workspace_id, zone);
create index todos_member_status_idx
  on public.todos (member_id, status, sort_order);
create index attendance_logs_member_occurred_at_idx
  on public.attendance_logs (member_id, occurred_at desc);
create index calendar_events_workspace_starts_at_idx
  on public.calendar_events (workspace_id, starts_at);
create index calendar_event_participants_member_idx
  on public.calendar_event_participants (member_id);
create index meeting_rooms_workspace_status_idx
  on public.meeting_rooms (workspace_id, status);
