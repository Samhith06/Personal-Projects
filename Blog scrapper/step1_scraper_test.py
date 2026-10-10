"""
Databricks Release Notes — Scraper (GCP + AWS + Azure)
=======================================================
Two scraping modes:

1. RSS Feed  : scrape_feed()  — fetches items from the XML feed
2. HTML Page : scrape_page_sections() — fetches a release-notes HTML page,
               extracts each section heading + every link inside that section

Run:
    python step1_scraper_test.py
"""

import re
import sys
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from urllib.parse import urljoin
import xml.etree.ElementTree as ET

sys.stdout.reconfigure(encoding="utf-8")

# ── Config ─────────────────────────────────────────────────────────────────────

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
}

GCP_FEED_URL = "https://docs.databricks.com/gcp/en/feed.xml"
AWS_FEED_URL = "https://docs.databricks.com/aws/en/feed.xml"

TEST_LIMIT = 5

_DATE_RE = re.compile(
    r"^(January|February|March|April|May|June|July|August|September|October|November|December)"
    r"\s+\d{1,2},\s+\d{4}$"
)

_now = datetime.now(timezone.utc)


# ── Scraper ────────────────────────────────────────────────────────────────────

def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    return soup.get_text(separator=" ", strip=True)


def extract_links(html: str) -> list[str]:
    soup = BeautifulSoup(html, "lxml")
    return [a["href"] for a in soup.find_all("a", href=True)]


def scrape_feed(url: str, source: str = "feed", latest_only: bool = False) -> list[dict]:
    """
    Parses a Databricks RSS feed and returns one dict per <item>.
    When latest_only=True, returns only items from the most recent date in the feed.
    Each dict has keys: source, title, url, date, category, summary, doc_links
    """
    resp = requests.get(url, headers=HEADERS, timeout=20)
    resp.raise_for_status()

    root = ET.fromstring(resp.content)
    channel = root.find("channel")
    if channel is None:
        print("  [WARNING] No <channel> element found in feed.")
        return []

    records = []
    for item in channel.findall("item"):
        title_el = item.find("title")
        link_el  = item.find("link")
        date_el  = item.find("pubDate")
        desc_el  = item.find("description")

        title    = title_el.text.strip()  if title_el  is not None else "N/A"
        link     = link_el.text.strip()   if link_el   is not None else url
        pub_date = date_el.text.strip()   if date_el   is not None else "N/A"
        raw_desc = desc_el.text or ""     if desc_el   is not None else ""

        try:
            dt = datetime.strptime(pub_date, "%a, %d %b %Y %H:%M:%S %Z")
            friendly_date = dt.strftime("%B %d, %Y")
        except ValueError:
            dt = None
            friendly_date = pub_date

        summary   = html_to_text(raw_desc)[:300]
        doc_links = extract_links(raw_desc)

        records.append({
            "source":    source,
            "title":     title,
            "url":       link,
            "date":      friendly_date,
            "_dt":       dt,
            "category":  "release-notes",
            "summary":   summary,
            "doc_links": doc_links,
        })

    if latest_only and records:
        dated = [r for r in records if r["_dt"] is not None]
        if dated:
            max_date = max(r["_dt"].date() for r in dated)
            records = [r for r in records if r["_dt"] is not None and r["_dt"].date() == max_date]

    for r in records:
        del r["_dt"]

    return records


# ── HTML Page Scraper ──────────────────────────────────────────────────────────

AZURE_PAGE_URL = "https://learn.microsoft.com/en-in/azure/databricks/release-notes/product/2026/june"

def scrape_page_sections(url: str, latest_only: bool = False) -> list[dict]:
    """
    Fetches a release-notes HTML page and returns one dict per section heading.
    Each dict has: title, title_id, date, links.
    When latest_only=True, returns only sections from the most recent date on the page.
    """
    resp = requests.get(url, headers=HEADERS, timeout=20)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "lxml")
    body = soup.find("main") or soup.find("article") or soup.body

    sections = []
    current_heading = None
    current_date = ""
    current_links: list[dict] = []

    def flush():
        if current_heading is not None:
            sections.append({
                "title":    current_heading["text"],
                "title_id": current_heading["id"],
                "date":     current_date,
                "links":    current_links[:],
            })

    for tag in body.descendants:
        if tag.name in ("h1", "h2", "h3", "h4"):
            flush()
            current_links = []
            current_date = ""
            current_heading = {
                "text": tag.get_text(strip=True),
                "id":   tag.get("id", ""),
            }
        elif tag.name == "strong" and current_heading is not None and not current_date:
            text = tag.get_text(strip=True)
            if _DATE_RE.match(text):
                current_date = text
        elif tag.name == "a" and current_heading is not None:
            href = tag.get("href", "").strip()
            text = tag.get_text(strip=True)
            if href and not href.startswith("#") and text:
                if not href.startswith("http"):
                    href = urljoin(url, href)
                current_links.append({"text": text, "href": href})

    flush()

    if latest_only and sections:
        dated = [s for s in sections if s["date"]]
        if dated:
            def _parse(s):
                try:
                    return datetime.strptime(s["date"], "%B %d, %Y")
                except ValueError:
                    return datetime.min
            max_date = max(_parse(s).date() for s in dated)
            sections = [s for s in sections if _parse(s).date() == max_date]

    return sections


