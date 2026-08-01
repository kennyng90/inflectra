-- A Chart's origin: the Instrument it shows and the Time resolution it was drawn
-- at. Null means the user supplied the Chart, so both columns are nullable and
-- existing rows stay valid. Still no update policy: an Analysis is immutable.
alter table public.analyses
  add column instrument text,
  add column time_resolution text;

-- analyze-chart validates an origin before it writes one, but the insert policy
-- lets a client write this table directly, so the same rules hold at the table.
-- The contract in _shared/chart-origin.ts stays the spine: a new Time resolution
-- or a longer Instrument changes it there first, and then needs a migration.
alter table public.analyses
  -- An origin is a pair: an Instrument without a Time resolution says nothing
  -- about what the Chart covers.
  add constraint analyses_origin_is_whole
    check (num_nulls(instrument, time_resolution) <> 1),
  add constraint analyses_instrument_length
    check (instrument is null or char_length(instrument) between 1 and 32),
  add constraint analyses_time_resolution_known
    check (time_resolution is null or time_resolution in ('two_days', 'thirty_days'));
