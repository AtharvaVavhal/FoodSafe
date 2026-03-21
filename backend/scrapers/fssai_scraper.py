"""
scrapers/fssai_scraper.py

Multi-source food safety violation scraper.

Sources:
  1. FSSAI official alerts page
  2. FSSAI food recall notices
  3. Food safety news — Times of India, NDTV Food, Down To Earth
  4. CSE (Centre for Science and Environment) food reports

Each raw article/alert is parsed by the LLM (extract_fssai_violation)
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
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-IN,en;q=0.9",
}

TIMEOUT = 20


# ── Utilities ─────────────────────────────────────────────────────────────────

def _text_hash(text: str) -> str:
    """Stable dedup key for raw scraped text."""
    return hashlib.md5(text.strip().lower().encode()).hexdigest()[:16]


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


# ── Source 1: FSSAI Official Alerts ──────────────────────────────────────────

async def _scrape_fssai_alerts(client: httpx.AsyncClient) -> list[dict]:
    """Scrape FSSAI food safety alerts page."""
    results = []
    urls = [
        "https://fssai.gov.in/cms/food-safety-alerts.php",
        "https://fssai.gov.in/cms/recall-orders.php",
    ]
    for url in urls:
        try:
            r = await client.get(url, headers=HEADERS, timeout=TIMEOUT)
            if r.status_code != 200:
                logger.warning("FSSAI alerts: HTTP %s for %s", r.status_code, url)
                continue

            soup = BeautifulSoup(r.text, "html.parser")

            # Try multiple selectors — FSSAI changes their layout
            rows = (
                soup.select("table.table tr")
                or soup.select("table tr")
                or soup.select(".alert-row")
                or soup.select("li.news-item")
            )

            for row in rows[1:]:  # skip header row
                cols = row.find_all("td")
                text = " ".join(c.get_text(strip=True) for c in cols) if cols else row.get_text(strip=True)
                if len(text) < 20:
                    continue

                link = row.find("a", href=True)
                href = link["href"] if link else url
                if href and not href.startswith("http"):
                    href = "https://fssai.gov.in" + href

                results.append({
                    "raw_text":   text,
                    "source_url": href,
                    "source":     "fssai_official",
                    "scraped_at": datetime.utcnow().isoformat(),
                    "dedup_key":  _text_hash(text),
                })

            logger.info("FSSAI alerts: scraped %d items from %s", len(results), url)

        except Exception as e:
            logger.error("FSSAI alerts scrape failed for %s: %s", url, e)

    return results


# ── Source 2: NDTV Food Safety News ──────────────────────────────────────────

async def _scrape_ndtv_food(client: httpx.AsyncClient) -> list[dict]:
    """Scrape NDTV food safety and adulteration news."""
    results = []
    search_urls = [
        "https://food.ndtv.com/food-drinks/food-safety",
        "https://www.ndtv.com/search?searchtext=food+adulteration+fssai",
    ]
    for url in search_urls:
        try:
            r = await client.get(url, headers=HEADERS, timeout=TIMEOUT)
            if r.status_code != 200:
                continue

            soup = BeautifulSoup(r.text, "html.parser")

            # NDTV article cards
            articles = (
                soup.select("div.news_Itm")
                or soup.select("div.src_lst-txt")
                or soup.select("article")
                or soup.select(".story-card")
            )

            for article in articles[:20]:
                title = article.find(["h2", "h3", "h4"])
                title_text = title.get_text(strip=True) if title else ""

                # Only process food safety relevant articles
                keywords = ["adulter", "fssai", "food safety", "contamina",
                            "poison", "fake", "spurious", "substandard"]
                if not any(k in title_text.lower() for k in keywords):
                    continue

                link = article.find("a", href=True)
                href = link["href"] if link else url
                if href and not href.startswith("http"):
                    href = "https://www.ndtv.com" + href

                summary = article.find(["p", "div"], class_=re.compile("desc|summary|snippet"))
                body = summary.get_text(strip=True) if summary else ""
                raw = f"{title_text}. {body}".strip()

                if len(raw) < 30:
                    continue

                results.append({
                    "raw_text":   raw,
                    "source_url": href,
                    "source":     "ndtv_food",
                    "scraped_at": datetime.utcnow().isoformat(),
                    "dedup_key":  _text_hash(raw),
                })

            logger.info("NDTV food: scraped %d relevant items", len(results))

        except Exception as e:
            logger.error("NDTV scrape failed: %s", e)

    return results


# ── Source 3: Times of India Food Safety ─────────────────────────────────────

async def _scrape_toi(client: httpx.AsyncClient) -> list[dict]:
    """Scrape TOI food adulteration articles."""
    results = []
    urls = [
        "https://timesofindia.indiatimes.com/topic/food-adulteration",
        "https://timesofindia.indiatimes.com/topic/fssai",
    ]
    for url in urls:
        try:
            r = await client.get(url, headers=HEADERS, timeout=TIMEOUT)
            if r.status_code != 200:
                continue

            soup = BeautifulSoup(r.text, "html.parser")

            articles = (
                soup.select("div.uwU81")           # TOI topic page cards
                or soup.select("li.clearfix")
                or soup.select("div.article-list li")
            )

            for article in articles[:20]:
                title_el = article.find(["a", "h3", "span"])
                title_text = title_el.get_text(strip=True) if title_el else ""

                keywords = ["adulter", "fssai", "food safety", "contamina",
                            "poison", "spurious", "substandard", "recall"]
                if not any(k in title_text.lower() for k in keywords):
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

        except Exception as e:
            logger.error("TOI scrape failed: %s", e)

    logger.info("TOI: scraped %d relevant items", len(results))
    return results


# ── Source 4: Down To Earth ───────────────────────────────────────────────────

async def _scrape_dte(client: httpx.AsyncClient) -> list[dict]:
    """Scrape Down To Earth food safety articles."""
    results = []
    urls = [
        "https://www.downtoearth.org.in/category/food",
        "https://www.downtoearth.org.in/tag/food-adulteration",
    ]
    for url in urls:
        try:
            r = await client.get(url, headers=HEADERS, timeout=TIMEOUT)
            if r.status_code != 200:
                continue

            soup = BeautifulSoup(r.text, "html.parser")
            articles = soup.select("div.story-box") or soup.select("article") or soup.select(".list-item")

            for article in articles[:15]:
                title = article.find(["h2", "h3", "a"])
                title_text = title.get_text(strip=True) if title else ""

                keywords = ["adulter", "fssai", "food safety", "contamina",
                            "pesticide", "toxin", "poison", "spurious"]
                if not any(k in title_text.lower() for k in keywords):
                    continue

                link = article.find("a", href=True)
                href = link["href"] if link else url
                if href and not href.startswith("http"):
                    href = "https://www.downtoearth.org.in" + href

                desc = article.find("p")
                body = desc.get_text(strip=True) if desc else ""
                raw = f"{title_text}. {body}".strip()

                results.append({
                    "raw_text":   raw,
                    "source_url": href,
                    "source":     "down_to_earth",
                    "scraped_at": datetime.utcnow().isoformat(),
                    "dedup_key":  _text_hash(raw),
                })

        except Exception as e:
            logger.error("DTE scrape failed: %s", e)

    logger.info("Down To Earth: scraped %d relevant items", len(results))
    return results


# ── Source 5: CSE Food Reports ────────────────────────────────────────────────

async def _scrape_cse(client: httpx.AsyncClient) -> list[dict]:
    """Scrape CSE India food safety reports."""
    results = []
    urls = [
        "https://www.cseindia.org/category/food-safety",
        "https://www.cseindia.org/tag/adulteration",
    ]
    for url in urls:
        try:
            r = await client.get(url, headers=HEADERS, timeout=TIMEOUT)
            if r.status_code != 200:
                continue

            soup = BeautifulSoup(r.text, "html.parser")
            articles = soup.select("div.views-row") or soup.select("article") or soup.select(".card")

            for article in articles[:10]:
                title = article.find(["h2", "h3"])
                title_text = title.get_text(strip=True) if title else ""
                if not title_text:
                    continue

                link = article.find("a", href=True)
                href = link["href"] if link else url
                if href and not href.startswith("http"):
                    href = "https://www.cseindia.org" + href

                body = article.find("p")
                body_text = body.get_text(strip=True) if body else ""
                raw = f"{title_text}. {body_text}".strip()

                results.append({
                    "raw_text":   raw,
                    "source_url": href,
                    "source":     "cse_india",
                    "scraped_at": datetime.utcnow().isoformat(),
                    "dedup_key":  _text_hash(raw),
                })

        except Exception as e:
            logger.error("CSE scrape failed: %s", e)

    logger.info("CSE: scraped %d items", len(results))
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
            _scrape_fssai_alerts,
            _scrape_ndtv_food,
            _scrape_toi,
            _scrape_dte,
            _scrape_cse,
        ]:
            try:
                items = await scraper_fn(client)
                for item in items:
                    key = item.get("dedup_key", _text_hash(item["raw_text"]))
                    if key not in seen_keys:
                        seen_keys.add(key)
                        results.append(item)
            except Exception as e:
                logger.error("Scraper %s failed: %s", scraper_fn.__name__, e)

    logger.info("Total raw items scraped (deduplicated): %d", len(results))
    return results


# ── Legacy alias — keeps existing Celery task working ─────────────────────────
async def scrape_fssai_alerts() -> list[dict]:
    return await scrape_all_sources()
