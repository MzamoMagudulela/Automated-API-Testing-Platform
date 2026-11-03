from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.environment import Environment
from app.models.execution import TestExecution, ExecutionAssertionResult
from app.schemas.request import AdHocExecuteRequest, ExecuteResponse
from app.services.http_engine import execute_http_request
from app.services.assertion_engine import evaluate_assertions
from app.services.variable_resolver import resolve_dict_variables, resolve_full_url, resolve_variables

router = APIRouter(prefix="/execute", tags=["Execution Engine"])

@router.post("", response_model=ExecuteResponse)
async def execute_ad_hoc_request(
    req: AdHocExecuteRequest,
    db: Session = Depends(get_db),
):
    # Retrieve environment variables
    env_vars = {}
    base_url = ""
    env = None
    if req.environment_id:
        env = db.query(Environment).filter(Environment.id == req.environment_id).first()
    else:
        env = db.query(Environment).filter(Environment.is_active == True).first()

    if env:
        base_url = env.base_url or ""
        for v in env.variables:
            env_vars[v.key] = v.value

    full_url = resolve_full_url(req.url, base_url, env_vars)
    resolved_headers = resolve_dict_variables(req.headers or {}, env_vars)
    resolved_params = resolve_dict_variables(req.query_params or {}, env_vars)
    resolved_body = req.body
    if resolved_body and env_vars:
        resolved_body = resolve_variables(resolved_body, env_vars)

    exec_res = await execute_http_request(
        url=full_url,
        method=req.method,
        headers=resolved_headers,
        query_params=resolved_params,
        body=resolved_body,
        auth_type=req.auth_type,
        auth_config=req.auth_config,
        timeout=req.timeout,
    )

    # Evaluate assertions if provided
    assertion_results = []
    if req.assertions:
        assertion_results = evaluate_assertions(
            assertions=req.assertions,
            status_code=exec_res.status_code,
            response_time_ms=exec_res.response_time_ms,
            response_headers=exec_res.headers,
            response_body=exec_res.body,
        )

    all_passed = all(ar.passed for ar in assertion_results) if assertion_results else exec_res.is_success
    test_passed = exec_res.error_message is None and all_passed

    exec_res.assertion_results = assertion_results
    exec_res.is_success = test_passed

    # Save to history if enabled
    if req.save_history:
        test_exec = TestExecution(
            test_case_id=req.test_case_id,
            collection_id=req.collection_id,
            environment_id=env.id if env else None,
            test_name=req.name or "Ad-hoc Request",
            endpoint_url=exec_res.resolved_url or full_url,
            http_method=req.method.upper(),
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

    return exec_res
