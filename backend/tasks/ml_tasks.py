from tasks import celery_app

@celery_app.task(name="tasks.ml_tasks.retrain_risk_model")
def retrain_risk_model():
    """
    Weekly model retraining using accumulated scan data.
    Exports updated risk weights to ml/models/risk_weights.json
    """
    import asyncio, json, os
    from sqlalchemy import select, func
    from app.db.database import AsyncSessionLocal
    from models.models import ScanRecord

    async def _run():
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(
                    ScanRecord.food_name,
                    ScanRecord.risk_level,
                    func.count().label("count"),
                    func.avg(ScanRecord.safety_score).label("avg_score"),
                ).group_by(ScanRecord.food_name, ScanRecord.risk_level)
            )
            rows = result.all()

        # Aggregate: food → average community risk score
        food_stats = {}
        for row in rows:
            name = row.food_name.lower().strip()
            if name not in food_stats:
                food_stats[name] = {"count": 0, "total_score": 0}
            food_stats[name]["count"]       += row.count
            food_stats[name]["total_score"] += (row.avg_score or 50) * row.count

        weights = {
            name: round(stats["total_score"] / stats["count"], 1)
            for name, stats in food_stats.items() if stats["count"] > 0
        }

        out_path = os.path.join(os.path.dirname(__file__), "../ml/models/risk_weights.json")
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w") as f:
            json.dump(weights, f, indent=2)

        return f"Retrained on {len(weights)} food items"

    return asyncio.run(_run())
