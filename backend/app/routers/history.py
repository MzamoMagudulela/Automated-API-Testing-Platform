import math
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.execution import TestExecution, ExecutionAssertionResult
from app.schemas.execution import (
    ExecutionOut,
    ExecutionDetailOut,
    ExecutionCreate,
    HistoryPaginationResponse,
    HistorySummaryStats,
)

router = APIRouter(prefix="/history", tags=["Execution History"])

def apply_history_filters(
    query,
    method: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
):
    if method:
        query = query.filter(TestExecution.http_method == method.upper())
    if status_filter:
        s_clean = status_filter.lower().strip()
        if s_clean in ("pass", "success", "true"):
            query = query.filter(TestExecution.is_success == True)
        elif s_clean in ("fail", "failed", "false"):
            query = query.filter(TestExecution.is_success == False)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (TestExecution.test_name.ilike(search_fmt)) |
            (TestExecution.endpoint_url.ilike(search_fmt))
        )
    if start_date:
        query = query.filter(TestExecution.executed_at >= start_date)
    if end_date:
        query = query.filter(TestExecution.executed_at <= end_date)
    return query

@router.get("", response_model=HistoryPaginationResponse)
def get_execution_history(
    method: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    # Support backward-compatibility limit & offset if provided
    limit: Optional[int] = Query(None, ge=1, le=200),
    offset: Optional[int] = Query(None, ge=0),
    db: Session = Depends(get_db),
):
    """
    Retrieve paginated test execution history with search, method, status and date range filtering.
    """
    query = db.query(TestExecution)
    query = apply_history_filters(query, method, status_filter, search, start_date, end_date)

    total = query.count()

    # Determine pagination
    if limit is not None:
        effective_page_size = limit
        effective_offset = offset if offset is not None else 0
        effective_page = (effective_offset // effective_page_size) + 1
    else:
        effective_page = page
        effective_page_size = page_size
        effective_offset = (page - 1) * page_size

    total_pages = math.ceil(total / effective_page_size) if total > 0 else 1

    items = (
        query.order_by(TestExecution.executed_at.desc())
        .offset(effective_offset)
        .limit(effective_page_size)
        .all()
    )

    return HistoryPaginationResponse(
        items=[ExecutionOut.model_validate(item) for item in items],
        total=total,
        page=effective_page,
        page_size=effective_page_size,
        total_pages=total_pages,
    )

@router.post("", response_model=ExecutionDetailOut, status_code=status.HTTP_201_CREATED)
def create_execution_record(
    exec_in: ExecutionCreate,
    db: Session = Depends(get_db),
):
    """
    Manually create and store an API test execution result with optional assertions.
    """
    try:
        test_exec = TestExecution(
            test_name=exec_in.test_name,
            endpoint_url=exec_in.endpoint_url,
            http_method=exec_in.http_method.upper(),
            status_code=exec_in.status_code,
            status_text=exec_in.status_text,
            response_time_ms=exec_in.response_time_ms,
            response_size_bytes=exec_in.response_size_bytes,
            is_success=exec_in.is_success,
            error_message=exec_in.error_message,
            request_headers=exec_in.request_headers,
            request_body=exec_in.request_body,
            response_headers=exec_in.response_headers,
            response_body=exec_in.response_body,
            test_case_id=exec_in.test_case_id,
            collection_id=exec_in.collection_id,
            environment_id=exec_in.environment_id,
        )
        db.add(test_exec)
        db.commit()
        db.refresh(test_exec)

        if exec_in.assertion_results:
            for ar in exec_in.assertion_results:
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
            db.refresh(test_exec)

        return test_exec
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to store execution record: {str(e)}")

@router.get("/summary", response_model=HistorySummaryStats)
def get_history_summary_stats(
    method: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    """
    Calculate summary metrics for execution history (total, passed, failed, success rate, avg/fastest/slowest latency).
    """
    query = db.query(TestExecution)
    query = apply_history_filters(query, method, status_filter, search, start_date, end_date)

    total = query.count()
    if total == 0:
        return HistorySummaryStats(
            total_executions=0,
            passed_count=0,
            failed_count=0,
            success_rate=0.0,
            avg_response_time_ms=0.0,
            fastest_response_time_ms=None,
            slowest_response_time_ms=None,
        )

    passed_count = query.filter(TestExecution.is_success == True).count()
    failed_count = total - passed_count
    success_rate = round((passed_count / total) * 100.0, 1)

    avg_ms = query.with_entities(func.avg(TestExecution.response_time_ms)).scalar() or 0.0
    min_ms = query.with_entities(func.min(TestExecution.response_time_ms)).scalar()
    max_ms = query.with_entities(func.max(TestExecution.response_time_ms)).scalar()

    return HistorySummaryStats(
        total_executions=total,
        passed_count=passed_count,
        failed_count=failed_count,
        success_rate=success_rate,
        avg_response_time_ms=round(float(avg_ms), 1),
        fastest_response_time_ms=round(float(min_ms), 1) if min_ms is not None else None,
        slowest_response_time_ms=round(float(max_ms), 1) if max_ms is not None else None,
    )

@router.get("/{id}", response_model=ExecutionDetailOut)
def get_execution_detail(id: int, db: Session = Depends(get_db)):
    """
    Retrieve full details of an individual test execution including headers, body and assertion results.
    """
    exec_record = db.query(TestExecution).filter(TestExecution.id == id).first()
    if not exec_record:
        raise HTTPException(status_code=404, detail="Execution record not found.")
    return exec_record

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_execution(id: int, db: Session = Depends(get_db)):
    """
    Delete an individual execution record by its unique ID.
    """
    exec_record = db.query(TestExecution).filter(TestExecution.id == id).first()
    if not exec_record:
        raise HTTPException(status_code=404, detail="Execution record not found.")
    try:
        db.delete(exec_record)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error deleting execution: {str(e)}")

@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_all_history(db: Session = Depends(get_db)):
    """
    Delete all stored test execution history records.
    """
    try:
        db.query(TestExecution).delete()
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error clearing history: {str(e)}")
