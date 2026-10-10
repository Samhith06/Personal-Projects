# Step 1 — Blog Scraper Notebook

## Overview

This notebook scrapes three Databricks content sources, extracts structured post/feature data,
and writes everything raw to the **Bronze Delta table**. It runs on a cron schedule via a
Databricks Job.

### Sources and scraping strategy

| # | Source | URL | Method | What we get |
|---|---|---|---|---|
| 1 | Databricks Blog | `https://www.databricks.com/blog` | HTML scraping (Gatsby SPA) | Post titles, URLs, dates, categories, body text |
| 2 | AWS Docs RSS feed | `https://docs.databricks.com/aws/en/feed.xml` | RSS/XML feed parsing | Feature entries with title, link, summary, published date |
| 3 | Azure Release Notes | `https://learn.microsoft.com/en-in/azure/databricks/release-notes/product/{YYYY}/{month}` | HTML scraping (Markdown-structured page) | Individual feature announcements with date and description |

> **Why different strategies per source?**
> The blog is a Gatsby SPA — its content is server-side rendered HTML with nav/menu noise to strip.
> The AWS docs feed is a clean RSS XML file — the fastest and most reliable source, parse directly.
> The Azure release notes page is a well-structured HTML doc where each feature is a `## heading` +
> a date line + a paragraph — easy to parse deterministically without a classifier.

---

## Prerequisites

| Requirement | Detail |
|---|---|
| Databricks Runtime | 13.3 LTS or above |
| Python libraries | `requests`, `beautifulsoup4`, `lxml`, `feedparser` |
| Cluster | Single-node or job cluster with public internet egress |
| Delta table | `catalog.bronze.blog_raw` (one-time setup — DDL at the bottom) |

Install libraries if not pre-installed on the cluster:

```python
%pip install requests beautifulsoup4 lxml feedparser
```

---

## Notebook structure

Six cells in order. Each cell has a single responsibility.

---

### Cell 1 — Imports and config

```python
import requests
import feedparser
import hashlib
import time
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from pyspark.sql import Row

# ── Config ─────────────────────────────────────────────────────────────────
BRONZE_TABLE = "catalog.bronze.blog_raw"

BLOG_URL         = "https://www.databricks.com/blog"
RSS_FEED_URL     = "https://docs.databricks.com/aws/en/feed.xml"

# Azure release notes: build URL for current month dynamically
_now             = datetime.now(timezone.utc)
AZURE_RN_URL     = (
    f"https://learn.microsoft.com/en-in/azure/databricks/"
    f"release-notes/product/{_now.year}/{_now.strftime('%B').lower()}"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; DatabricksBlogScraper/1.0; +internal)"
}

SCRAPE_TS = datetime.now(timezone.utc).isoformat()
print(f"Scrape run: {SCRAPE_TS}")
print(f"Azure release notes URL: {AZURE_RN_URL}")
```

---

### Cell 2 — Source 1: Databricks Blog (HTML)

The blog is built with Gatsby. The page is server-side rendered, so `requests` gets the full HTML.
Each post card sits inside the main content area. We collect index-level metadata here, then fetch
body content per-post in Cell 5.

