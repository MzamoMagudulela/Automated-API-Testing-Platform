import pytest

@pytest.mark.asyncio
async def test_health_check(async_client):
    response = await async_client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_environments_crud(async_client):
    # 1. Create Environment
    payload = {
        "name": "Staging Environment",
        "base_url": "https://staging.example.com",
        "description": "Staging environment for tests",
        "is_active": False,
        "variables": [
            {"key": "apiKey", "value": "test_staging_secret_key", "is_secret": True},
            {"key": "region", "value": "us-east-1", "is_secret": False},
        ],
    }
    create_res = await async_client.post("/api/v1/environments", json=payload)
    assert create_res.status_code == 201
    env_data = create_res.json()
    assert env_data["name"] == "Staging Environment"
    env_id = env_data["id"]

    # Verify secret is masked
    var_map = {v["key"]: v["value"] for v in env_data["variables"]}
    assert var_map["region"] == "us-east-1"
    assert "test_staging" not in var_map["apiKey"]

    # 2. Get Environment List
    list_res = await async_client.get("/api/v1/environments")
    assert list_res.status_code == 200
    assert any(e["id"] == env_id for e in list_res.json())

    # 3. Activate Environment
    act_res = await async_client.post(f"/api/v1/environments/{env_id}/activate")
    assert act_res.status_code == 200
    assert act_res.json()["is_active"] is True

    # 4. Delete Environment
    del_res = await async_client.delete(f"/api/v1/environments/{env_id}")
    assert del_res.status_code == 204

@pytest.mark.asyncio
async def test_collections_and_test_cases_crud(async_client):
    # 1. Create Collection
    col_payload = {"name": "Auth Integration Test Suite", "description": "Tests for authentication flows"}
    col_res = await async_client.post("/api/v1/collections", json=col_payload)
    assert col_res.status_code == 201
    col_id = col_res.json()["id"]

    # 2. Create Test Case in Collection
    tc_payload = {
        "collection_id": col_id,
        "name": "Check Users",
        "method": "GET",
        "url": "/users",
        "expected_status_code": 200,
        "max_response_time_ms": 500,
        "assertions": [
            {"assertion_type": "status_code", "operator": "equals", "expected_value": "200"}
        ]
    }
    tc_res = await async_client.post("/api/v1/test-cases", json=tc_payload)
    assert tc_res.status_code == 201
    tc_id = tc_res.json()["id"]

    # 3. Get Collection Detail
    col_detail = await async_client.get(f"/api/v1/collections/{col_id}")
    assert col_detail.status_code == 200
    assert len(col_detail.json()["test_cases"]) == 1

    # 4. Cleanup
    await async_client.delete(f"/api/v1/test-cases/{tc_id}")
    await async_client.delete(f"/api/v1/collections/{col_id}")

@pytest.mark.asyncio
async def test_dashboard_stats(async_client):
    res = await async_client.get("/api/v1/dashboard/stats")
    assert res.status_code == 200
    data = res.json()
    assert "total_tests" in data
    assert "success_rate" in data
    assert "avg_response_time_ms" in data
    assert "activity_trends" in data
    assert "method_distribution" in data

@pytest.mark.asyncio
async def test_mock_endpoints(async_client):
    # Test GET mock users
    users_res = await async_client.get("/api/v1/mock/users")
    assert users_res.status_code == 200
    assert users_res.json()["status"] == "success"
    assert len(users_res.json()["data"]) > 0

    # Test POST mock echo
    echo_res = await async_client.post("/api/v1/mock/echo?query_test=123", json={"hello": "world"})
    assert echo_res.status_code == 200
    assert echo_res.json()["status"] == "success"
    assert "hello" in echo_res.json()["body"]

    # Test mock status code
    st_res = await async_client.get("/api/v1/mock/status/204")
    assert st_res.status_code == 204
