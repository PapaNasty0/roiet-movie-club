-- Profile photos for nav + forum (Neon Object Storage refs or data URLs)
alter table users add column if not exists avatar_url text not null default '';
