/**
 * Razed usernames who wagered more than a threshold inside a date window.
 *
 * Each razed_wagers row is a *cumulative* total for its snapshot's period, not
 * that day's wagering, and razed_snapshots is append-only — so summing the rows
 * inside a window counts the same lifetime figure once per sync. The window
 * total is a difference between two snapshots: where everyone stood at the end,
 * minus where they stood before the window opened.
 *
 * Usage (Railway injects DATABASE_URL):
 *   railway run node query-window-wagerers.js 2026-09-14 2026-09-21 1000
 */

const { Client } = require("pg");

const [start = "2026-09-14", end = "2026-09-21", minWagerArg = "1000"] =
  process.argv.slice(2);
const minWager = Number(minWagerArg);

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
if (!dateRe.test(start) || !dateRe.test(end) || !Number.isFinite(minWager)) {
  console.error(
    "Usage: node query-window-wagerers.js <start YYYY-MM-DD> <end YYYY-MM-DD> <min-wagered>",
  );
  process.exit(1);
}

const money = (n) =>
  "$" +
  Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // The two snapshots the window is measured between. The baseline is the
    // last one taken *before* the window opened, so wagering on the first day
    // itself is counted.
    const bounds = await client.query(
      `SELECT
         (SELECT id FROM razed_snapshots
           WHERE period = 'lifetime' AND fetched_at < $1::date
           ORDER BY fetched_at DESC LIMIT 1) AS start_id,
         (SELECT fetched_at FROM razed_snapshots
           WHERE period = 'lifetime' AND fetched_at < $1::date
           ORDER BY fetched_at DESC LIMIT 1) AS start_at,
         (SELECT id FROM razed_snapshots
           WHERE period = 'lifetime' AND fetched_at < $2::date + 1
           ORDER BY fetched_at DESC LIMIT 1) AS end_id,
         (SELECT fetched_at FROM razed_snapshots
           WHERE period = 'lifetime' AND fetched_at < $2::date + 1
           ORDER BY fetched_at DESC LIMIT 1) AS end_at`,
      [start, end],
    );

    const { start_id, start_at, end_id, end_at } = bounds.rows[0];

    if (!end_id) {
      console.error(
        `No lifetime snapshot taken on or before ${end} — nothing to measure.`,
      );
      process.exit(1);
    }

    console.log(`\nWindow ${start} to ${end} (inclusive), over ${money(minWager)}\n`);
    console.log(
      `  baseline snapshot: ${
        start_at ? `#${start_id} @ ${start_at.toISOString()}` : "NONE"
      }`,
    );
    console.log(`  closing snapshot:  #${end_id} @ ${end_at.toISOString()}\n`);

    if (!start_id) {
      console.log(
        "  ⚠  No snapshot exists from before the window, so these are totals\n" +
          "     from the start of the data, not wagering inside the window.\n",
      );
    }

    const result = await client.query(
      `SELECT e.username,
              (e.wagered - COALESCE(s.wagered, 0))::text AS window_wagered,
              e.wagered::text                            AS closing_total,
              COALESCE(s.wagered, 0)::text               AS opening_total
         FROM razed_wagers e
         LEFT JOIN razed_wagers s
                ON s.snapshot_id = $2::bigint
               AND lower(s.username) = lower(e.username)
        WHERE e.snapshot_id = $1::bigint
          AND e.wagered - COALESCE(s.wagered, 0) > $3::numeric
        ORDER BY (e.wagered - COALESCE(s.wagered, 0)) DESC`,
      [end_id, start_id, minWager],
    );

    if (result.rows.length === 0) {
      console.log(`No usernames wagered over ${money(minWager)} in that window.\n`);
      return;
    }

    console.log("─".repeat(72));
    console.log(
      "Username".padEnd(26) + "Wagered in window".padEnd(22) + "Closing total",
    );
    console.log("─".repeat(72));
    for (const row of result.rows) {
      console.log(
        row.username.padEnd(26) +
          money(row.window_wagered).padEnd(22) +
          money(row.closing_total),
      );
    }
    console.log("─".repeat(72));
    console.log(`\n${result.rows.length} username(s).\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
