from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, Column, String, Text
from app.db.database import get_db
from app.core.config import settings
from models.models import User
from routers.users import get_current_user
import json

router = APIRouter()

class PushSubscription(BaseModel):
    endpoint: str
    keys: dict

class NotifyRequest(BaseModel):
    title: str
    body: str
    url: str = "/"

# In-memory store for dev (use DB table in production)
_subscriptions: list[dict] = []

@router.post("/subscribe")
async def subscribe(
    sub: PushSubscription,
    user: User = Depends(get_current_user),
):
    entry = {"user_id": user.id, "endpoint": sub.endpoint, "keys": sub.keys}
    # Avoid duplicates
    _subscriptions[:] = [s for s in _subscriptions if s["endpoint"] != sub.endpoint]
    _subscriptions.append(entry)
    return {"success": True, "total": len(_subscriptions)}

@router.post("/unsubscribe")
async def unsubscribe(sub: PushSubscription):
    _subscriptions[:] = [s for s in _subscriptions if s["endpoint"] != sub.endpoint]
    return {"success": True}

@router.post("/notify-fssai")
async def notify_fssai(req: NotifyRequest):
    """Send FSSAI alert push to all subscribed users"""
    if not _subscriptions:
        return {"sent": 0, "message": "No subscribers"}

    try:
        from pywebpush import webpush, WebPushException
        import base64
        sent = 0
        failed = 0
        private_key = settings.VAPID_PRIVATE_KEY
        vapid_email = getattr(settings, 'VAPID_EMAIL', 'mailto:admin@foodsafe.app')

        payload = json.dumps({
            "title": req.title,
            "body":  req.body,
            "url":   req.url,
            "icon":  "/pwa-192.png",
        })

        for sub in _subscriptions[:]:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub["endpoint"],
                        "keys": sub["keys"],
                    },
                    data=payload,
                    vapid_private_key=private_key,
                    vapid_claims={"sub": vapid_email},
                )
                sent += 1
            except WebPushException as e:
                if "410" in str(e) or "404" in str(e):
                    _subscriptions.remove(sub)
                failed += 1

        return {"sent": sent, "failed": failed, "total": len(_subscriptions)}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/vapid-public-key")
async def get_vapid_key():
    return {"public_key": getattr(settings, 'VAPID_PUBLIC_KEY', '')}