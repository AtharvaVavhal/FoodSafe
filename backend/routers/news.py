"""
routers/news.py

Real-time food safety news via Groq compound model (built-in web search).
- Zero hardcoded content
- groq/compound-mini searches the web live for Indian food safety news
- Cache TTL: 30 minutes
"""

import json
import re
import time
import logging
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter

from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Cache ──────────────────────────────────────────────────────────────────
_cache: dict = {"data": None, "ts": 0}
CACHE_TTL = 1800  # 30 minutes

GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions"
GROQ_KEY   = settings.GROQ_API_KEY

# compound-mini has web search built-in, no tools array needed
GROQ_MODEL = "groq/compound-mini"


# ── Groq compound web search ───────────────────────────────────────────────

async def _groq_compound_search(query: str, max_tokens: int = 3000) -> str:
    """
    Call groq/compound-mini which has built-in web search.
    No tools array needed — the model searches the web automatically.
    Returns the raw text response.
    """
    if not GROQ_KEY:
        raise RuntimeError("Groq API key not configured")

    headers = {
        "Authorization": f"Bearer {GROQ_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": [{"role": "user", "content": query}],
        "max_tokens": max_tokens,
        "temperature": 0.2,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(GROQ_URL, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()

    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    if isinstance(content, list):
        return "".join(
            block.get("text", "") for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        )
    return content or ""


def _parse_json_articles(text: str) -> list[dict]:
    """Extract a JSON array of articles from Groq's response text."""
    if not text:
        return []

    # 1. Find [...] block
    match = re.search(r'\[\s*\{.*?\}\s*\]', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # 2. Strip markdown fences
    clean = (
        text.strip()
        .removeprefix("```json")
        .removeprefix("```")
        .removesuffix("```")
        .strip()
    )
    try:
        parsed = json.loads(clean)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            return parsed.get("articles", [])
    except json.JSONDecodeError:
        pass

    return []


async def _fetch_live_news() -> list[dict]:
    """
    Fetch real live Indian food safety news using Groq compound-mini web search.
    Runs 2 parallel searches for breadth. Zero hardcoded content.
    """
    import asyncio

    today = datetime.now().strftime("%B %Y")

    queries = [
        f"""Search the web right now and find the latest real news articles from {today} about food safety in India.

Look for: FSSAI food recalls, food adulteration raids, contaminated food alerts, food safety violations, 
banned food products, adulterated milk/spices/oil/honey/paneer cases across Indian states.

Return your findings as a pure JSON array — no explanation, no markdown, just the array:
[
  {{
    "title": "exact real article headline from the web",
    "summary": "2 sentence factual summary of the food safety issue",
    "severity": "HIGH or MEDIUM or LOW",
    "category": "recall or warning or news or update",
    "date": "DD Mon YYYY",
    "source": "publication name",
    "source_url": "full article URL"
  }}
]

Severity: HIGH=death/recall/ban/toxic/carcinogen, MEDIUM=violation/fine/warning/substandard, LOW=regulation/awareness
Return ONLY the JSON array. Include 5-10 real articles.""",

        f"""Search the web now for recent FSSAI alerts and food adulteration cases in India — {today}.

Find: state food safety authority raids and seizures, FSSAI license cancellations, food poisoning outbreaks,
unsafe food imports rejected at ports, pesticide residue findings, adulterated products seized.

Return ONLY a JSON array of real articles found:
[
  {{
    "title": "exact real article headline",
    "summary": "2 sentence factual summary",
    "severity": "HIGH or MEDIUM or LOW",
    "category": "recall or warning or news or update",
    "date": "DD Mon YYYY",
    "source": "publication name",
    "source_url": "full article URL"
  }}
]

Severity: HIGH=death/recall/ban/toxic, MEDIUM=violation/warning/substandard, LOW=regulatory update
Return ONLY the JSON array. Include 5-10 real articles.""",
    ]

    results = await asyncio.gather(
        *[_groq_compound_search(q) for q in queries],
        return_exceptions=True,
    )

    all_articles = []
    for result in results:
        if isinstance(result, Exception):
            logger.warning("Groq compound search failed: %s", result)
            continue
        articles = _parse_json_articles(result)
        all_articles.extend(articles)

    # Deduplicate by title
    seen = set()
    deduped = []
    for a in all_articles:
        title_key = (a.get("title") or "")[:60].lower().strip()
        if not title_key or title_key in seen:
            continue
        seen.add(title_key)
        deduped.append({
            "title":      (a.get("title") or "")[:250],
            "summary":    (a.get("summary") or "")[:500],
            "severity":   (a.get("severity") or "MEDIUM").upper(),
            "category":   (a.get("category") or "news").lower(),
            "date":       a.get("date") or datetime.now().strftime("%d %b %Y"),
            "source":     a.get("source") or "News",
            "source_url": a.get("source_url") or "",
        })

    logger.info("Groq compound web search returned %d unique articles", len(deduped))
    return deduped


# ── GET /news/feed ─────────────────────────────────────────────────────────
@router.get("/feed")
async def get_news_feed(severity: Optional[str] = None, limit: int = 20):
    """Get real-time food safety news fetched live via Groq compound web search."""
    now = time.time()

    if _cache["data"] and (now - _cache["ts"]) < CACHE_TTL:
        articles = _cache["data"]
        cached = True
    else:
        cached = False
        try:
            articles = await _fetch_live_news()
        except Exception as e:
            logger.error("News fetch failed: %s", e)
            articles = []

        if articles:
            order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
            articles.sort(key=lambda a: order.get(a.get("severity", "LOW"), 2))
            _cache["data"] = articles
            _cache["ts"]   = now

    if severity:
        articles = [
            a for a in (articles or [])
            if a.get("severity", "").upper() == severity.upper()
        ]

    return {
        "articles":     (articles or [])[:limit],
        "total":        len(articles or []),
        "cached":       cached,
        "last_updated": datetime.fromtimestamp(_cache["ts"]).isoformat() if _cache["ts"] else None,
        "source":       "groq_compound_web_search",
    }


# ── GET /news/categories ───────────────────────────────────────────────────
@router.get("/categories")
async def get_news_categories():
    articles = _cache.get("data") or []
    severities = sorted({a.get("severity") for a in articles if a.get("severity")})
    categories = sorted({a.get("category") for a in articles if a.get("category")})
    return {"severities": severities, "categories": categories}