```python
def scrape_blog_index(max_pages: int = 5) -> list[dict]:
    """
    Paginate through the Databricks blog index.
    The blog uses ?page=N (0-indexed). Returns when a page yields no posts.
    """
    all_posts = []

    for page in range(max_pages):
        url = BLOG_URL if page == 0 else f"{BLOG_URL}?page={page}"
        resp = requests.get(url, headers=HEADERS, timeout=20)

        if resp.status_code != 200:
            print(f"  Blog page {page}: HTTP {resp.status_code} — stopping")
            break

        soup = BeautifulSoup(resp.text, "lxml")

        # The blog renders post cards — inspect the live page and update these
        # selectors if Databricks changes their HTML. As of June 2026:
        #   - Each card is an <article> or a <div> with a link + heading + date
        cards = (
            soup.select("article")
            or soup.select("div.field--name-title")
            or soup.select("[class*='blog-card'], [class*='BlogCard']")
        )

        if not cards:
            # Fallback: collect all internal /blog/ links from the page
            cards_links = [
                a for a in soup.select("a[href*='/blog/']")
                if a.get_text(strip=True)
            ]
            if not cards_links:
                print(f"  Blog page {page}: no cards found — stopping pagination")
                break

            for a in cards_links[:20]:
                href = a["href"]
                if not href.startswith("http"):
                    href = "https://www.databricks.com" + href
                all_posts.append({
                    "title":        a.get_text(strip=True),
                    "url":          href,
                    "publish_date": None,
                    "tags":         [],
                    "source":       "databricks_blog",
                    "body":         "",
                })
            print(f"  Blog page {page}: fallback collected {len(cards_links)} links")
            continue

        page_posts = []
        for card in cards:
            link_el  = card.select_one("a[href]")
            title_el = card.select_one("h1, h2, h3, h4")
            date_el  = card.select_one("time, [class*='date'], [class*='Date']")
            tag_els  = card.select("[class*='tag'], [class*='Tag'], [class*='category']")

            if not link_el:
                continue

            href = link_el["href"]
            if not href.startswith("http"):
                href = "https://www.databricks.com" + href

            title = (
                title_el.get_text(strip=True) if title_el
                else link_el.get_text(strip=True)
            )

            page_posts.append({
                "title":        title,
                "url":          href,
                "publish_date": date_el.get_text(strip=True) if date_el else None,
                "tags":         [t.get_text(strip=True) for t in tag_els],
                "source":       "databricks_blog",
                "body":         "",
            })

        if not page_posts:
            print(f"  Blog page {page}: 0 posts parsed — stopping")
            break

        all_posts.extend(page_posts)
        print(f"  Blog page {page}: {len(page_posts)} posts")
        time.sleep(1.0)

    return all_posts


blog_posts = scrape_blog_index(max_pages=5)
print(f"\nTotal blog posts collected: {len(blog_posts)}")
```

> **Selector note:** The Databricks blog is a Gatsby app. If you see 0 posts, open the page in
> your browser → right-click a post card → Inspect → identify the wrapper element's class name
> and update the `soup.select(...)` call. This is the most maintenance-prone part.

---

### Cell 3 — Source 2: AWS Docs RSS feed

This is the cleanest source. `feedparser` handles all RSS/Atom parsing, encoding, and date
normalisation for us.

```python
def scrape_rss_feed(url: str) -> list[dict]:
    """
    Parse the Databricks AWS docs RSS/Atom feed.
    feedparser handles encoding, date parsing, and malformed XML gracefully.
    """
    feed = feedparser.parse(url)

    if feed.bozo:
        print(f"  RSS feed warning (bozo): {feed.bozo_exception}")

    entries = []
    for entry in feed.entries:
        # feedparser normalises dates to a 9-tuple; convert to ISO string
        pub = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            pub = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()

        # Summary may contain HTML — strip it
        raw_summary = getattr(entry, "summary", "") or ""
        summary_text = BeautifulSoup(raw_summary, "lxml").get_text(separator="\n", strip=True)

        entries.append({
            "title":        getattr(entry, "title", ""),
            "url":          getattr(entry, "link", url),
            "publish_date": pub,
            "tags":         [t.term for t in getattr(entry, "tags", [])],
            "source":       "databricks_aws_rss",
            "body":         summary_text,
        })

    print(f"  RSS feed: {len(entries)} entries parsed")
    return entries


rss_entries = scrape_rss_feed(RSS_FEED_URL)
print(f"Total RSS entries: {len(rss_entries)}")
```

---

### Cell 4 — Source 3: Azure Databricks release notes (HTML)

The Azure release notes page has a very consistent structure — confirmed by inspection:

```
## Feature title
**June 4, 2026**
Description paragraph with a [link](url).
```

Each `## h2` heading is one feature announcement. We parse them deterministically.

