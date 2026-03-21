"""
services/rag_service.py

FSSAI RAG (Retrieval-Augmented Generation) layer.

Embeds FSSAI violation records into a local ChromaDB vector store
and retrieves the most relevant ones before each AI analysis call.
This grounds the LLM's output in verified, citable evidence instead
of hallucinated training-data knowledge.

Usage:
    from services.rag_service import rag

    records  = rag.retrieve("turmeric powder", n_results=5)
    context  = rag.format_context(records)   # inject into prompt

Indexing (run once, then on every scraper update):
    python backend/scripts/build_fssai_index.py
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import chromadb
from chromadb.utils import embedding_functions

logger = logging.getLogger(__name__)

# Persist the vector store next to the backend folder
CHROMA_PATH = Path(__file__).parent.parent / "data" / "chroma_fssai"
COLLECTION_NAME = "fssai_violations"
EMBED_MODEL = "all-MiniLM-L6-v2"   # 22MB, runs on CPU, ~80ms/query


class FSSAIRagService:
    """
    Wraps a ChromaDB collection of FSSAI violation records.
    Lazy-initialised — no cost on import, connects on first use.
    """

    def __init__(self) -> None:
        self._client: Optional[chromadb.ClientAPI] = None
        self._collection: Optional[chromadb.Collection] = None

    # ── Internal ──────────────────────────────────────────────────────────────

    def _init(self) -> None:
        """Connect to (or create) the persistent ChromaDB collection."""
        if self._client is not None:
            return

        CHROMA_PATH.mkdir(parents=True, exist_ok=True)

        self._client = chromadb.PersistentClient(path=str(CHROMA_PATH))

        ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=EMBED_MODEL,
            device="cpu",
        )

        self._collection = self._client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=ef,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(
            "RAG: ChromaDB ready — %d records indexed", self._collection.count()
        )

    # ── Public API ────────────────────────────────────────────────────────────

    def index_violation(
        self,
        violation_id: str,
        document: str,
        metadata: dict,
    ) -> None:
        """
        Upsert a single FSSAI violation into the vector store.
        Safe to call repeatedly — existing records are overwritten.

        Args:
            violation_id: Primary key from FssaiViolation.id
            document:     The raw text to embed (product + violation + raw_text)
            metadata:     Dict of scalar fields for post-retrieval display
        """
        self._init()
        # ChromaDB metadata values must be str/int/float/bool — no None
        clean_meta = {k: (v if v is not None else "") for k, v in metadata.items()}
        self._collection.upsert(
            ids=[violation_id],
            documents=[document],
            metadatas=[clean_meta],
        )

    def delete_violation(self, violation_id: str) -> None:
        """Remove a record that has been deleted from the DB."""
        self._init()
        self._collection.delete(ids=[violation_id])

    def retrieve(
        self,
        food_name: str,
        n_results: int = 5,
        min_relevance: float = 0.30,
    ) -> list[dict]:
        """
        Semantic search for FSSAI records relevant to food_name.

        Returns a list of dicts, each with:
            text, brand, product, state, date, source_url, relevance (0–1)

        Records with cosine similarity < min_relevance are dropped so the
        prompt isn't polluted with noise when there are no good matches.
        """
        self._init()

        total = self._collection.count()
        if total == 0:
            logger.warning("RAG: collection is empty — run build_fssai_index.py")
            return []

        results = self._collection.query(
            query_texts=[food_name],
            n_results=min(n_results, total),
            include=["documents", "metadatas", "distances"],
        )

        records: list[dict] = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            # ChromaDB cosine distance: 0 = identical, 2 = opposite
            relevance = round(1 - dist / 2, 3)
            if relevance < min_relevance:
                continue
            records.append(
                {
                    "text": doc,
                    "brand": meta.get("brand") or None,
                    "product": meta.get("product") or "Unknown product",
                    "state": meta.get("state") or None,
                    "date": meta.get("date") or None,
                    "source_url": meta.get("source_url") or None,
                    "relevance": relevance,
                }
            )

        logger.info(
            "RAG: retrieved %d/%d records for '%s'",
            len(records), n_results, food_name,
        )
        return records

    def format_context(self, records: list[dict]) -> str:
        """
        Render retrieved records into a compact prompt block.
        Designed to be injected just before the LLM user turn.
        """
        if not records:
            return ""

        lines = [
            "=== VERIFIED FSSAI VIOLATION RECORDS (use to ground your analysis) ===",
        ]
        for i, r in enumerate(records, 1):
            parts = [f"[{i}]"]
            parts.append(f"Product: {r['product']}")
            if r["brand"]:
                parts.append(f"Brand: {r['brand']}")
            if r["state"]:
                parts.append(f"State: {r['state']}")
            if r["date"]:
                parts.append(f"Date: {r['date']}")
            lines.append(" | ".join(parts))
            lines.append(f"    Violation: {r['text'][:400]}")
            if r["source_url"]:
                lines.append(f"    Source: {r['source_url']}")
        lines.append("=== END FSSAI RECORDS ===")
        return "\n".join(lines)

    def format_citations(self, records: list[dict]) -> list[dict]:
        """
        Return citation dicts suitable for including in the API response.
        These are shown in the frontend as clickable source cards.
        """
        return [
            {
                "product": r["product"],
                "brand": r["brand"],
                "state": r["state"],
                "date": r["date"],
                "source": r["source_url"],
                "relevance": r["relevance"],
            }
            for r in records
        ]

    @property
    def record_count(self) -> int:
        """How many records are currently indexed."""
        self._init()
        return self._collection.count()


# Module-level singleton — import this everywhere
rag = FSSAIRagService()
