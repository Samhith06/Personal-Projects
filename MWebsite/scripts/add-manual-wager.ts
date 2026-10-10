/**
 * Add a manual wager entry for a user on a specific date
 *
 * Usage:
 *   npx tsx scripts/add-manual-wager.ts Sunnyrocks 900 2026-09-21
 */

import { tx } from "@/lib/db";

async function addManualWager(username: string, amount: number, date: string) {
  console.log(`Adding manual wager for ${username}: $${amount} on ${date}`);

  const result = await tx(async (client) => {
    // Step 1: Create or get snapshot for this date
    const snapshotResult = await client.query<{ id: number }>(
      `INSERT INTO razed_snapshots (period, fetched_at, row_count, payload)
       VALUES ($1, $2::timestamptz, 1, $3::jsonb)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        date,
        `${date}T23:59:59Z`,
        JSON.stringify({
          manual: true,
          note: `Manual wager entry for ${username}`,
          from: date,
          to: date,
          rows: [{ username, wagered: amount }],
        }),
      ],
    );

    let snapshotId: number;

    if (snapshotResult.rows.length > 0) {
      snapshotId = snapshotResult.rows[0].id;
      console.log(`✓ Created new snapshot ID: ${snapshotId}`);
    } else {
      // Snapshot already exists, get its ID
      const existing = await client.query<{ id: number }>(
        `SELECT id FROM razed_snapshots WHERE period = $1 ORDER BY fetched_at DESC LIMIT 1`,
        [date],
      );
      snapshotId = existing.rows[0].id;
      console.log(`✓ Using existing snapshot ID: ${snapshotId}`);
    }

    // Step 2: Add or update the wager entry
    await client.query(
      `INSERT INTO razed_wagers (snapshot_id, username, wagered)
       VALUES ($1, $2, $3)
       ON CONFLICT (snapshot_id, username) 
       DO UPDATE SET wagered = razed_wagers.wagered + EXCLUDED.wagered`,
      [snapshotId, username, amount],
    );

    console.log(`✓ Added wager entry`);

    // Step 3: Verify
    const verify = await client.query<{ username: string; wagered: string }>(
      `SELECT w.username, w.wagered::text
       FROM razed_wagers w
       WHERE w.snapshot_id = $1 AND lower(w.username) = lower($2)`,
      [snapshotId, username],
    );

    return verify.rows[0];
  });

  console.log(
    `\n✅ Success! ${result.username} now has $${result.wagered} wagered on ${date}`,
  );
  return result;
}

// Parse command line arguments
const [username, amountStr, date] = process.argv.slice(2);

if (!username || !amountStr || !date) {
  console.error(
    "Usage: npx tsx scripts/add-manual-wager.ts <username> <amount> <date>",
  );
  console.error(
    "Example: npx tsx scripts/add-manual-wager.ts Sunnyrocks 900 2026-09-21",
  );
  process.exit(1);
}

const amount = parseFloat(amountStr);
if (isNaN(amount) || amount <= 0) {
  console.error("Error: Amount must be a positive number");
  process.exit(1);
}

// Validate date format
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error("Error: Date must be in YYYY-MM-DD format");
  process.exit(1);
}

addManualWager(username, amount, date)
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
