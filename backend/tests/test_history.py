import pytest
from datetime import datetime, timezone

@pytest.mark.asyncio
async def test_create_and_get_history_execution(async_client):
    payload = {
        "test_name": "Verify Users Endpoint",
        "endpoint_url": "https://api.example.com/v1/users",
        "http_method": "GET",
        "status_code": 200,
        "status_text": "OK",
        "response_time_ms": 142.5,
        "response_size_bytes": 1024,
        "is_success": True,
        "request_headers": {"Accept": "application/json"},
        "response_body": '{"status": "success", "count": 10}',
        "assertion_results": [
            {
                "assertion_type": "status_code",
                "operator": "equals",
                "expected_value": "200",
                "actual_value": "200",
                "passed": True,
                "message": "Status code 200 matches expected 200",
            }
        ],
    }

    create_res = await async_client.post("/api/v1/history", json=payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["id"] is not None
    assert created_data["test_name"] == "Verify Users Endpoint"
    assert created_data["http_method"] == "GET"
    assert created_data["is_success"] is True
    assert len(created_data["assertion_results"]) == 1
    exec_id = created_data["id"]

    # Retrieve individual detail
    detail_res = await async_client.get(f"/api/v1/history/{exec_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == exec_id
    assert "users" in detail["endpoint_url"]
    assert detail["response_time_ms"] == 142.5

@pytest.mark.asyncio
async def test_history_validation_errors(async_client):
    # Invalid status code (e.g., 999)
    bad_payload = {
        "test_name": "Bad Payload",
        "endpoint_url": "https://api.example.com",
        "http_method": "POST",
        "status_code": 999,
    }
    res = await async_client.post("/api/v1/history", json=bad_payload)
    assert res.status_code == 422

    # Missing endpoint_url
    bad_payload2 = {
        "test_name": "No URL",
        "endpoint_url": "",
        "http_method": "GET",
    }
    res2 = await async_client.post("/api/v1/history", json=bad_payload2)
    assert res2.status_code == 422

@pytest.mark.asyncio
async def test_history_pagination_and_filtering(async_client):
    # Seed 3 records
    for i, (m, ok, ms) in enumerate([("GET", True, 50.0), ("POST", False, 250.0), ("PATCH", True, 110.0)]):
        await async_client.post("/api/v1/history", json={
            "test_name": f"Filter Test {i} {m}",
            "endpoint_url": f"https://api.example.com/item/{i}",
            "http_method": m,
            "status_code": 200 if ok else 500,
            "response_time_ms": ms,
            "is_success": ok,
        })

    # Test pagination
    list_res = await async_client.get("/api/v1/history?page=1&page_size=2")
    assert list_res.status_code == 200
    data = list_res.json()
    assert "items" in data
    assert "total" in data
    assert "total_pages" in data
    assert len(data["items"]) <= 2

    # Filter by method POST
    post_res = await async_client.get("/api/v1/history?method=POST")
    assert post_res.status_code == 200
    assert all(item["http_method"] == "POST" for item in post_res.json()["items"])

    # Filter by status fail
    fail_res = await async_client.get("/api/v1/history?status=fail")
    assert fail_res.status_code == 200
    assert all(item["is_success"] is False for item in fail_res.json()["items"])

    # Search filter
    search_res = await async_client.get("/api/v1/history?search=item/1")
    assert search_res.status_code == 200
    assert any("item/1" in item["endpoint_url"] for item in search_res.json()["items"])

@pytest.mark.asyncio
async def test_history_summary_stats(async_client):
    res = await async_client.get("/api/v1/history/summary")
    assert res.status_code == 200
    summary = res.json()
    assert "total_executions" in summary
    assert "passed_count" in summary
    assert "failed_count" in summary
    assert "success_rate" in summary
    assert "avg_response_time_ms" in summary

@pytest.mark.asyncio
async def test_delete_history_item_and_clear(async_client):
    # Create item
    res = await async_client.post("/api/v1/history", json={
        "test_name": "Temporary Test To Delete",
        "endpoint_url": "https://api.example.com/delete-me",
        "http_method": "DELETE",
        "status_code": 204,
        "is_success": True,
    })
    item_id = res.json()["id"]

    # Delete item
    del_res = await async_client.delete(f"/api/v1/history/{item_id}")
    assert del_res.status_code == 204

    # Verify 404
    check_res = await async_client.get(f"/api/v1/history/{item_id}")
    assert check_res.status_code == 404

    # Clear all history
    clear_res = await async_client.delete("/api/v1/history")
    assert clear_res.status_code == 204

    # Check empty list
    empty_res = await async_client.get("/api/v1/history")
    assert empty_res.status_code == 200
    assert empty_res.json()["total"] == 0
