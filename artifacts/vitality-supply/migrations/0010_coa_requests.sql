-- Certificate-of-analysis tickets from the Testing page used to be written into
-- store_subscribers (cadence = 'coa-request'). Since 0009 that table is the
-- newsletter list (unique per email, welcome + broadcast mail), so support
-- tickets must not live there: one email could only ever open one ticket, and
-- requesters were mailed marketing they never opted into.
create table if not exists coa_requests (
  id           serial primary key,
  created_at   timestamptz not null default now(),
  email        text not null,
  compound     text not null,
  batch        text,
  resolved_at  timestamptz
);
create index if not exists coa_requests_created_idx on coa_requests (created_at desc);
create index if not exists coa_requests_email_idx on coa_requests (lower(email));

-- Move any tickets that already landed in the subscriber table, then remove
-- them from the marketing list.
insert into coa_requests (created_at, email, compound, batch)
select created_at, lower(trim(email)), coalesce(name, 'unspecified'), set_name
from store_subscribers
where cadence = 'coa-request';

delete from store_subscribers where cadence = 'coa-request';
