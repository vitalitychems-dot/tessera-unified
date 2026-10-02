alter table store_subscribers add column if not exists source text;
alter table store_subscribers add column if not exists promo_code text;
alter table store_subscribers add column if not exists welcome_sent_at timestamptz;
alter table store_subscribers add column if not exists unsubscribed_at timestamptz;
alter table store_subscribers add column if not exists unsubscribe_token text;
alter table store_subscribers add column if not exists updated_at timestamptz default now();

delete from store_subscribers older
using store_subscribers newer
where lower(older.email) = lower(newer.email)
  and older.id < newer.id;

update store_subscribers
set
  email = lower(trim(email)),
  source = coalesce(source, case when cadence is not null then 'sets' else 'legacy' end),
  unsubscribe_token = coalesce(
    unsubscribe_token,
    md5(random()::text || clock_timestamp()::text || id::text)
  ),
  updated_at = coalesce(updated_at, created_at, now());

alter table store_subscribers alter column unsubscribe_token set not null;
create unique index if not exists store_subscribers_email_lower_uidx
  on store_subscribers (lower(email));
create unique index if not exists store_subscribers_unsubscribe_token_uidx
  on store_subscribers (unsubscribe_token);
create index if not exists store_subscribers_active_idx
  on store_subscribers (created_at desc) where unsubscribed_at is null;