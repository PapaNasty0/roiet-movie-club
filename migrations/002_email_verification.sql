-- Idempotent upgrade for databases that already applied 001_init.sql
alter table users add column if not exists email_verified boolean not null default false;

create table if not exists email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_verify_user on email_verification_tokens (user_id);

-- Google-linked accounts are already email-verified by the IdP
update users set email_verified = true where google_id is not null and email_verified = false;
