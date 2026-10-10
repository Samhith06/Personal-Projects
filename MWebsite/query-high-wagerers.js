/**
 * Query high wagerers from Railway Postgres
 * Usage: node query-high-wagerers.js
 */

const { Client } = require("pg");

async function queryHighWagerers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("✓ Connected to database\n");

    const result = await client.query(`
      SELECT 
        w.username,
        SUM(w.wagered) as total_wagered,
        COUNT(DISTINCT s.period) as days_wagered,
        MIN(s.fetched_at::date) as first_wager_date,
        MAX(s.fetched_at::date) as last_wager_date
      FROM razed_snapshots s
      JOIN razed_wagers w ON w.snapshot_id = s.id
      WHERE s.fetched_at >= '2026-09-14'
        AND s.fetched_at <= '2026-09-21 23:59:59'
      GROUP BY w.username
      HAVING SUM(w.wagered) > 1000
      ORDER BY total_wagered DESC
      LIMIT 20;
    `);

    console.log("📊 Users who wagered over $1,000 (Sept 14-21):\n");
    console.log("─".repeat(80));
    console.log(
      "Username".padEnd(20) +
        "Total Wagered".padEnd(20) +
        "Days".padEnd(10) +
        "First Date".padEnd(15) +
        "Last Date",
    );
    console.log("─".repeat(80));

    result.rows.forEach((row) => {
      const total = parseFloat(row.total_wagered).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      console.log(
        row.username.padEnd(20) +
          `$${total}`.padEnd(20) +
          row.days_wagered.toString().padEnd(10) +
          row.first_wager_date.toISOString().slice(0, 10).padEnd(15) +
          row.last_wager_date.toISOString().slice(0, 10),
      );
    });

    console.log("─".repeat(80));
    console.log(`\nTotal: ${result.rows.length} users`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.end();
  }
}

queryHighWagerers();
