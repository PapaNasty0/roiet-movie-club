create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text,
  name text not null default '',
  google_id text unique,
  is_admin boolean not null default false,
  notify_new_movies boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists skins (
  id text primary key,
  name text not null,
  description text not null default '',
  css_vars jsonb not null default '{}'::jsonb,
  hero_overlay text not null default '',
  is_default boolean not null default false
);

create table if not exists movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  synopsis text not null default '',
  genre text not null default '',
  rating text not null default '',
  length_minutes integer not null default 0,
  showtime_start timestamptz,
  showtime_end timestamptz,
  youtube_trailer_id text not null default '',
  reviews_summary text not null default '',
  poster_url text not null default '',
  cinema text not null default 'Robinson Roi Et / Major Cineplex',
  skin_id text references skins(id) on delete set null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rsvps (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references movies(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null check (status in ('might_go', 'probably_go', 'booked')),
  adults integer not null default 1 check (adults >= 0),
  children integer not null default 0 check (children >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (movie_id, user_id)
);

create table if not exists forum_posts (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references movies(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists gallery_photos (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  caption text not null default '',
  image_url text not null,
  outing_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists site_content (
  key text primary key,
  label text not null default '',
  value text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists site_settings (
  key text primary key,
  value text not null default ''
);

create index if not exists idx_movies_showtime on movies (showtime_start);
create index if not exists idx_rsvps_movie on rsvps (movie_id);
create index if not exists idx_forum_movie on forum_posts (movie_id, created_at);
create index if not exists idx_gallery_sort on gallery_photos (sort_order, outing_date desc);
