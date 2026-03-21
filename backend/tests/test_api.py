import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_scan_empty_food(client):
    r = await client.post("/api/scan/text", json={"food_name": ""})
    assert r.status_code == 400

@pytest.mark.asyncio
async def test_barcode_not_found(client):
    r = await client.get("/api/scan/barcode/0000000000000")
    assert r.status_code in [404, 200]

@pytest.mark.asyncio
async def test_community_reports(client):
    r = await client.get("/api/community/reports")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

@pytest.mark.asyncio
async def test_safe_brands(client):
    r = await client.get("/api/brands/safe?food=turmeric")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

@pytest.mark.asyncio
async def test_fssai_alerts(client):
    r = await client.get("/api/fssai/alerts")
    assert r.status_code == 200

@pytest.mark.asyncio
async def test_combination_needs_two(client):
    r = await client.post("/api/scan/combination", json={"foods": ["milk"]})
    assert r.status_code == 400
