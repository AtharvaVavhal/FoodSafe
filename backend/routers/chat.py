"""
routers/chat.py

Thin proxy between the frontend chatbot and Groq.
Keeps GROQ_API_KEY server-side only — never exposed to the browser.
Uses the shared _GROQ_SEMAPHORE + backoff from ai_service.
"""

import asyncio
import logging

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

from services.ai_service import (
    _get_semaphore, _jitter,
    GROQ_URL, GROQ_KEY, GROQ_MODEL,
    BASE_WAIT, MAX_WAIT, MAX_RETRIES,
)

router = APIRouter()
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are FoodSafe AI, a food safety assistant for Indian families. "
    "You help with food adulteration detection, FSSAI violations, safe food buying tips, "
    "home tests, and seasonal food risks in Maharashtra. "
    "Keep responses short and practical. "
    "If asked in Hindi or Marathi, respond in the same language."
)

MAX_HISTORY  = 10   # messages to keep in context (prevents token bloat)
MAX_USER_LEN = 500  # chars per message (blocks prompt-injection attempts)


class ChatMessage(BaseModel):
    role:    Literal["user", "assistant"]
    content: str = Field(..., max_length=1000)


class ChatRequest(BaseModel):
    message: str               = Field(..., min_length=1, max_length=MAX_USER_LEN)
    history: list[ChatMessage] = Field(default=[], max_length=MAX_HISTORY)


@router.post("/")
async def chat(req: ChatRequest):
    if not GROQ_KEY:
        raise HTTPException(503, "AI service not configured")

    # Build messages array: system + trimmed history + new user message.
    # BUG FIX: history is assembled server-side so it always reflects the
    # correct full conversation — frontend was sending stale history because
    # React state hadn't flushed when the fetch fired.
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in req.history[-(MAX_HISTORY):]:
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": req.message})

    headers = {
        "Authorization": f"Bearer {GROQ_KEY}",
        "Content-Type":  "application/json",
    }
    payload = {
        "model":       GROQ_MODEL,
        "messages":    messages,
        "temperature": 0.5,
        "max_tokens":  350,
    }

    async with _get_semaphore():
        async with httpx.AsyncClient(timeout=30) as client:
            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    resp = await client.post(GROQ_URL, headers=headers, json=payload)

                    if resp.status_code == 429 or resp.status_code >= 500:
                        wait = _jitter(min(MAX_WAIT, BASE_WAIT * (2 ** (attempt - 1))))
                        logger.warning("Chat Groq %d attempt %d/%d, retry %.1fs",
                                       resp.status_code, attempt, MAX_RETRIES, wait)
                        if attempt < MAX_RETRIES:
                            await asyncio.sleep(wait)
                            continue
                        raise HTTPException(503, "AI service temporarily unavailable")

                    resp.raise_for_status()
                    reply = resp.json()["choices"][0]["message"]["content"]
                    return {"reply": reply}

                except httpx.TimeoutException:
                    wait = _jitter(min(MAX_WAIT, BASE_WAIT * (2 ** (attempt - 1))))
                    logger.warning("Chat timeout attempt %d/%d, retry %.1fs",
                                   attempt, MAX_RETRIES, wait)
                    if attempt < MAX_RETRIES:
                        await asyncio.sleep(wait)
                    else:
                        raise HTTPException(503, "AI service timed out")

    raise HTTPException(503, "AI service temporarily unavailable")