"""
scripts/build_fssai_index.py

Indexes all FssaiViolation rows from the database into the flat JSON store
used by rag_service.py (replaces the old ChromaDB index).

Run from the backend/ directory:
    python scripts/build_fssai_index.py

Safe to re-run — it upserts, so existing records are refreshed.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select

from app.db.database import AsyncSessionLocal
from models.models import FssaiViolation
from services.rag_service import rag


def _build_document(v: FssaiViolation) -> str:
    parts = [v.product or "", v.brand or "", v.violation or "", v.raw_text or "", v.state or ""]
    return " ".join(p.strip() for p in parts if p.strip())


def _build_metadata(v: FssaiViolation) -> dict:
    return {
        "brand":      v.brand or "",
        "product":    v.product or "",
        "violation":  (v.violation or "")[:500],
        "state":      v.state or "",
        "date":       str(v.date.date()) if v.date else "",
        "source_url": v.source_url or "",
    }


async def build_index() -> None:
    print("🔍 Connecting to database...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(FssaiViolation))
        violations = result.scalars().all()

    if not violations:
        print(
            "⚠  No FssaiViolation records found.\n"
            "   Run the FSSAI scraper first:\n"
            "   python backend/scrapers/fssai_scraper.py"
        )
        return

    print(f"📦 Indexing {len(violations)} FSSAI violation records into JSON store...")
    indexed = skipped = 0

    for v in violations:
        doc = _build_document(v)
        if not doc.strip():
            skipped += 1
            continue
        rag.index_violation(str(v.id), doc, _build_metadata(v))
        indexed += 1
        if indexed % 50 == 0:
            print(f"   ... {indexed}/{len(violations)}")

    print(
        f"\n✅ Done.\n"
        f"   Indexed : {indexed}\n"
        f"   Skipped : {skipped} (empty records)\n"
        f"   Total in store: {rag.record_count}\n"
        f"   Location: backend/data/fssai_violations.json"
    )


if __name__ == "__main__":
    asyncio.run(build_index())