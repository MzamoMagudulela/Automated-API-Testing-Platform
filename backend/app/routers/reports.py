from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.execution import TestExecution
from app.schemas.report import ReportSummary
from app.schemas.execution import ExecutionDetailOut
from app.services.report_generator import generate_csv_report, generate_pdf_report

router = APIRouter(prefix="/reports", tags=["Reports"])

def filter_report_executions(
    db: Session,
    collection_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    method: Optional[str] = None,
    limit: int = 200,
) -> List[TestExecution]:
    query = db.query(TestExecution)
    if collection_id is not None:
        query = query.filter(TestExecution.collection_id == collection_id)
    if status_filter:
        if status_filter.lower() == "pass":
            query = query.filter(TestExecution.is_success == True)
        elif status_filter.lower() == "fail":
            query = query.filter(TestExecution.is_success == False)
    if method:
        query = query.filter(TestExecution.http_method == method.upper())

    return query.order_by(TestExecution.executed_at.desc()).limit(limit).all()

@router.get("/summary", response_model=ReportSummary)
def get_report_summary(
    collection_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    method: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    executions = filter_report_executions(db, collection_id, status_filter, method, limit)
    total = len(executions)
    passed = sum(1 for e in executions if e.is_success)
    failed = total - passed
    success_rate = round((passed / total * 100.0), 1) if total > 0 else 0.0
    avg_latency = round(sum(e.response_time_ms for e in executions) / total, 1) if total > 0 else 0.0

    total_failed_assertions = sum(
        sum(1 for a in e.assertion_results if not a.passed)
        for e in executions
    )

    return ReportSummary(
        generated_at=datetime.now(timezone.utc),
        total_tests=total,
        passed_tests=passed,
        failed_tests=failed,
        success_rate=success_rate,
        avg_response_time_ms=avg_latency,
        total_failed_assertions=total_failed_assertions,
        executions=[ExecutionDetailOut.model_validate(e) for e in executions],
    )

@router.get("/export/csv")
def export_csv_report(
    collection_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    method: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    executions = filter_report_executions(db, collection_id, status_filter, method, limit=500)
    csv_content = generate_csv_report(executions)

    filename = f"api_testlab_report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.get("/export/pdf")
def export_pdf_report(
    collection_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    method: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    executions = filter_report_executions(db, collection_id, status_filter, method, limit=200)
    pdf_bytes = generate_pdf_report(executions)

    filename = f"api_testlab_report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