def print_page_sections(sections: list[dict], label: str = "", limit: int = None) -> None:
    bar = "=" * 60
    showing = len(sections) if limit is None else min(limit, len(sections))
    print(f"\n{bar}")
    print(f"  SOURCE — {label or 'HTML Page'}")
    print(f"  Total sections: {len(sections)}  |  Showing: {showing}")
    print(bar)

    for sec in sections[:showing]:
        print(f"\n  TITLE : {sec['title']}")
        if sec.get("date"):
            print(f"  DATE  : {sec['date']}")
        if sec["title_id"]:
            print(f"  ID    : #{sec['title_id']}")
        if sec["links"]:
            for lnk in sec["links"]:
                print(f"    -> [{lnk['text']}]  {lnk['href']}")
        else:
            print("    (no links in this section)")


# ── Databricks Blog Scraper ────────────────────────────────────────────────────

BLOG_URL = (
    "https://www.databricks.com/blog?categories="
    "public-sector,marketing,manufacturing,telecommunications,tech,"
    "retail-and-consumer-goods,media-and-entertainment,healthcare-and-life-sciences,"
    "financial-services,energy,solutions,security-and-trust,partners,product,"
    "cybersecurity,announcements,open-source,data-science-machine-learning,"
    "data-warehousing,tutorials,solution-accelerators,data-streaming,"
    "data-engineering,ai-engineering,industry-insights,data-leader,"
    "best-practices,events,culture,customers,news"
)


def _category_from(tag) -> str:
    span = next((s for s in tag.find_all("span") if "text-blog-orange" in s.get("class", [])), None)
    return span.get_text(strip=True) if span else ""


def _parse_blog_page(soup: BeautifulSoup, base: str) -> list[dict]:
    posts = []

    # Featured article (the large hero card at the top)
    article = soup.find("article")
    if article:
        a = article.find("a", href=True)
        time_el = article.find("time")
        h_el = article.find(["h1", "h2", "h3"])
        if a and h_el:
            posts.append({
                "source":   "Databricks Blog",
                "title":    h_el.get_text(strip=True),
                "url":      urljoin(base, a["href"]),
                "date":     time_el.get_text(strip=True) if time_el else "",
                "category": _category_from(article),
            })

    # Regular list cards: each <h3> lives inside an <a> with href=/blog/...
    for h3 in soup.find_all("h3"):
        a = h3.find_parent("a", href=True)
        if not a or not a["href"].startswith("/blog/"):
            continue
        time_el = a.find("time")
        posts.append({
            "source":   "Databricks Blog",
            "title":    h3.get_text(strip=True),
            "url":      urljoin(base, a["href"]),
            "date":     time_el.get_text(strip=True) if time_el else "",
            "category": _category_from(a),
        })

    return posts


def scrape_blog(url: str, latest_only: bool = False) -> list[dict]:
    """
    Scrapes the Databricks blog listing page (and subsequent pages) and returns
    one dict per post with keys: source, title, url, date, category.
    When latest_only=True, returns only posts from the most recent date.
    """
    base = "https://www.databricks.com"
    all_posts: list[dict] = []
    page = 1

    while True:
        paged_url = url if page == 1 else f"{url}&page={page}"
        resp = requests.get(paged_url, headers=HEADERS, timeout=20)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")
        posts = _parse_blog_page(soup, base)
        if not posts:
            break

        all_posts.extend(posts)

        # Stop paginating once we exceed 5 pages (safety cap)
        if page >= 5:
            break
        page += 1

    # Deduplicate by URL
    seen = set()
    unique = []
    for p in all_posts:
        if p["url"] not in seen:
            seen.add(p["url"])
            unique.append(p)

    if latest_only and unique:
        def _parse_date(s):
            try:
                return datetime.strptime(s["date"], "%B %d, %Y")
            except ValueError:
                return datetime.min
        dated = [p for p in unique if p["date"]]
        if dated:
            max_date = max(_parse_date(p).date() for p in dated)
            unique = [p for p in unique if _parse_date(p).date() == max_date]

    return unique


