"""
services/rag_service.py

FSSAI RAG layer — Groq-powered retrieval, no ChromaDB or sentence-transformers.

Strategy:
  1. Violations are stored as a flat JSON file (data/fssai_violations.json).
  2. retrieve() does a fast keyword pre-filter to get candidates.
  3. Groq LLM reranks the candidates and picks the most relevant ones.
  4. Falls back gracefully to empty list on any error.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

# ── Storage ───────────────────────────────────────────────────────────────────
DATA_PATH = Path(__file__).parent.parent / "data" / "fssai_violations.json"

# ── Groq settings ─────────────────────────────────────────────────────────────
GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"

MAX_CANDIDATES = 20   # candidates sent to Groq for reranking
TOP_K          = 5    # top results returned after reranking


def _groq_key() -> str:
    from app.core.config import settings
    return settings.GROQ_API_KEY


# ── In-memory store ───────────────────────────────────────────────────────────
# { violation_id: {"document": str, "metadata": dict} }
_store: dict[str, dict] = {}


def _load() -> None:
    global _store
    if DATA_PATH.exists():
        try:
            _store = json.loads(DATA_PATH.read_text(encoding="utf-8"))
            logger.info("RAG: loaded %d violations from disk", len(_store))
        except Exception as e:
            logger.warning("RAG: could not load %s — %s", DATA_PATH, e)
            _store = {}
    else:
        _store = {}


def _save() -> None:
    try:
        DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
        DATA_PATH.write_text(
            json.dumps(_store, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        logger.warning("RAG: could not save violations — %s", e)


_load()


# ── Keyword pre-filter ────────────────────────────────────────────────────────

def _keyword_score(query: str, document: str) -> int:
    q_tokens = set(re.sub(r"[^a-z0-9 ]", " ", query.lower()).split())
    d_lower  = document.lower()
    return sum(1 for t in q_tokens if t and t in d_lower)


def _keyword_candidates(food_name: str, limit: int = MAX_CANDIDATES) -> list[dict]:
    scored = []
    for vid, entry in _store.items():
        score = _keyword_score(food_name, entry["document"])
        if score > 0:
            scored.append((score, vid, entry))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [
        {"id": vid, "document": entry["document"], "metadata": entry["metadata"]}
        for _, vid, entry in scored[:limit]
    ]


# ── Groq reranker ─────────────────────────────────────────────────────────────

def _groq_rerank(food_name: str, candidates: list[dict], top_k: int = TOP_K) -> list[dict]:
    if not candidates:
        return []

    numbered = "\n".join(
        f"[{i}] {c['document'][:300]}"
        for i, c in enumerate(candidates)
    )
    system = (
        "You are a food safety retrieval assistant. "
        "Given a food query and a numbered list of FSSAI violation records, "
        "return ONLY a JSON array of the indices (0-based integers) of the top "
        f"{top_k} most relevant records, ordered by relevance. "
        "Example: [2, 0, 5]. No other text."
    )
    user = f'Food query: "{food_name}"\n\nViolation records:\n{numbered}'

    try:
        resp = httpx.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {_groq_key()}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user",   "content": user},
                ],
                "temperature": 0.0,
                "max_tokens": 80,
            },
            timeout=15,
        )
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"].strip()
        match = re.search(r"\[.*?\]", raw, re.S)
        indices = json.loads(match.group()) if match else []
        indices = [i for i in indices if isinstance(i, int) and 0 <= i < len(candidates)]
    except Exception as e:
        logger.warning("RAG: Groq rerank failed (%s) — using keyword order", e)
        indices = list(range(min(top_k, len(candidates))))

    results = []
    for rank, idx in enumerate(indices[:top_k]):
        c    = candidates[idx]
        meta = c["metadata"]
        results.append({
            "text":       c["document"],
            "brand":      meta.get("brand") or None,
            "product":    meta.get("product") or "Unknown product",
            "state":      meta.get("state") or None,
            "date":       meta.get("date") or None,
            "source_url": meta.get("source_url") or None,
            "relevance":  round(1.0 - rank * (0.5 / max(top_k - 1, 1)), 3),
        })
    return results


# ── Public API ────────────────────────────────────────────────────────────────

class FSSAIRagService:

    def index_violation(self, violation_id: str, document: str, metadata: dict) -> None:
        clean_meta = {k: (v if v is not None else "") for k, v in metadata.items()}
        _store[str(violation_id)] = {"document": document, "metadata": clean_meta}
        _save()

    def delete_violation(self, violation_id: str) -> None:
        if str(violation_id) in _store:
            del _store[str(violation_id)]
            _save()

    def retrieve(
        self,
        food_name: str,
        n_results: int = TOP_K,
        min_relevance: float = 0.30,
    ) -> list[dict]:
        if not _store:
            return []
        candidates = _keyword_candidates(food_name)
        if not candidates:
            return []
        ranked   = _groq_rerank(food_name, candidates, top_k=n_results)
        filtered = [r for r in ranked if r["relevance"] >= min_relevance]
        logger.info("RAG: %d/%d records kept for '%s'", len(filtered), len(candidates), food_name)
        return filtered

    def format_context(self, records: list[dict]) -> str:
        if not records:
            return ""
        lines = ["=== VERIFIED FSSAI VIOLATION RECORDS (use to ground your analysis) ==="]
        for i, r in enumerate(records, 1):
            parts = [f"[{i}]", f"Product: {r['product']}"]
            if r["brand"]:  parts.append(f"Brand: {r['brand']}")
            if r["state"]:  parts.append(f"State: {r['state']}")
            if r["date"]:   parts.append(f"Date: {r['date']}")
            lines.append(" | ".join(parts))
            lines.append(f"    Violation: {r['text'][:400]}")
            if r["source_url"]:
                lines.append(f"    Source: {r['source_url']}")
        lines.append("=== END FSSAI RECORDS ===")
        return "\n".join(lines)

    def format_citations(self, records: list[dict]) -> list[dict]:
        return [
            {
                "product":   r["product"],
                "brand":     r["brand"],
                "state":     r["state"],
                "date":      r["date"],
                "source":    r["source_url"],
                "relevance": r["relevance"],
            }
            for r in records
        ]

    @property
    def record_count(self) -> int:
        return len(_store)


rag = FSSAIRagService()