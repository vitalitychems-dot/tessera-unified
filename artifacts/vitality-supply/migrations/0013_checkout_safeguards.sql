-- Checkout-only business details and research-use safeguards.
-- EINs are never stored in the clear: the application stores a keyed fingerprint
-- so a submitted EIN can be associated with an account/order without retaining it.
alter table store_orders add column if not exists business_email text;
alter table store_orders add column if not exists ein_fingerprint text;
alter table store_orders add column if not exists research_attested_at timestamptz;
alter table store_orders add column if not exists first_order_review_required boolean not null default true;
alter table store_orders add column if not exists referral_code text;
alter table store_orders add column if not exists referral_owner_id text;
alter table store_orders add column if not exists referral_reward numeric not null default 0;

create table if not exists store_customer_profiles (
  user_id       text primary key,
  business_email text,
  ein_fingerprint text,
  research_attested_at timestamptz,
  updated_at    timestamptz not null default now()
);

create table if not exists store_referral_rewards (
  id                 bigserial primary key,
  order_id           text not null references store_orders(id),
  referral_code      text not null,
  referrer_id        text not null,
  referred_key_hash  text not null,
  reward             numeric not null default 0,
  status             text not null default 'pending',
  created_at         timestamptz not null default now(),
  settled_at         timestamptz,
  cancelled_at       timestamptz
);

create unique index if not exists store_referral_rewards_order_uidx
  on store_referral_rewards(order_id);
-- A referred identity receives the first-order referral incentive once. Pending
-- rows also reserve the identity, preventing concurrent duplicate checkouts.
create unique index if not exists store_referral_rewards_identity_uidx
  on store_referral_rewards(referred_key_hash)
  where status in ('pending', 'settled');
create index if not exists store_referral_rewards_referrer_idx
  on store_referral_rewards(referrer_id, created_at desc);

create unique index if not exists promo_codes_one_customer_referral_uidx
  on promo_codes(owner_id)
  where kind = 'referral' and active = true and owner_id is not null;