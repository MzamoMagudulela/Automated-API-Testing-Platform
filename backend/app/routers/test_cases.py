from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.test_case import TestCase
from app.models.assertion import TestCaseAssertion
from app.models.environment import Environment
from app.models.execution import TestExecution, ExecutionAssertionResult
from app.schemas.test_case import TestCaseCreate, TestCaseUpdate, TestCaseOut
from app.schemas.request import ExecuteResponse
from app.schemas.assertion import AssertionCreate
from app.services.http_engine import execute_http_request
from app.services.assertion_engine import evaluate_assertions
from app.services.variable_resolver import resolve_dict_variables, resolve_full_url, resolve_variables

router = APIRouter(prefix="/test-cases", tags=["Test Cases"])

@router.get("", response_model=List[TestCaseOut])
def get_test_cases(
    collection_id: Optional[int] = None,
    method: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    db: Session = Depends(get_db),
):
    query = db.query(TestCase)

    if collection_id is not None:
        query = query.filter(TestCase.collection_id == collection_id)
    if method:
        query = query.filter(TestCase.method == method.upper())
    if search:
        search_fmt = f"%{search}%"
        query = query.filter((TestCase.name.ilike(search_fmt)) | (TestCase.url.ilike(search_fmt)))

    if sort_by == "name":
        order_col = TestCase.name.asc() if sort_order == "asc" else TestCase.name.desc()
    elif sort_by == "order_index":
        order_col = TestCase.order_index.asc() if sort_order == "asc" else TestCase.order_index.desc()
    else:
        order_col = TestCase.created_at.asc() if sort_order == "asc" else TestCase.created_at.desc()

    test_cases = query.order_by(order_col).all()
    return test_cases

@router.post("", response_model=TestCaseOut, status_code=status.HTTP_201_CREATED)
def create_test_case(tc_in: TestCaseCreate, db: Session = Depends(get_db)):
    test_case = TestCase(
        collection_id=tc_in.collection_id,
        name=tc_in.name,
        description=tc_in.description,
        method=tc_in.method.upper(),
        url=tc_in.url,
        headers=tc_in.headers or {},
        query_params=tc_in.query_params or {},
        body=tc_in.body,
        auth_type=tc_in.auth_type or "none",
        auth_config=tc_in.auth_config or {},
        expected_status_code=tc_in.expected_status_code,
        max_response_time_ms=tc_in.max_response_time_ms,
        order_index=tc_in.order_index or 0,
    )
    db.add(test_case)
    db.commit()
    db.refresh(test_case)

    if tc_in.assertions:
        for a in tc_in.assertions:
            assertion_model = TestCaseAssertion(
                test_case_id=test_case.id,
                assertion_type=a.assertion_type,
                target=a.target,
                operator=a.operator,
                expected_value=a.expected_value,
            )
            db.add(assertion_model)
        db.commit()
        db.refresh(test_case)

    return test_case

@router.get("/{id}", response_model=TestCaseOut)
def get_test_case(id: int, db: Session = Depends(get_db)):
    test_case = db.query(TestCase).filter(TestCase.id == id).first()
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found.")
    return test_case

@router.put("/{id}", response_model=TestCaseOut)
def update_test_case(id: int, tc_in: TestCaseUpdate, db: Session = Depends(get_db)):
    test_case = db.query(TestCase).filter(TestCase.id == id).first()
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found.")

    if tc_in.name is not None:
        test_case.name = tc_in.name
    if tc_in.description is not None:
        test_case.description = tc_in.description
    if tc_in.collection_id is not None:
        test_case.collection_id = tc_in.collection_id
    if tc_in.method is not None:
        test_case.method = tc_in.method.upper()
    if tc_in.url is not None:
        test_case.url = tc_in.url
    if tc_in.headers is not None:
        test_case.headers = tc_in.headers
    if tc_in.query_params is not None:
        test_case.query_params = tc_in.query_params
    if tc_in.body is not None:
        test_case.body = tc_in.body
    if tc_in.auth_type is not None:
        test_case.auth_type = tc_in.auth_type
    if tc_in.auth_config is not None:
        test_case.auth_config = tc_in.auth_config
    if tc_in.expected_status_code is not None:
        test_case.expected_status_code = tc_in.expected_status_code
    if tc_in.max_response_time_ms is not None:
        test_case.max_response_time_ms = tc_in.max_response_time_ms
    if tc_in.order_index is not None:
        test_case.order_index = tc_in.order_index

    if tc_in.assertions is not None:
        db.query(TestCaseAssertion).filter(TestCaseAssertion.test_case_id == id).delete()
        for a in tc_in.assertions:
            assertion_model = TestCaseAssertion(
                test_case_id=test_case.id,
                assertion_type=a.assertion_type,
                target=a.target,
                operator=a.operator,
                expected_value=a.expected_value,
            )
            db.add(assertion_model)

    db.commit()
    db.refresh(test_case)
    return test_case

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_test_case(id: int, db: Session = Depends(get_db)):
    test_case = db.query(TestCase).filter(TestCase.id == id).first()
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found.")
    db.delete(test_case)
    db.commit()
    return None

@router.post("/{id}/execute", response_model=ExecuteResponse)
async def execute_single_test_case(
    id: int,
    environment_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    test_case = db.query(TestCase).filter(TestCase.id == id).first()
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found.")

    env_vars = {}
    base_url = ""
    env = None
    if environment_id:
        env = db.query(Environment).filter(Environment.id == environment_id).first()
    else:
        env = db.query(Environment).filter(Environment.is_active == True).first()

    if env:
        base_url = env.base_url or ""
        for v in env.variables:
            env_vars[v.key] = v.value

    full_url = resolve_full_url(test_case.url, base_url, env_vars)
    resolved_headers = resolve_dict_variables(test_case.headers or {}, env_vars)
    resolved_params = resolve_dict_variables(test_case.query_params or {}, env_vars)
    resolved_body = test_case.body
    if resolved_body and env_vars:
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
    )

    # Collect assertions
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

    assertion_results = evaluate_assertions(
        assertions=active_assertions,
        status_code=exec_res.status_code,
        response_time_ms=exec_res.response_time_ms,
        response_headers=exec_res.headers,
        response_body=exec_res.body,
    )

    all_passed = all(ar.passed for ar in assertion_results) if assertion_results else exec_res.is_success
    test_passed = exec_res.error_message is None and all_passed

    # Save to history
    test_exec = TestExecution(
        test_case_id=test_case.id,
        collection_id=test_case.collection_id,
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

    exec_res.execution_id = test_exec.id
    exec_res.assertion_results = assertion_results
    exec_res.is_success = test_passed
    return exec_res
