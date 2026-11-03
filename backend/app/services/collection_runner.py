import time
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.test_collection import TestCollection
from app.models.test_case import TestCase
from app.models.environment import Environment
from app.models.execution import TestExecution, ExecutionAssertionResult, CollectionExecution
from app.schemas.assertion import AssertionCreate
from app.services.http_engine import execute_http_request
from app.services.assertion_engine import evaluate_assertions
from app.services.variable_resolver import resolve_dict_variables, resolve_full_url

async def run_test_collection(
    collection_id: int,
    db: Session,
    environment_id: Optional[int] = None,
    allow_private_ips: Optional[bool] = None,
) -> CollectionExecution:
    """
    Executes all test cases in a collection sequentially, records results, and returns the collection execution record.
    """
    collection = db.query(TestCollection).filter(TestCollection.id == collection_id).first()
    if not collection:
        raise ValueError(f"Collection with id {collection_id} not found.")

    # Fetch environment variables if provided or active
    env_vars: Dict[str, str] = {}
    base_url = ""
    env = None

    if environment_id:
        env = db.query(Environment).filter(Environment.id == environment_id).first()
    else:
        # Check if an active environment exists
        env = db.query(Environment).filter(Environment.is_active == True).first()

    if env:
        base_url = env.base_url or ""
        for v in env.variables:
            env_vars[v.key] = v.value

    # Create CollectionExecution record
    col_run = CollectionExecution(
        collection_id=collection.id,
        environment_id=env.id if env else None,
        collection_name=collection.name,
        total_tests=len(collection.test_cases),
        passed_tests=0,
        failed_tests=0,
        duration_ms=0.0,
        status="running",
    )
    db.add(col_run)
    db.commit()
    db.refresh(col_run)

    start_all = time.perf_counter()
    passed_count = 0
    failed_count = 0

    for test_case in collection.test_cases:
        # Resolve URL, Headers, Query Params, Body
        full_url = resolve_full_url(test_case.url, base_url, env_vars)
        resolved_headers = resolve_dict_variables(test_case.headers or {}, env_vars)
        resolved_params = resolve_dict_variables(test_case.query_params or {}, env_vars)
        resolved_body = test_case.body
        if resolved_body and env_vars:
            from app.services.variable_resolver import resolve_variables
            resolved_body = resolve_variables(resolved_body, env_vars)

        # Execute request
        exec_res = await execute_http_request(
            url=full_url,
            method=test_case.method,
            headers=resolved_headers,
            query_params=resolved_params,
            body=resolved_body,
            auth_type=test_case.auth_type,
            auth_config=test_case.auth_config,
            allow_private_ips=allow_private_ips,
        )

        # Build list of assertions to run:
        # 1. User defined assertions on test_case
        # 2. expected_status_code if specified
        # 3. max_response_time_ms if specified
        active_assertions: List[AssertionCreate] = []
        if test_case.expected_status_code:
            active_assertions.append(
                AssertionCreate(
                    assertion_type="status_code",
                    target="Status Code",
                    operator="equals",
                    expected_value=str(test_case.expected_status_code),
                )
            )
        if test_case.max_response_time_ms:
            active_assertions.append(
                AssertionCreate(
                    assertion_type="response_time",
                    target="Response Time",
                    operator="less_than_or_equal",
                    expected_value=str(test_case.max_response_time_ms),
                )
            )
        for a in test_case.assertions:
            active_assertions.append(
                AssertionCreate(
                    assertion_type=a.assertion_type,
                    target=a.target,
                    operator=a.operator,
                    expected_value=a.expected_value,
                )
            )

        # Evaluate assertions
        assertion_results = evaluate_assertions(
            assertions=active_assertions,
            status_code=exec_res.status_code,
            response_time_ms=exec_res.response_time_ms,
            response_headers=exec_res.headers,
            response_body=exec_res.body,
        )

        # Case passes if HTTP succeeded and all assertions passed
        all_assertions_passed = all(ar.passed for ar in assertion_results) if assertion_results else exec_res.is_success
        test_passed = exec_res.error_message is None and all_assertions_passed

        if test_passed:
            passed_count += 1
        else:
            failed_count += 1

        # Save individual TestExecution
        test_exec = TestExecution(
            test_case_id=test_case.id,
            collection_id=collection.id,
            collection_execution_id=col_run.id,
            environment_id=env.id if env else None,
            test_name=test_case.name,
            endpoint_url=exec_res.resolved_url or full_url,
            http_method=test_case.method,
            request_headers=exec_res.resolved_headers,
            request_body=resolved_body,
            status_code=exec_res.status_code,
            status_text=exec_res.status_text,
            response_time_ms=exec_res.response_time_ms,
            response_size_bytes=exec_res.response_size_bytes,
            response_headers=exec_res.headers,
            response_body=exec_res.body,
            error_message=exec_res.error_message,
            is_success=test_passed,
        )
        db.add(test_exec)
        db.commit()
        db.refresh(test_exec)

        # Save assertion results
        for ar in assertion_results:
            ar_model = ExecutionAssertionResult(
                execution_id=test_exec.id,
                assertion_type=ar.assertion_type,
                target=ar.target,
                operator=ar.operator,
                expected_value=ar.expected_value,
                actual_value=ar.actual_value,
                passed=ar.passed,
                message=ar.message,
            )
            db.add(ar_model)

        db.commit()

    total_duration_ms = (time.perf_counter() - start_all) * 1000.0

    col_run.passed_tests = passed_count
    col_run.failed_tests = failed_count
    col_run.duration_ms = round(total_duration_ms, 2)
    col_run.status = "passed" if failed_count == 0 else ("failed" if passed_count == 0 else "partial")

    db.commit()
    db.refresh(col_run)
    return col_run
