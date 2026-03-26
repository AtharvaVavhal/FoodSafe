"""
Real-time food safety news endpoint.
Sources: Google News RSS, FSSAI portal, The Hindu RSS, NDTV RSS, Times of India RSS.
Groq enriches every scraped article (summary, severity, category).
Groq generates fresh news if all scraping fails.
Cache TTL: 30 minutes.
"""
import time
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter
from services.ai_service import _call_groq

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Cache ──────────────────────────────────────────────────────────────────
_cache: dict = {"data": None, "ts": 0}
CACHE_TTL = 1800  # 30 minutes


# ── RSS / HTML sources ─────────────────────────────────────────────────────
RSS_SOURCES = [
    {
        "url": "https://news.google.com/rss/search?q=food+adulteration+India+FSSAI&hl=en-IN&gl=IN&ceid=IN:en",
        "name": "Google News",
    },
    {
        "url": "https://news.google.com/rss/search?q=food+safety+India+recall+contamination&hl=en-IN&gl=IN&ceid=IN:en",
        "name": "Google News",
    },
    {
        "url": "https://feeds.feedburner.com/ndtvnews-india-news",
        "name": "NDTV",
    },
    {
        "url": "https://www.thehindu.com/sci-tech/health/feeder/default.rss",
        "name": "The Hindu",
    },
    {
        "url": "https://timesofindia.indiatimes.com/rssfeeds/1221656.cms",
        "name": "Times of India",
    },
]

FOOD_KEYWORDS = [
    "food", "fssai", "adulter", "safety", "contamin", "recall",
    "milk", "spice", "honey", "oil", "pesticide", "ban", "poison",
    "toxic", "paneer", "ghee", "atta", "flour", "packaged", "additive",
    "preservative", "color", "dye", "chemical", "eat", "drink", "consume",
    "vegetable", "fruit", "meat", "fish", "grain", "rice", "wheat",
]


async def _scrape_rss_sources() -> list[dict]:
    """Scrape all RSS sources and return raw articles."""
    import httpx
    from bs4 import BeautifulSoup

    raw = []
    headers = {"User-Agent": "FoodSafe-Research-Bot/1.0 (food safety aggregator)"}

    async with httpx.AsyncClient(follow_redirects=True, timeout=12) as client:
        for source in RSS_SOURCES:
            try:
                resp = await client.get(source["url"], headers=headers)
                if resp.status_code != 200:
                    continue

                soup = BeautifulSoup(resp.text, "xml")
                items = soup.find_all("item")[:12]

                for item in items:
                    title     = (item.find("title").text     if item.find("title")   else "").strip()
                    pub_date  = (item.find("pubDate").text   if item.find("pubDate") else "").strip()
                    link      = (item.find("link").text      if item.find("link")    else "").strip()
                    desc      = (item.find("description").text if item.find("description") else "").strip()
                    src_tag   = item.find("source")
                    src_name  = src_tag.text.strip() if src_tag else source["name"]

                    if not title:
                        continue

                    # Only keep food-related articles
                    combined = (title + " " + desc).lower()
                    if not any(kw in combined for kw in FOOD_KEYWORDS):
                        continue

                    # Parse date
                    date_clean = _parse_date(pub_date)

                    raw.append({
                        "title":      title[:250],
                        "raw_desc":   desc[:400],
                        "date":       date_clean,
                        "source":     src_name,
                        "source_url": link,
                    })

            except Exception as e:
                logger.warning("RSS scrape failed for %s: %s", source["name"], e)

    # ── FSSAI food recall portal ──────────────────────────────────────────
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=12) as client:
            resp = await client.get(
                "https://www.fssai.gov.in/cms/food-recall-portal.php",
                headers=headers,
            )
            if resp.status_code == 200:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(resp.text, "html.parser")

                # Try multiple table selectors
                rows = (
                    soup.select("table.table tr")[1:12]
                    or soup.select("table tr")[1:12]
                )
                for row in rows:
                    cols = row.find_all("td")
                    if len(cols) >= 2:
                        title    = cols[1].get_text(strip=True)[:250] if len(cols) > 1 else ""
                        date_str = cols[0].get_text(strip=True)       if len(cols) > 0 else ""
                        link_tag = row.find("a")
                        link     = link_tag["href"] if link_tag and link_tag.get("href") else "https://www.fssai.gov.in/cms/food-recall-portal.php"

                        if title:
                            raw.append({
                                "title":      title,
                                "raw_desc":   f"FSSAI official recall notice: {title}",
                                "date":       date_str or datetime.now().strftime("%d %b %Y"),
                                "source":     "FSSAI Food Recall Portal",
                                "source_url": link if link.startswith("http") else f"https://www.fssai.gov.in{link}",
                            })
    except Exception as e:
        logger.warning("FSSAI portal scrape failed: %s", e)

    # Deduplicate by title similarity
    seen_titles = set()
    deduped = []
    for a in raw:
        key = a["title"][:60].lower()
        if key not in seen_titles:
            seen_titles.add(key)
            deduped.append(a)

    return deduped


