import pytest


@pytest.mark.asyncio
async def test_collections_crud_and_validation(async_client):
    # 1. Create a unique collection
    col_payload = {
        "name": "E-Commerce Checkout Suite",
        "description": "Tests covering payment gateways, cart checkouts, and webhooks",
    }
    create_res = await async_client.post("/api/v1/collections", json=col_payload)
    assert create_res.status_code == 201
    col_data = create_res.json()
    assert col_data["id"] is not None
    assert col_data["name"] == "E-Commerce Checkout Suite"
    col_id = col_data["id"]

    # 2. Duplicate collection name should be rejected with HTTP 400
    dup_res = await async_client.post("/api/v1/collections", json=col_payload)
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

    # 3. Rename collection
    update_res = await async_client.put(
        f"/api/v1/collections/{col_id}",
        json={"name": "E-Commerce Payments & Checkout", "description": "Updated description"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "E-Commerce Payments & Checkout"

    # 4. Get collection list
    list_res = await async_client.get("/api/v1/collections")
    assert list_res.status_code == 200
    names = [c["name"] for c in list_res.json()]
    assert "E-Commerce Payments & Checkout" in names


@pytest.mark.asyncio
async def test_folders_management_inside_collection(async_client):
    # Create parent collection
    col_res = await async_client.post(
        "/api/v1/collections",
        json={"name": "Customer Accounts API", "description": "Customer domain tests"},
    )
    assert col_res.status_code == 201
    col_id = col_res.json()["id"]

    # 1. Create Folder 1 inside collection
    f1_payload = {
        "name": "Authentication",
        "description": "Login, OAuth2, and MFA tests",
        "order_index": 1,
    }
    f1_res = await async_client.post(f"/api/v1/collections/{col_id}/folders", json=f1_payload)
    assert f1_res.status_code == 201
    f1_data = f1_res.json()
    assert f1_data["id"] is not None
    assert f1_data["name"] == "Authentication"
    assert f1_data["collection_id"] == col_id
    folder1_id = f1_data["id"]

    # 2. Duplicate folder name inside same collection should return HTTP 400
    f1_dup = await async_client.post(f"/api/v1/collections/{col_id}/folders", json=f1_payload)
    assert f1_dup.status_code == 400
    assert "already exists" in f1_dup.json()["detail"]

    # 3. Create Folder 2 inside collection
    f2_res = await async_client.post(
        f"/api/v1/collections/{col_id}/folders",
        json={"name": "User Profiles", "order_index": 2},
    )
    assert f2_res.status_code == 201
    folder2_id = f2_res.json()["id"]

    # 4. List folders in collection
    list_folders = await async_client.get(f"/api/v1/collections/{col_id}/folders")
    assert list_folders.status_code == 200
    folder_names = [f["name"] for f in list_folders.json()]
    assert "Authentication" in folder_names
    assert "User Profiles" in folder_names

    # 5. Rename folder
    rename_res = await async_client.put(
        f"/api/v1/collections/{col_id}/folders/{folder1_id}",
        json={"name": "Auth & Tokens", "description": "Tokens & MFA"},
    )
    assert rename_res.status_code == 200
    assert rename_res.json()["name"] == "Auth & Tokens"

    # 6. Delete folder
    del_res = await async_client.delete(f"/api/v1/collections/{col_id}/folders/{folder2_id}")
    assert del_res.status_code == 204

    # Verify deleted folder is not in collection
    after_del = await async_client.get(f"/api/v1/collections/{col_id}/folders")
    remaining_names = [f["name"] for f in after_del.json()]
    assert "User Profiles" not in remaining_names
    assert "Auth & Tokens" in remaining_names


@pytest.mark.asyncio
async def test_requests_inside_folders_and_duplication(async_client):
    # Setup collection and folder
    col_res = await async_client.post(
        "/api/v1/collections",
        json={"name": "Inventory Microservice", "description": "Stock management"},
    )
    col_id = col_res.json()["id"]

    folder_res = await async_client.post(
        f"/api/v1/collections/{col_id}/folders",
        json={"name": "Warehouses", "description": "Warehouse operations"},
    )
    folder_id = folder_res.json()["id"]

    # 1. Create a request inside the folder
    req_payload = {
        "collection_id": col_id,
        "folder_id": folder_id,
        "name": "Get Warehouse Items",
        "description": "Lists products stored in warehouse #1",
        "method": "GET",
        "url": "https://httpbin.org/get?warehouse_id=1",
        "headers": {"Accept": "application/json"},
        "query_params": {"limit": "50"},
        "expected_status_code": 200,
        "max_response_time_ms": 2000,
        "assertions": [
            {
                "assertion_type": "status_code",
                "operator": "equals",
                "expected_value": "200",
            }
        ],
    }
    tc_res = await async_client.post("/api/v1/test-cases", json=req_payload)
    assert tc_res.status_code == 201
    tc_data = tc_res.json()
    assert tc_data["id"] is not None
    assert tc_data["folder_id"] == folder_id
    assert tc_data["collection_id"] == col_id
    req_id = tc_data["id"]

    # 2. Verify folder detail returns the nested test case
    f_detail_res = await async_client.get(f"/api/v1/collections/{col_id}/folders/{folder_id}")
    assert f_detail_res.status_code == 200
    f_detail = f_detail_res.json()
    assert len(f_detail["test_cases"]) == 1
    assert f_detail["test_cases"][0]["id"] == req_id

    # 3. Duplicate the request
    dup_res = await async_client.post(f"/api/v1/test-cases/{req_id}/duplicate")
    assert dup_res.status_code == 201
    dup_data = dup_res.json()
    assert dup_data["id"] != req_id
    assert dup_data["name"] == "Get Warehouse Items (Copy)"
    assert dup_data["folder_id"] == folder_id
    assert dup_data["collection_id"] == col_id
    assert len(dup_data["assertions"]) == 1

    # 4. Filter test cases by folder_id
    filter_res = await async_client.get(f"/api/v1/test-cases?folder_id={folder_id}")
    assert filter_res.status_code == 200
    assert len(filter_res.json()) == 2


@pytest.mark.asyncio
async def test_folder_not_found_and_cascade_delete(async_client):
    # Non-existent collection returns 404
    missing_col = await async_client.get("/api/v1/collections/99999/folders")
    assert missing_col.status_code == 404

    # Non-existent folder returns 404
    col_res = await async_client.post(
        "/api/v1/collections",
        json={"name": "Ephemeral Suite"},
    )
    col_id = col_res.json()["id"]

    missing_f = await async_client.get(f"/api/v1/collections/{col_id}/folders/99999")
    assert missing_f.status_code == 404

    # Deleting collection cascades and removes folders and requests
    folder_res = await async_client.post(
        f"/api/v1/collections/{col_id}/folders",
        json={"name": "Temporary Folder"},
    )
    folder_id = folder_res.json()["id"]

    del_col = await async_client.delete(f"/api/v1/collections/{col_id}")
    assert del_col.status_code == 204

    # Folder should no longer be found
    f_check = await async_client.get(f"/api/v1/collections/{col_id}/folders/{folder_id}")
    assert f_check.status_code == 404