```python
def scrape_azure_release_notes(url: str) -> list[dict]:
    """
    Parse the Azure Databricks monthly release notes page.
    Each feature is an H2 heading followed by a bold date line and a description.
    URL pattern: .../release-notes/product/{YYYY}/{month}
    """
    resp = requests.get(url, headers=HEADERS, timeout=20)

    if resp.status_code == 404:
        print(f"  Azure release notes: page not yet published ({url})")
        return []
    if resp.status_code != 200:
        print(f"  Azure release notes: HTTP {resp.status_code}")
        return []

    soup = BeautifulSoup(resp.text, "lxml")

    # Find the main article content — skip nav, TOC, and footer
    article = (
        soup.select_one("article")
        or soup.select_one("main")
        or soup.select_one(".content")
    )
    if not article:
        print("  Azure release notes: could not find article body")
        return []

    features = []
    headings = article.select("h2")

    for h2 in headings:
        feature_title = h2.get_text(strip=True)

        # Skip the "In this article" meta-heading
        if feature_title.lower() in ("in this article", "feedback"):
            continue

        # Collect sibling elements until the next h2
        body_parts = []
        publish_date = None
        node = h2.find_next_sibling()

        while node and node.name != "h2":
            text = node.get_text(separator=" ", strip=True)

            # The date line is always a bold/strong paragraph like "June 4, 2026"
            if node.name == "p" and node.find("strong") and not publish_date:
                candidate = node.get_text(strip=True)
                # Simple heuristic: date lines are short (< 25 chars)
                if len(candidate) < 25:
                    publish_date = candidate
                    node = node.find_next_sibling()
                    continue

            if text:
                body_parts.append(text)
            node = node.find_next_sibling()

        features.append({
            "title":        feature_title,
            "url":          url + f"#{feature_title.lower().replace(' ', '-')}",
            "publish_date": publish_date,
            "tags":         ["release-notes", "azure"],
            "source":       "azure_release_notes",
            "body":         "\n".join(body_parts),
        })

    print(f"  Azure release notes: {len(features)} features parsed from {url}")
    return features


azure_features = scrape_azure_release_notes(AZURE_RN_URL)
print(f"Total Azure features: {len(azure_features)}")
```

---

### Cell 5 — Fetch blog post body content

For blog posts from Cell 2, we now fetch the full article body. RSS and Azure entries already
have their body content, so they skip this step.

```python
def fetch_post_body(url: str) -> str:
    """Fetch and extract the main text body of a Databricks blog post."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        if resp.status_code != 200:
            return ""
        soup = BeautifulSoup(resp.text, "lxml")

        # Try known Databricks blog article containers in priority order
        body_el = (
            soup.select_one("article .field--name-body")
            or soup.select_one("article")
            or soup.select_one("[class*='blog-post-body'], [class*='BlogPostBody']")
            or soup.select_one("main")
        )
        return body_el.get_text(separator="\n", strip=True) if body_el else ""
    except Exception as e:
        print(f"  Failed to fetch body for {url}: {e}")
        return ""


print("Fetching blog post bodies...")
for i, post in enumerate(blog_posts):
    post["body"] = fetch_post_body(post["url"])
    time.sleep(0.5)   # polite delay — 500ms between requests
    if (i + 1) % 10 == 0:
        print(f"  {i + 1}/{len(blog_posts)} done")

print("Blog body fetch complete.")
```

---

### Cell 6 — Combine, add metadata, write to Bronze

Merge all three source lists, compute a `content_hash` for Silver deduplication,
and append to the Bronze Delta table.

```python
def make_content_hash(url: str, body: str) -> str:
    """SHA-256 of URL + first 500 chars of body. Used for dedup in Silver."""
    content = (url + body[:500]).encode("utf-8")
    return hashlib.sha256(content).hexdigest()


all_records = blog_posts + rss_entries + azure_features

rows = [
    Row(
        title         = r.get("title", "")        or "",
        url           = r.get("url", "")           or "",
        publish_date  = r.get("publish_date")      or None,
        tags          = r.get("tags", [])          or [],
        source        = r.get("source", "unknown") or "unknown",
        body          = r.get("body", "")          or "",
        content_hash  = make_content_hash(
                            r.get("url", ""),
                            r.get("body", "")
                        ),
        scrape_ts     = SCRAPE_TS,
        is_processed  = False,
    )
    for r in all_records
    if r.get("url")   # skip any records with no URL
]

assert len(rows) > 0, "No records to write — check scraper output above before proceeding."

df = spark.createDataFrame(rows)
print(f"Schema:")
df.printSchema()
print(f"\nRecords by source:")
df.groupBy("source").count().show()

# Append to Bronze — never overwrite, never merge here
(
    df.write
    .format("delta")
    .mode("append")
    .option("mergeSchema", "true")
    .saveAsTable(BRONZE_TABLE)
)

print(f"\nWritten {df.count()} rows to {BRONZE_TABLE}")
dbutils.notebook.exit("SUCCESS")
```