def _parse_date(pub_date: str) -> str:
    """Try multiple date formats and return clean DD Mon YYYY string."""
    formats = [
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S GMT",
        "%a, %d %b %Y %H:%M:%S +0000",
        "%Y-%m-%dT%H:%M:%S%z",
        "%d %b %Y",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(pub_date[:35].strip(), fmt)
            return dt.strftime("%d %b %Y")
        except Exception:
            continue
    return pub_date[:16] if pub_date else datetime.now().strftime("%d %b %Y")


def _groq_enrich_articles(raw_articles: list[dict]) -> list[dict]:
    """Use Groq to enrich scraped articles with severity, category, and summary."""
    if not raw_articles:
        return []

    # Send in batches of 8 to stay within token limits
    enriched = []
    batch_size = 8

    for i in range(0, len(raw_articles), batch_size):
        batch = raw_articles[i:i + batch_size]
        articles_json = [
            {"index": j, "title": a["title"], "desc": a.get("raw_desc", "")}
            for j, a in enumerate(batch)
        ]

        system = (
            "You are an Indian food safety expert and journalist. "
            "Respond ONLY with valid JSON. No markdown, no extra text."
        )
        user = f"""Analyze these food safety news articles from Indian sources and enrich each one.

Articles:
{articles_json}

For each article, determine:
1. A concise 2-sentence summary focused on the food safety angle
2. Severity: HIGH (toxic/carcinogenic/death/recall/ban), MEDIUM (warning/violation/fine/substandard), LOW (regulation/update/awareness)
3. Category: recall | warning | news | update
4. Whether it is actually relevant to Indian food safety (is_relevant: true/false)

Return ONLY this JSON:
{{
  "articles": [
    {{
      "index": <same index as input>,
      "summary": "<2-sentence food safety focused summary>",
      "severity": "HIGH|MEDIUM|LOW",
      "category": "recall|warning|news|update",
      "is_relevant": true
    }}
  ]
}}

Be strict about severity — HIGH only for genuinely dangerous situations with documented health risk."""

        try:
            result = _call_groq(system, user, max_tokens=2000)
            groq_items = {item["index"]: item for item in result.get("articles", [])}

            for j, article in enumerate(batch):
                groq_data = groq_items.get(j, {})
                if not groq_data.get("is_relevant", True):
                    continue
                enriched.append({
                    "title":      article["title"],
                    "summary":    groq_data.get("summary", article.get("raw_desc", "")[:200]),
                    "severity":   groq_data.get("severity", "MEDIUM"),
                    "category":   groq_data.get("category", "news"),
                    "date":       article["date"],
                    "source":     article["source"],
                    "source_url": article["source_url"],
                })
        except Exception as e:
            logger.warning("Groq enrichment failed for batch %d: %s", i, e)
            # Keep raw articles without enrichment rather than dropping them
            for article in batch:
                enriched.append({
                    "title":      article["title"],
                    "summary":    article.get("raw_desc", "")[:200],
                    "severity":   _infer_severity_fallback(article["title"]),
                    "category":   "news",
                    "date":       article["date"],
                    "source":     article["source"],
                    "source_url": article["source_url"],
                })

    return enriched


def _infer_severity_fallback(text: str) -> str:
    """Keyword-based severity inference used only when Groq is unavailable."""
    t = text.lower()
    if any(k in t for k in ["death", "cancer", "carcinogen", "lead", "poison", "toxic", "fatal", "ban", "recall", "seized", "argemone", "sudan"]):
        return "HIGH"
    if any(k in t for k in ["warning", "fail", "violation", "fine", "unsafe", "contaminat", "adulterat", "fake", "substandard"]):
        return "MEDIUM"
    return "LOW"


def _groq_generate_news() -> list[dict]:
    """Ask Groq to generate food safety news based on real documented patterns when scraping fails."""
    system = (
        "You are an Indian food safety journalist with deep knowledge of FSSAI reports, "
        "CSE studies, state food safety surveys, and documented adulteration cases. "
        "Respond ONLY with valid JSON. No markdown."
    )
    user = f"""Generate 10 food safety news items for India based on REAL documented patterns from:
- FSSAI annual surveillance reports and recall notices
- CSE (Centre for Science and Environment) lab studies
- State food safety authority survey findings
- Documented seasonal adulteration patterns

Current month/year context: {datetime.now().strftime("%B %Y")}

Each item must be based on a real documented pattern (e.g. honey NMR failure, argemone in mustard oil, 
Sudan Red in chilli, urea in milk, starch in paneer, lead chromate in turmeric).

Return ONLY this JSON:
{{
  "articles": [
    {{
      "title": "<specific, factual headline citing real pattern>",
      "summary": "<2 sentences citing the documented study, survey, or report this is based on>",
      "severity": "HIGH|MEDIUM|LOW",
      "category": "recall|warning|news|update",
      "date": "<{datetime.now().strftime("%b %Y")}>",
      "source": "<real Indian news source or FSSAI>",
      "source_url": ""
    }}
  ]
}}

Rules:
- Base every item on a real documented case or pattern — no invented incidents
- Mention actual adulterants, chemicals, or violations by name
- Vary severity realistically across the 10 items
- Include at least 2 LOW severity regulatory/update items"""

    try:
        result = _call_groq(system, user, max_tokens=2500)
        articles = result.get("articles", [])
        # Ensure source_url is always present
        for a in articles:
            a.setdefault("source_url", "")
        return articles
    except Exception as e:
        logger.error("Groq news generation failed: %s", e)
        return []


# ── GET /news/feed ─────────────────────────────────────────────────────────
@router.get("/feed")
async def get_news_feed(severity: Optional[str] = None, limit: int = 20):
    """Get real-time food safety news feed."""
    now = time.time()

    # Serve from cache if fresh
    if _cache["data"] and (now - _cache["ts"]) < CACHE_TTL:
        articles = _cache["data"]
    else:
        # 1. Scrape all sources
        raw_articles = await _scrape_rss_sources()

        if raw_articles:
            # 2. Enrich with Groq (summary, severity, category)
            articles = _groq_enrich_articles(raw_articles)
        else:
            # 3. All scraping failed — Groq generates based on real patterns
            logger.warning("All scraping failed — falling back to Groq generation")
            articles = _groq_generate_news()

        if articles:
            # Sort: HIGH first, then MEDIUM, then LOW, then by date
            severity_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
            articles.sort(key=lambda a: severity_order.get(a.get("severity", "LOW"), 2))

            _cache["data"] = articles
            _cache["ts"]   = now

    # Filter by severity
    if severity:
        articles = [a for a in articles if a.get("severity", "").upper() == severity.upper()]

    return {
        "articles":     articles[:limit],
        "total":        len(articles),
        "cached":       (now - _cache["ts"]) < CACHE_TTL,
        "last_updated": datetime.fromtimestamp(_cache["ts"]).isoformat() if _cache["ts"] else None,
        "source":       "scraped+groq" if _cache["data"] else "groq",
    }


# ── GET /news/categories ───────────────────────────────────────────────────
@router.get("/categories")
async def get_news_categories():
    """Return available severity levels and categories dynamically."""
    articles = _cache.get("data") or []
    severities = sorted(list({a.get("severity") for a in articles if a.get("severity")}))
    categories = sorted(list({a.get("category") for a in articles if a.get("category")}))
    return {"severities": severities, "categories": categories}