-- Move the legacy singular sender hostname to the verified public domain.
-- Preserve the local part so an owner-selected sender address remains intact.
update store_settings
set value = regexp_replace(lower(trim(value)), '@vitalitychem\.com$', '@vitalitychems.com'),
    updated_at = now()
where key = 'email_from'
  and lower(trim(value)) ~ '@vitalitychem\.com$';