from datetime import datetime, timedelta, timezone
from typing import Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy import func, case
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.execution import TestExecution
from app.models.test_collection import TestCollection
from app.models.test_case import TestCase
from app.schemas.dashboard import DashboardStats, ActivityTrendPoint, LatencyTrendPoint, MethodDistributionItem
from app.schemas.execution import ExecutionOut

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    # 1. Total executions, passed, failed
    total_tests = db.query(func.count(TestExecution.id)).scalar() or 0
    successful_tests = db.query(func.count(TestExecution.id)).filter(TestExecution.is_success == True).scalar() or 0
    failed_tests = total_tests - successful_tests
    success_rate = round((successful_tests / total_tests * 100.0), 1) if total_tests > 0 else 0.0

    # 2. Average response time
    avg_latency = db.query(func.avg(TestExecution.response_time_ms)).scalar() or 0.0
    avg_latency = round(float(avg_latency), 1)

    # 3. Counts of collections and test cases
    total_collections = db.query(func.count(TestCollection.id)).scalar() or 0
    total_test_cases = db.query(func.count(TestCase.id)).scalar() or 0

    # 4. Recent executions (last 10)
    recent_records = (
        db.query(TestExecution)
        .order_by(TestExecution.executed_at.desc())
        .limit(10)
        .all()
    )
    recent_executions = [ExecutionOut.model_validate(r) for r in recent_records]

    # 5. Method Distribution
    method_rows = (
        db.query(TestExecution.http_method, func.count(TestExecution.id))
        .group_by(TestExecution.http_method)
        .all()
    )
    method_distribution = [
        MethodDistributionItem(method=m or "GET", count=cnt)
        for m, cnt in method_rows
    ]

    # 6. Activity & Latency trends (last 7 days)
    now = datetime.now(timezone.utc)
    activity_trends: List[ActivityTrendPoint] = []
    latency_trends: List[LatencyTrendPoint] = []

    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        date_label = day_start.strftime("%b %d")

        day_total = (
            db.query(func.count(TestExecution.id))
            .filter(TestExecution.executed_at >= day_start, TestExecution.executed_at < day_end)
            .scalar() or 0
        )
        day_passed = (
            db.query(func.count(TestExecution.id))
            .filter(TestExecution.executed_at >= day_start, TestExecution.executed_at < day_end, TestExecution.is_success == True)
            .scalar() or 0
        )
        day_failed = day_total - day_passed

        day_avg_latency = (
            db.query(func.avg(TestExecution.response_time_ms))
            .filter(TestExecution.executed_at >= day_start, TestExecution.executed_at < day_end)
            .scalar() or 0.0
        )

        activity_trends.append(
            ActivityTrendPoint(
                date=date_label,
                total=day_total,
                passed=day_passed,
                failed=day_failed,
            )
        )
        latency_trends.append(
            LatencyTrendPoint(
                date=date_label,
                avg_latency_ms=round(float(day_avg_latency), 1),
            )
        )

    return DashboardStats(
        total_tests=total_tests,
        successful_tests=successful_tests,
        failed_tests=failed_tests,
        success_rate=success_rate,
        avg_response_time_ms=avg_latency,
        total_collections=total_collections,
        total_test_cases=total_test_cases,
        recent_executions=recent_executions,
        activity_trends=activity_trends,
        latency_trends=latency_trends,
        method_distribution=method_distribution,
    )
