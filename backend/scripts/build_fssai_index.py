"""
scripts/build_fssai_index.py

One-time script (and cron job) to embed all FssaiViolation rows
from the database into the ChromaDB vector store.

Run from the backend/ directory:
    python scripts/build_fssai_index.py

Run again any time after the scraper adds new records — it upserts,
so existing embeddings are refreshed rather than duplicated.

Add to crontab to keep the index fresh:
    0 3 * * 0  cd /app/backend && python scripts/build_fssai_index.py
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Make sure backend/ packages are importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select

from app.db.database import AsyncSessionLocal
from models.models import FssaiViolation
from services.rag_service import rag


def _build_document(v: FssaiViolation) -> str:
    """
    Combine all text fields into a single string to embed.
    More context = better semantic matching.
    """
    parts = [
        v.product or "",
        v.brand or "",
        v.violation or "",
        v.raw_text or "",
        v.state or "",
    ]
    return " ".join(p.strip() for p in parts if p.strip())


def _build_metadata(v: FssaiViolation) -> dict:
    return {
        "brand": v.brand or "",
        "product": v.product or "",
        "violation": (v.violation or "")[:500],   # cap at 500 chars for ChromaDB
        "state": v.state or "",
        "date": str(v.date.date()) if v.date else "",
        "source_url": v.source_url or "",
    }


async def build_index() -> None:
    print("🔍 Connecting to database...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(FssaiViolation))
        violations = result.scalars().all()

    if not violations:
        print(
            "⚠  No FssaiViolation records found in the database.\n"
            "   Run the FSSAI scraper first:\n"
            "   python backend/scrapers/fssai_scraper.py"
        )
        return

    print(f"📦 Indexing {len(violations)} FSSAI violation records...")

    indexed = 0
    skipped = 0

    for v in violations:
        doc = _build_document(v)
        if not doc.strip():
            skipped += 1
            continue

        meta = _build_metadata(v)
        rag.index_violation(v.id, doc, meta)
        indexed += 1

        if indexed % 50 == 0:
            print(f"   ... {indexed}/{len(violations)}")

    print(
        f"\n✅ Done.\n"
        f"   Indexed : {indexed}\n"
        f"   Skipped : {skipped} (empty records)\n"
        f"   Total in vector store: {rag.record_count}\n"
        f"   Location: backend/data/chroma_fssai/"
    )


if __name__ == "__main__":
    asyncio.run(build_index())
