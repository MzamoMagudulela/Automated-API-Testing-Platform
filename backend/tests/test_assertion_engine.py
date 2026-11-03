import json
from app.schemas.assertion import AssertionCreate
from app.services.assertion_engine import evaluate_assertions, extract_jsonpath

def test_jsonpath_extraction():
    data = {
        "status": "success",
        "data": {
            "user": {
                "id": 42,
                "name": "Grace Hopper",
                "roles": ["admin", "dev"],
            }
        }
    }
    assert extract_jsonpath(data, "$.status") == "success"
    assert extract_jsonpath(data, "$.data.user.id") == 42
    assert extract_jsonpath(data, "$.data.user.name") == "Grace Hopper"
    assert extract_jsonpath(data, "$.data.user.roles[0]") == "admin"
    assert extract_jsonpath(data, "$.nonexistent") is None

def test_evaluate_status_code_assertion():
    assertions = [
        AssertionCreate(assertion_type="status_code", target="status", operator="equals", expected_value="200"),
        AssertionCreate(assertion_type="status_code", target="status", operator="not_equals", expected_value="500"),
        AssertionCreate(assertion_type="status_code", target="status", operator="less_than", expected_value="300"),
    ]
    results = evaluate_assertions(assertions, status_code=200, response_time_ms=50.0, response_headers={}, response_body="")
    assert all(r.passed for r in results)

def test_evaluate_response_time_assertion():
    assertions = [
        AssertionCreate(assertion_type="response_time", target="time", operator="less_than_or_equal", expected_value="200"),
        AssertionCreate(assertion_type="response_time", target="time", operator="greater_than", expected_value="500"),
    ]
    results = evaluate_assertions(assertions, status_code=200, response_time_ms=120.5, response_headers={}, response_body="")
    assert results[0].passed is True
    assert results[1].passed is False

def test_evaluate_header_assertion():
    headers = {"Content-Type": "application/json; charset=utf-8", "X-Request-Id": "req-987"}
    assertions = [
        AssertionCreate(assertion_type="header", target="content-type", operator="contains", expected_value="application/json"),
        AssertionCreate(assertion_type="header", target="X-Request-Id", operator="equals", expected_value="req-987"),
    ]
    results = evaluate_assertions(assertions, status_code=200, response_time_ms=10.0, response_headers=headers, response_body="")
    assert all(r.passed for r in results)

def test_evaluate_jsonpath_assertions():
    body = json.dumps({
        "status": "success",
        "count": 5,
        "items": [{"id": 1, "title": "First"}],
        "metadata": None,
    })
    assertions = [
        AssertionCreate(assertion_type="jsonpath", target="$.status", operator="equals", expected_value="success"),
        AssertionCreate(assertion_type="jsonpath", target="$.count", operator="greater_than", expected_value="2"),
        AssertionCreate(assertion_type="jsonpath", target="$.metadata", operator="is_null", expected_value=None),
        AssertionCreate(assertion_type="jsonpath", target="$.items[0].title", operator="contains", expected_value="Fir"),
        AssertionCreate(assertion_type="jsonpath", target="$.missing_prop", operator="exists", expected_value=None),
    ]
    results = evaluate_assertions(assertions, status_code=200, response_time_ms=25.0, response_headers={}, response_body=body)
    assert results[0].passed is True
    assert results[1].passed is True
    assert results[2].passed is True
    assert results[3].passed is True
    assert results[4].passed is False  # missing_prop should fail exists check
