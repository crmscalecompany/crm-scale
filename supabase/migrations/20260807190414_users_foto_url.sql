-- Person photo, shown next to name wherever a user (SDR/Closer/etc.) is
-- displayed — falls back to an initial circle in the UI when null.
alter table users
  add column foto_url text;
