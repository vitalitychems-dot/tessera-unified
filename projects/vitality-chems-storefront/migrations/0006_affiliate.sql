alter table promo_codes
  alter column percent type numeric using percent::numeric;

insert into promo_codes (code, kind, percent, label, partner) values
  ('AFF12', 'affiliate', 12.5, 'Affiliate 12.5%', 'Default affiliate'),
  ('PARTNER', 'affiliate', 12.5, 'Partner 12.5%', 'Partner')
on conflict (code) do update set percent = excluded.percent, kind = excluded.kind, label = excluded.label;

update promo_codes
  set percent = 12.5
  where kind = 'affiliate';
