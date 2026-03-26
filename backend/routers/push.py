from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.db.database import get_db
from app.core.config import settings
from models.models import User, PushSubscriptionRecord
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


@router.post("/subscribe")
async def subscribe(
    sub: PushSubscription,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Remove any existing record with this endpoint (re-subscribe / key rotation)
    await db.execute(
        delete(PushSubscriptionRecord).where(
            PushSubscriptionRecord.endpoint == sub.endpoint
        )
    )
    record = PushSubscriptionRecord(
        user_id=user.id,
        endpoint=sub.endpoint,
        keys=sub.keys,
    )
    db.add(record)
    await db.commit()

    total = (await db.execute(select(PushSubscriptionRecord))).scalars().all()
    return {"success": True, "total": len(total)}


@router.post("/unsubscribe")
async def unsubscribe(
    sub: PushSubscription,
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(PushSubscriptionRecord).where(
            PushSubscriptionRecord.endpoint == sub.endpoint
        )
    )
    await db.commit()
    return {"success": True}


@router.post("/notify-fssai")
async def notify_fssai(
    req: NotifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send FSSAI alert push to all subscribed users."""
    result = await db.execute(select(PushSubscriptionRecord))
    subscriptions = result.scalars().all()

    if not subscriptions:
        return {"sent": 0, "message": "No subscribers"}

    try:
        from pywebpush import webpush, WebPushException

        sent   = 0
        failed = 0
        private_key  = settings.VAPID_PRIVATE_KEY
        vapid_email  = getattr(settings, "VAPID_EMAIL", "mailto:admin@foodsafe.app")
        payload = json.dumps({
            "title": req.title,
            "body":  req.body,
            "url":   req.url,
            "icon":  "/pwa-192.png",
        })

        stale_endpoints = []

        for sub in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub.endpoint,
                        "keys": sub.keys,
                    },
                    data=payload,
                    vapid_private_key=private_key,
                    vapid_claims={"sub": vapid_email},
                )
                sent += 1
            except WebPushException as e:
                # 410 Gone / 404 Not Found → subscription expired, remove it
                if "410" in str(e) or "404" in str(e):
                    stale_endpoints.append(sub.endpoint)
                failed += 1

        # Clean up stale subscriptions in one pass
        if stale_endpoints:
            await db.execute(
                delete(PushSubscriptionRecord).where(
                    PushSubscriptionRecord.endpoint.in_(stale_endpoints)
                )
            )
            await db.commit()

        return {"sent": sent, "failed": failed, "total": len(subscriptions) - len(stale_endpoints)}

    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/vapid-public-key")
async def get_vapid_key():
    return {"public_key": getattr(settings, "VAPID_PUBLIC_KEY", "")}