def print_blog_posts(posts: list[dict]) -> None:
    bar = "=" * 60
    print(f"\n{bar}")
    print(f"  SOURCE — Databricks Blog")
    print(f"  Total posts: {len(posts)}")
    print(bar)
    for i, p in enumerate(posts, 1):
        print(f"\n  [{i}]")
        print(f"  Title    : {p['title']}")
        print(f"  Date     : {p['date']}")
        print(f"  Category : {p['category']}")
        print(f"  URL      : {p['url']}")
    status = "[PASS]" if posts else "[FAIL]"
    print(f"\n  Status: {status}")


# ── Pretty Printer ─────────────────────────────────────────────────────────────

def print_results(records: list[dict], limit: int) -> None:
    bar = "=" * 60
    showing = min(limit, len(records))
    source_label = records[0]["source"].upper() if records else "UNKNOWN"
    print(f"\n{bar}")
    print(f"  SOURCE — {source_label}")
    print(f"  Total fetched: {len(records)}  |  Showing first {showing}")
    print(bar)

    if not records:
        print("  [!] No records returned — feed may be empty or unreachable.")
        return

    for i, r in enumerate(records[:limit], 1):
        print(f"\n  [{i}]")
        print(f"  Title    : {r['title']}")
        print(f"  Date     : {r['date']}")
        print(f"  Category : {r['category']}")
        print(f"  URL      : {r['url']}")
        if r.get("summary"):
            print(f"  Summary  : {r['summary'][:150]}...")
        if r.get("doc_links"):
            for lnk in r["doc_links"]:
                print(f"  Doc Link : {lnk}")

    status = "[PASS]" if records else "[FAIL]"
    print(f"\n  Status: {status}")


# ── Main ───────────────────────────────────────────────────────────────────────

def run_test() -> None:
    print("=" * 60)
    print("  Databricks Release Notes Scraper — Test Run")
    print(f"  Time  : {_now.strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 60)

    # ── Part 1: GCP RSS feed ───────────────────────────────────────────────────
    print(f"\n  [RSS-GCP]  {GCP_FEED_URL}")
    try:
        gcp_records = scrape_feed(GCP_FEED_URL, source="GCP Feed", latest_only=True)
        print_results(gcp_records, TEST_LIMIT)
    except Exception as e:
        print(f"  [ERROR] GCP feed scrape failed: {e}")
        gcp_records = []

    # ── Part 2: AWS RSS feed ───────────────────────────────────────────────────
    print(f"\n  [RSS-AWS]  {AWS_FEED_URL}")
    try:
        aws_records = scrape_feed(AWS_FEED_URL, source="AWS Feed", latest_only=True)
        print_results(aws_records, TEST_LIMIT)
    except Exception as e:
        print(f"  [ERROR] AWS feed scrape failed: {e}")
        aws_records = []

    # ── Part 3: Databricks Blog ───────────────────────────────────────────────
    print(f"\n  [BLOG] {BLOG_URL[:60]}...")
    try:
        blog_posts = scrape_blog(BLOG_URL, latest_only=True)
        print_blog_posts(blog_posts)
    except Exception as e:
        print(f"  [ERROR] Blog scrape failed: {e}")
        blog_posts = []

    # ── Part 4: Azure HTML page — titles + links ──────────────────────────────
    print(f"\n  [PAGE-AZURE] {AZURE_PAGE_URL}")
    try:
        azure_sections = scrape_page_sections(AZURE_PAGE_URL, latest_only=True)
        print_page_sections(azure_sections, label="Azure Release Notes Page")
    except Exception as e:
        print(f"  [ERROR] Azure page scrape failed: {e}")
        azure_sections = []

    print("\n" + "=" * 60)
    print("  FINAL REPORT")
    print("=" * 60)
    print(f"  GCP feed records   : {len(gcp_records)}")
    print(f"  AWS feed records   : {len(aws_records)}")
    print(f"  Blog posts         : {len(blog_posts)}")
    print(f"  Azure page sections: {len(azure_sections)}")
    all_ok = gcp_records or aws_records or blog_posts or azure_sections
    print(f"  Status             : {'PASS' if all_ok else 'FAIL'}")
    print("=" * 60)


if __name__ == "__main__":
    run_test()
