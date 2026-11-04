import pytest
from datetime import datetime, timedelta, timezone


@pytest.mark.asyncio
async def test_empty_analytics_response(async_client):
    # Query with a far future date range so no records match
    params = {
        "start_date": "2099-01-01T00:00:00Z",
        "end_date": "2099-12-31T23:59:59Z",
    }
    res = await async_client.get("/api/v1/analytics/performance", params=params)
    assert res.status_code == 200
    data = res.json()
    assert data["total_tests"] == 0
    assert data["successful_tests"] == 0
    assert data["failed_tests"] == 0
    assert data["success_rate"] == 0.0
    assert data["avg_response_time_ms"] == 0.0
    assert data["fastest_request"] is None
    assert data["slowest_request"] is None
    assert isinstance(data["method_performance"], list)
    assert len(data["method_performance"]) == 0
    assert len(data["insights"]) > 0
    assert data["insights"][0]["category"] == "info"


@pytest.mark.asyncio
async def test_performance_analytics_calculations(async_client):
    # Seed 3 distinct executions
    test_runs = [
        {
            "test_name": "Fast Health Check",
            "endpoint_url": "https://api.example.com/health",
            "http_method": "GET",
            "status_code": 200,
            "response_time_ms": 45.0,
            "is_success": True,
        },
        {
            "test_name": "Create Resource",
            "endpoint_url": "https://api.example.com/items",
            "http_method": "POST",
            "status_code": 201,
            "response_time_ms": 180.0,
            "is_success": True,
        },
        {
            "test_name": "Failing Batch Sync",
            "endpoint_url": "https://api.example.com/sync",
            "http_method": "POST",
            "status_code": 500,
            "response_time_ms": 650.0,
            "is_success": False,
        },
    ]

    for item in test_runs:
        r = await async_client.post("/api/v1/history", json=item)
        assert r.status_code == 201

    res = await async_client.get("/api/v1/analytics/performance")
    assert res.status_code == 200
    data = res.json()

    assert data["total_tests"] >= 3
    assert data["successful_tests"] >= 2
    assert data["failed_tests"] >= 1
    assert data["success_rate"] > 0

    # Fastest & slowest request checks
    assert data["fastest_request"] is not None
    assert data["slowest_request"] is not None
    assert data["fastest_request"]["response_time_ms"] <= data["slowest_request"]["response_time_ms"]
    assert data["min_response_time_ms"] <= data["avg_response_time_ms"] <= data["max_response_time_ms"]

    # Method performance breakdown
    methods = [m["method"] for m in data["method_performance"]]
    assert "GET" in methods or "POST" in methods

    # Check that insights are populated
    assert len(data["insights"]) >= 2
    categories = [i["category"] for i in data["insights"]]
    assert any(c in ["success", "warning", "danger", "info"] for c in categories)


@pytest.mark.asyncio
async def test_analytics_method_filter(async_client):
    # Seed a PUT execution
    put_item = {
        "test_name": "Update User",
        "endpoint_url": "https://api.example.com/users/1",
        "http_method": "PUT",
        "status_code": 200,
        "response_time_ms": 120.0,
        "is_success": True,
    }
    r = await async_client.post("/api/v1/history", json=put_item)
    assert r.status_code == 201

    res = await async_client.get("/api/v1/analytics/performance?method=PUT")
    assert res.status_code == 200
    data = res.json()
    assert data["total_tests"] >= 1
    for m in data["method_performance"]:
        assert m["method"] == "PUT"


@pytest.mark.asyncio
async def test_analytics_invalid_date_range(async_client):
    # start_date > end_date must return HTTP 400
    params = {
        "start_date": "2026-05-10T00:00:00Z",
        "end_date": "2026-05-01T00:00:00Z",
    }
    res = await async_client.get("/api/v1/analytics/performance", params=params)
    assert res.status_code == 400
    err = res.json()
    assert "start_date cannot be later than end_date" in err["detail"]
