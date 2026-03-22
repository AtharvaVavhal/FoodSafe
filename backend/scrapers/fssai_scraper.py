"""
scrapers/fssai_scraper.py

Multi-source food safety violation scraper.

Sources (as of 2026 — JS-rendered sites dropped, RSS-first approach):
  1. Google News RSS — FSSAI adulteration queries (100 items per query)
  2. Google News RSS — food recall India
  3. Google News RSS — spurious food India
  4. Google News RSS — food poisoning India
  5. Times of India topic pages (HTML scraping works)
  6. PIB (Press Information Bureau) — government press releases

Each raw article is parsed by the LLM (extract_fssai_violation)
into structured { brand, product, violation, state, date } records.

Run manually:
    python scripts/run_scraper.py

Or runs automatically via Celery beat every Monday 6am IST.
"""

from __future__ import annotations

import hashlib
import logging
import re
from datetime import datetime
from typing import Optional

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
}

TIMEOUT = 25

# Keywords that indicate a food safety relevant article
FOOD_SAFETY_KEYWORDS = [
    "adulter", "fssai", "food safety", "contamina", "poison",
    "fake", "spurious", "substandard", "recall", "food fraud",
    "pesticide", "toxic", "banned", "unsafe food", "food quality",
    "food testing", "food sample", "food violation", "adulterated",
]


# ── Utilities ─────────────────────────────────────────────────────────────────

def _text_hash(text: str) -> str:
    """Stable dedup key for raw scraped text."""
    return hashlib.md5(text.strip().lower().encode()).hexdigest()[:16]


def _is_relevant(text: str) -> bool:
    """Check if text is food safety relevant."""
    text_lower = text.lower()
    return any(kw in text_lower for kw in FOOD_SAFETY_KEYWORDS)


