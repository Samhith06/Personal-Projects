-- Add $900 wager for Sunnyrocks on September 21st, 2026
-- This script:
-- 1. Creates a manual snapshot for September 21st
-- 2. Adds the $900 wager for Sunnyrocks
-- 3. Updates the lifetime total if needed

-- Step 1: Create a manual snapshot for September 21st, 2026
INSERT INTO razed_snapshots (period, fetched_at, row_count, payload)
VALUES (
  '2026-09-21',
  '2026-09-21 23:59:59+00',
  1,
  jsonb_build_object(
    'manual', true,
    'note', 'Manual wager entry for Sunnyrocks',
    'from', '2026-09-21',
    'to', '2026-09-21',
    'rows', jsonb_build_array(
      jsonb_build_object('username', 'Sunnyrocks', 'wagered', 900.00)
    )
  )
)
RETURNING id;

-- Step 2: Add the wager entry (replace <snapshot_id> with the ID from above)
-- Get the snapshot ID first
WITH latest_snapshot AS (
  SELECT id FROM razed_snapshots 
  WHERE period = '2026-09-21' 
  ORDER BY fetched_at DESC 
  LIMIT 1
)
INSERT INTO razed_wagers (snapshot_id, username, wagered)
SELECT id, 'Sunnyrocks', 900.00
FROM latest_snapshot
ON CONFLICT (snapshot_id, username) DO UPDATE
  SET wagered = EXCLUDED.wagered;

-- Step 3: Verify the entry was added
SELECT 
  s.period,
  s.fetched_at,
  w.username,
  w.wagered
FROM razed_snapshots s
JOIN razed_wagers w ON w.snapshot_id = s.id
WHERE s.period = '2026-09-21'
  AND lower(w.username) = 'sunnyrocks';
