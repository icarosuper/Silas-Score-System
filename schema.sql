create table if not exists occurrences (
  id           text    primary key,
  occurred_at  integer not null,
  day          text    not null,
  event        text    not null,
  channel      text    not null,
  author       text    not null,
  measures     text    not null
);
create index if not exists idx_occurrences_day on occurrences (day, occurred_at);
