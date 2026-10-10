/**
 * Calculate total wagers for a user within a date range
 *
 * Usage:
 *   npx tsx scripts/calculate-weekly-wager.ts Sunnyrocks 2026-09-14 2026-09-21
 */

import { rows } from "@/lib/db";

async function calculateWagerTotal(
  username: string,
  startDate: string,
  endDate: string,
) {
  console.log(`\n📊 Calculating total wagers for ${username}`);
  console.log(`   Date range: ${startDate} to ${endDate} (inclusive)\n`);

  // Get all individual entries
  const entries = await rows<{
    period: string;
    date: string;
    wagered: string;
    is_manual: string | null;
  }>(
    `SELECT 
      s.period,
      s.fetched_at::date::text as date,
      w.wagered::text,
      s.payload->>'manual' as is_manual
    FROM razed_snapshots s
    JOIN razed_wagers w ON w.snapshot_id = s.id
    WHERE lower(w.username) = lower($1)
      AND s.fetched_at >= $2::date
      AND s.fetched_at <= ($3::date + interval '1 day' - interval '1 second')
    ORDER BY s.fetched_at`,
    [username, startDate, endDate],
  );

  if (entries.length === 0) {
    console.log(`❌ No wager data found for ${username} in this date range`);
    return;
  }

  console.log("📋 Individual entries:\n");
  let total = 0;

  entries.forEach((entry, index) => {
    const amount = parseFloat(entry.wagered);
    total += amount;
    const manualTag = entry.is_manual ? " [MANUAL]" : "";
    console.log(
      `   ${index + 1}. ${entry.date} - $${amount.toFixed(2)}${manualTag}`,
    );
  });

  console.log(`\n${"─".repeat(50)}`);
  console.log(
    `💰 TOTAL WAGER (${startDate} to ${endDate}): $${total.toFixed(2)}`,
  );
  console.log(`   Number of entries: ${entries.length}`);
  console.log(`${"─".repeat(50)}\n`);

  return { total, entries: entries.length };
}

// Parse command line arguments
const [username, startDate, endDate] = process.argv.slice(2);

if (!username || !startDate || !endDate) {
  console.error(
    "Usage: npx tsx scripts/calculate-weekly-wager.ts <username> <start-date> <end-date>",
  );
  console.error(
    "Example: npx tsx scripts/calculate-weekly-wager.ts Sunnyrocks 2026-09-14 2026-09-21",
  );
  process.exit(1);
}

// Validate date format
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
  console.error("Error: Dates must be in YYYY-MM-DD format");
  process.exit(1);
}

calculateWagerTotal(username, startDate, endDate)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
