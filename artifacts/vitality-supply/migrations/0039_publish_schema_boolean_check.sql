-- Replit's publish schema serializer turns a PostgreSQL boolean shorthand
-- CHECK (id) into invalid SQL: CHECK (CHECK (id)).
-- Migration 0034 used that shorthand before the publish-safe rule was known.
-- Remove the development constraint so schema introspection can produce valid
-- SQL for the next publish. The primary key still enforces one true row.
alter table if exists manager_observation_gate
  drop constraint if exists manager_observation_gate_id_check;