---

## Bronze table schema

| Column | Type | Description |
|---|---|---|
| `title` | STRING | Post title or feature name |
| `url` | STRING | Source URL (primary key candidate for dedup) |
| `publish_date` | STRING | Raw date string as found in the source |
| `tags` | ARRAY\<STRING\> | Blog tags, RSS categories, or `["release-notes", "azure"]` |
| `source` | STRING | One of: `databricks_blog`, `databricks_aws_rss`, `azure_release_notes` |
| `body` | STRING | Full text content |
| `content_hash` | STRING | SHA-256 of URL + first 500 chars of body — used in Silver MERGE |
| `scrape_ts` | STRING | ISO 8601 UTC timestamp of this scrape run |
| `is_processed` | BOOLEAN | `false` on write; Silver layer flips to `true` after processing |

---

## One-time Bronze table setup

Run this once in a setup cell or separate notebook before the first pipeline run:

```sql
CREATE CATALOG IF NOT EXISTS catalog;
CREATE SCHEMA  IF NOT EXISTS catalog.bronze;

CREATE TABLE IF NOT EXISTS catalog.bronze.blog_raw (
  title         STRING,
  url           STRING,
  publish_date  STRING,
  tags          ARRAY<STRING>,
  source        STRING,
  body          STRING,
  content_hash  STRING,
  scrape_ts     STRING,
  is_processed  BOOLEAN
)
USING DELTA
COMMENT 'Raw scraped content — Databricks Blog, AWS RSS feed, Azure Release Notes'
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact'   = 'true'
);
```

---

## Early-exit guard (prevent duplicate runs)

Add this block at the top of Cell 1, after defining `SCRAPE_TS` and `BRONZE_TABLE`,
to skip re-execution if today's data is already in Bronze:

```python
from pyspark.sql.functions import col, to_date, lit, current_date

try:
    already_ran = (
        spark.table(BRONZE_TABLE)
        .filter(to_date(col("scrape_ts")) == current_date())
        .limit(1)
        .count() > 0
    )
    if already_ran:
        print("Bronze already populated for today — exiting.")
        dbutils.notebook.exit("SKIPPED")
except Exception:
    pass  # Table doesn't exist yet on first run — continue
```

---

## Source-specific notes

### Databricks Blog
- Gatsby-rendered HTML. CSS selectors may break when Databricks deploys a site update.
- Monitor by asserting `len(blog_posts) > 0` after Cell 2. If it fires, inspect the live DOM.
- Pagination uses `?page=N` starting from 0. Set `max_pages=5` initially; increase if you want
  deeper history.

### AWS Docs RSS Feed (`feed.xml`)
- Most reliable source — XML feeds are stable and well-formed.
- `feedparser` handles all RSS/Atom variants and malformed XML gracefully.
- Entries in the feed are already the most recent updates — no pagination needed.
- The feed may not cover all documentation sections; it reflects the AWS docs changelog.

### Azure Release Notes
- URL pattern changes by month: `.../release-notes/product/{YYYY}/{month}`.
- Cell 1 auto-generates the current month's URL. For backfill, change `_now` to a fixed date.
- Page returns HTTP 404 before the month's first entry is published — handled gracefully in Cell 4.
- The page structure (H2 → bold date → paragraph) has been consistent for 12+ months and is
  unlikely to change without a major docs redesign.

---

## Error handling checklist

- Wrap every `requests.get()` in try/except — log failures to `catalog.bronze.scrape_errors`.
- Assert `len(all_records) > 0` before the Bronze write to catch silent zero-record runs.
- If blog scraping returns 0 posts on page 0, raise an alert (send to Slack/email) — site
  structure has changed.
- The Azure page returning 404 is expected at the start of a new month. Log a warning, not an error.

---

## Next step

Proceed to **Step 2 — Silver Layer: Deduplication and New Feature Detection**, where Bronze rows
with `is_processed = false` are merged into the Silver table using `content_hash` as the dedup
key, and rows from `azure_release_notes` and `databricks_aws_rss` sources are flagged
`is_new = true` for the ML layer.
