-- Razed usernames who wagered over 1000 between Sept 14 and Sept 21, 2026.
--
-- razed_wagers.wagered is a CUMULATIVE total for its snapshot's period, and
-- razed_snapshots is append-only, so summing rows inside a date range counts
-- the same lifetime figure once per sync. The window total is the difference
-- between two snapshots: the standings at the close of the 21st, minus the
-- standings before the 14th opened.

-- 1. Which snapshots the window is measured between. Check these look sane --
--    if the baseline is missing, there was no sync before the 14th and the
--    numbers below are totals from the start of the data, not the window.
SELECT 'baseline (before Sept 14)' AS bound, id, fetched_at, row_count
  FROM razed_snapshots
 WHERE period = 'lifetime' AND fetched_at < '2026-09-14'::date
 ORDER BY fetched_at DESC LIMIT 1;

SELECT 'closing (through Sept 21)' AS bound, id, fetched_at, row_count
  FROM razed_snapshots
 WHERE period = 'lifetime' AND fetched_at < '2026-09-21'::date + 1
 ORDER BY fetched_at DESC LIMIT 1;

-- 2. The usernames themselves.
WITH bounds AS (
  SELECT
    (SELECT id FROM razed_snapshots
      WHERE period = 'lifetime' AND fetched_at < '2026-09-14'::date
      ORDER BY fetched_at DESC LIMIT 1) AS opening_id,
    (SELECT id FROM razed_snapshots
      WHERE period = 'lifetime' AND fetched_at < '2026-09-21'::date + 1
      ORDER BY fetched_at DESC LIMIT 1) AS closing_id
)
SELECT c.username,
       round(c.wagered - COALESCE(o.wagered, 0), 2) AS wagered_sep14_21,
       c.wagered                                    AS closing_total,
       COALESCE(o.wagered, 0)                       AS opening_total
  FROM bounds b
  JOIN razed_wagers c ON c.snapshot_id = b.closing_id
  LEFT JOIN razed_wagers o ON o.snapshot_id = b.opening_id
                          AND lower(o.username) = lower(c.username)
 WHERE c.wagered - COALESCE(o.wagered, 0) > 1000
 ORDER BY wagered_sep14_21 DESC;
