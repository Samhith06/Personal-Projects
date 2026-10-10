-- Check all wagers for Sunnyrocks from Sept 14-22, 2026

-- Show all individual snapshot entries
SELECT 
  s.period,
  s.fetched_at::date as date,
  w.username,
  w.wagered,
  s.payload->>'manual' as is_manual
FROM razed_snapshots s
JOIN razed_wagers w ON w.snapshot_id = s.id
WHERE lower(w.username) = 'sunnyrocks'
  AND s.fetched_at >= '2026-09-14'
  AND s.fetched_at <= '2026-09-22 23:59:59'
ORDER BY s.fetched_at DESC;

-- Calculate total for the week (Sept 14-21)
SELECT 
  'Total Sept 14-21' as description,
  SUM(w.wagered) as total_wagered,
  COUNT(*) as num_entries
FROM razed_snapshots s
JOIN razed_wagers w ON w.snapshot_id = s.id
WHERE lower(w.username) = 'sunnyrocks'
  AND s.fetched_at >= '2026-09-14'
  AND s.fetched_at <= '2026-09-21 23:59:59';

-- Calculate total including today (Sept 22)
SELECT 
  'Total Sept 14-22 (including today)' as description,
  SUM(w.wagered) as total_wagered,
  COUNT(*) as num_entries
FROM razed_snapshots s
JOIN razed_wagers w ON w.snapshot_id = s.id
WHERE lower(w.username) = 'sunnyrocks'
  AND s.fetched_at >= '2026-09-14'
  AND s.fetched_at <= '2026-09-22 23:59:59';
