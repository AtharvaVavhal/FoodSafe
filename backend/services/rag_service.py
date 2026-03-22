"""
services/rag_service.py
FSSAI RAG layer — fails gracefully if ChromaDB is unavailable or corrupt.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

CHROMA_PATH = Path(__file__).parent.parent / "data" / "chroma_fssai"
COLLECTION_NAME = "fssai_violations"
EMBED_MODEL = "all-MiniLM-L6-v2"


class FSSAIRagService:

    def __init__(self) -> None:
        self._client = None
        self._collection = None
        self._broken = False

    def _init(self) -> bool:
        """Connect to ChromaDB. Returns False if unavailable."""
        if self._broken:
            return False
        if self._client is not None and self._collection is not None:
            return True
        try:
            import chromadb
            from chromadb.utils import embedding_functions

            CHROMA_PATH.mkdir(parents=True, exist_ok=True)
            client = chromadb.PersistentClient(path=str(CHROMA_PATH))

            ef = embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name=EMBED_MODEL,
                device="cpu",
            )
            collection = client.get_or_create_collection(
                name=COLLECTION_NAME,
                embedding_function=ef,
                metadata={"hnsw:space": "cosine"},
            )
            _ = collection.count()
            self._client = client
            self._collection = collection
            logger.info("RAG: ChromaDB ready — %d records indexed", self._collection.count())
            return True
        except Exception as e:
            logger.warning("RAG: ChromaDB unavailable (%s) — scans will work without citations", e)
            self._broken = True
            self._client = None
            self._collection = None
            return False

    def index_violation(self, violation_id: str, document: str, metadata: dict) -> None:
        if not self._init():
            return
        try:
            clean_meta = {k: (v if v is not None else "") for k, v in metadata.items()}
            self._collection.upsert(
                ids=[violation_id],
                documents=[document],
                metadatas=[clean_meta],
            )
        except Exception as e:
            logger.warning("RAG: index_violation failed: %s", e)

    def delete_violation(self, violation_id: str) -> None:
        if not self._init():
            return
        try:
            self._collection.delete(ids=[violation_id])
        except Exception as e:
            logger.warning("RAG: delete_violation failed: %s", e)

    def retrieve(self, food_name: str, n_results: int = 5, min_relevance: float = 0.30) -> list[dict]:
        if not self._init():
            return []
        try:
            total = self._collection.count()
            if total == 0:
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
                relevance = round(1 - dist / 2, 3)
                if relevance < min_relevance:
                    continue
                records.append({
                    "text": doc,
                    "brand": meta.get("brand") or None,
                    "product": meta.get("product") or "Unknown product",
                    "state": meta.get("state") or None,
                    "date": meta.get("date") or None,
                    "source_url": meta.get("source_url") or None,
                    "relevance": relevance,
                })

            logger.info("RAG: retrieved %d/%d records for '%s'", len(records), n_results, food_name)
            return records
        except Exception as e:
            logger.warning("RAG: retrieve failed: %s", e)
            return []

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
        if not self._init():
            return 0
        try:
            return self._collection.count()
        except Exception:
            return 0


rag = FSSAIRagService()