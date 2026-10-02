-- Security and platform-policy evidence stay reviewable backlogs. They never
-- grant the model permission to change auth, code, secrets, or deployment.
alter table manager_findings
  drop constraint if exists manager_findings_category_check;

alter table manager_findings
  add constraint manager_findings_category_check
  check (category in
    ('performance', 'seo', 'security', 'competitors', 'funnel', 'orders', 'accessibility', 'ads'));

insert into manager_settings (key, value)
values
  ('security_backlog', '[]'::jsonb),
  ('platform_policy_backlog', '[]'::jsonb)
on conflict (key) do nothing;