def parse_date(text: str) -> Optional[datetime]:
    """Try to extract a date from raw text."""
    patterns = [
        r"\d{2}[/-]\d{2}[/-]\d{4}",
        r"\d{4}-\d{2}-\d{2}",
        r"\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            raw = m.group()
            for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d %B %Y", "%d %b %Y"):
                try:
                    return datetime.strptime(raw, fmt)
                except ValueError:
                    continue
    return None


# ── Source 1: Google News RSS ─────────────────────────────────────────────────

async def _scrape_google_news_rss(client: httpx.AsyncClient) -> list[dict]:
    """
    Scrape Google News RSS feeds for food safety news.
    Returns up to 400 items across 4 different queries.
    Google News RSS is public, reliable, and always returns XML.
    """
    results = []
    queries = [
        ("FSSAI+food+adulteration+India", "gnews_fssai"),
        ("food+recall+India+FSSAI+2025+2026", "gnews_recall"),
        ("spurious+adulterated+food+India", "gnews_spurious"),
        ("food+poisoning+contamination+India", "gnews_poisoning"),
        ("food+safety+violation+India+FSSAI", "gnews_violation"),
    ]

    for query, source_tag in queries:
        url = (
            f"https://news.google.com/rss/search"
            f"?q={query}&hl=en-IN&gl=IN&ceid=IN:en"
        )
        try:
            r = await client.get(url, headers=HEADERS, timeout=TIMEOUT)
            if r.status_code != 200:
                logger.warning("Google News RSS %s: HTTP %s", source_tag, r.status_code)
                continue

            soup = BeautifulSoup(r.text, "xml")
            items = soup.find_all("item")
            logger.info("Google News RSS %s: %d raw items", source_tag, len(items))

            for item in items:
                title_el   = item.find("title")
                link_el    = item.find("link")
                desc_el    = item.find("description")
                pubdate_el = item.find("pubDate")
                source_el  = item.find("source")

                title = title_el.text.strip() if title_el else ""
                # Google News RSS links are redirect URLs — use source URL if available
                link  = source_el.get("url", "") if source_el else ""
                if not link and link_el:
                    link = link_el.text.strip() if link_el.text else (
                        link_el.next_sibling.strip() if link_el.next_sibling else ""
                    )

                desc  = desc_el.text.strip() if desc_el else ""
                # Strip HTML tags from description
                desc  = BeautifulSoup(desc, "html.parser").get_text(strip=True)

                pub_date = pubdate_el.text.strip() if pubdate_el else ""
                source_name = source_el.text.strip() if source_el else ""

                raw = f"{title}. {desc}".strip(". ").strip()
                if len(raw) < 20:
                    continue

                results.append({
                    "raw_text":   f"{raw} [Source: {source_name}] [{pub_date}]",
                    "source_url": link or url,
                    "source":     source_tag,
                    "scraped_at": datetime.utcnow().isoformat(),
                    "dedup_key":  _text_hash(title),  # dedup on title
                })

        except Exception as e:
            logger.error("Google News RSS %s failed: %s", source_tag, e)

    logger.info("Google News RSS: total %d items across all queries", len(results))
    return results


# ── Source 2: Times of India ──────────────────────────────────────────────────

async def _scrape_toi(client: httpx.AsyncClient) -> list[dict]:
    """Scrape TOI food adulteration topic pages."""
    results = []
    urls = [
        "https://timesofindia.indiatimes.com/topic/food-adulteration",
        "https://timesofindia.indiatimes.com/topic/fssai",
        "https://timesofindia.indiatimes.com/topic/food-safety",
    ]
    for url in urls:
        try:
            r = await client.get(url, headers=HEADERS, timeout=TIMEOUT)
            if r.status_code != 200:
                logger.warning("TOI: HTTP %s for %s", r.status_code, url)
                continue

            soup = BeautifulSoup(r.text, "html.parser")

            # TOI topic page — article cards
            articles = (
                soup.select("div.uwU81")
                or soup.select("li.clearfix")
                or soup.select("div.article-list li")
                or soup.select("div.content")
            )

            count = 0
            for article in articles[:25]:
                title_el = article.find(["a", "h3", "span"])
                title_text = title_el.get_text(strip=True) if title_el else ""
                if not title_text or not _is_relevant(title_text):
                    continue

                link = article.find("a", href=True)
                href = link["href"] if link else url
                if href and not href.startswith("http"):
                    href = "https://timesofindia.indiatimes.com" + href

                results.append({
                    "raw_text":   title_text,
                    "source_url": href,
                    "source":     "times_of_india",
                    "scraped_at": datetime.utcnow().isoformat(),
                    "dedup_key":  _text_hash(title_text),
                })
                count += 1

            logger.info("TOI: %d relevant items from %s", count, url)

        except Exception as e:
            logger.error("TOI scrape failed for %s: %s", url, e)

    return results


# ── Source 3: PIB (Press Information Bureau) ──────────────────────────────────

async def _scrape_pib(client: httpx.AsyncClient) -> list[dict]:
    """
    Scrape PIB RSS feed for FSSAI and food safety government press releases.
    PIB is the official Indian government press release portal.
    """
    results = []
    urls = [
        "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3",
        "https://pib.gov.in/RssMain.aspx?ModId=18&Lang=1&Regid=3",
    ]
    for url in urls:
        try:
            r = await client.get(url, headers=HEADERS, timeout=TIMEOUT)
            if r.status_code != 200:
                continue

            soup = BeautifulSoup(r.text, "xml")
            items = soup.find_all("item")

            for item in items:
                title_el = item.find("title")
                link_el  = item.find("link")
                desc_el  = item.find("description")

                title = title_el.text.strip() if title_el else ""
                desc  = desc_el.text.strip() if desc_el else ""
                desc  = BeautifulSoup(desc, "html.parser").get_text(strip=True)

                raw = f"{title}. {desc}".strip()
                if not _is_relevant(raw) or len(raw) < 30:
                    continue

                link = ""
                if link_el:
                    link = link_el.text.strip() if link_el.text else ""
                    if not link and link_el.next_sibling:
                        link = str(link_el.next_sibling).strip()

                results.append({
                    "raw_text":   raw,
                    "source_url": link or url,
                    "source":     "pib_govt",
                    "scraped_at": datetime.utcnow().isoformat(),
                    "dedup_key":  _text_hash(title),
                })

            logger.info("PIB: %d relevant items from %s", len(results), url)

        except Exception as e:
            logger.error("PIB scrape failed: %s", e)

    return results


# ── Source 4: FSSAI official page ─────────────────────────────────────────────

async def _scrape_fssai_official(client: httpx.AsyncClient) -> list[dict]:
    """
    Scrape FSSAI official alerts and press release pages.
    These are server-rendered PHP pages so BeautifulSoup works.
    """
    results = []
    urls = [
        ("https://fssai.gov.in/cms/food-safety-alerts.php",  "fssai_official"),
        ("https://fssai.gov.in/cms/press-release.php",       "fssai_press"),
        ("https://fssai.gov.in/cms/recall-orders.php",       "fssai_official"),
    ]
    for url, source_tag in urls:
        try:
            r = await client.get(url, headers=HEADERS, timeout=TIMEOUT)
            if r.status_code != 200:
                logger.warning("FSSAI: HTTP %s for %s", r.status_code, url)
                continue

            soup = BeautifulSoup(r.text, "html.parser")

            # Try every meaningful selector
            items = (
                soup.select("table.table tbody tr")
                or soup.select("table tbody tr")
                or soup.select("table tr")
                or soup.select("li.list-group-item")
                or soup.select("div.panel-body p")
                or soup.select("div.col-md-9 p")
                or soup.select("div.content-area a")
                or soup.select("td a")
            )

            count = 0
            for el in items[:30]:
                text = el.get_text(separator=" ", strip=True)
                if len(text) < 20:
                    continue

                link = el.find("a", href=True) if el.name != "a" else el
                href = ""
                if link and link.get("href"):
                    href = link["href"]
                    if not href.startswith("http"):
                        href = "https://fssai.gov.in" + href

                results.append({
                    "raw_text":   text,
                    "source_url": href or url,
                    "source":     source_tag,
                    "scraped_at": datetime.utcnow().isoformat(),
                    "dedup_key":  _text_hash(text),
                })
                count += 1

            logger.info("FSSAI %s: %d items from %s", source_tag, count, url)

        except Exception as e:
            logger.error("FSSAI scrape failed for %s: %s", url, e)

    return results


# ── Main entry point ──────────────────────────────────────────────────────────

async def scrape_all_sources() -> list[dict]:
    """
    Scrape all sources and return deduplicated raw articles.
    Each item has: raw_text, source_url, source, scraped_at, dedup_key
    """
    async with httpx.AsyncClient(follow_redirects=True) as client:
        results = []
        seen_keys: set[str] = set()

        for scraper_fn in [
            _scrape_google_news_rss,   # ← best source: 100+ items, always works
            _scrape_toi,               # ← confirmed working
            _scrape_pib,               # ← government press releases
            _scrape_fssai_official,    # ← official FSSAI alerts
        ]:
            try:
                items = await scraper_fn(client)
                new = 0
                for item in items:
                    key = item.get("dedup_key", _text_hash(item["raw_text"]))
                    if key not in seen_keys:
                        seen_keys.add(key)
                        results.append(item)
                        new += 1
                logger.info("%s: added %d new items", scraper_fn.__name__, new)
            except Exception as e:
                logger.error("Scraper %s failed: %s", scraper_fn.__name__, e)

    logger.info("Total raw items scraped (deduplicated): %d", len(results))
    return results


# ── Legacy alias ──────────────────────────────────────────────────────────────
async def scrape_fssai_alerts() -> list[dict]:
    return await scrape_all_sources()