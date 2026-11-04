from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.execution import TestExecution
from app.schemas.analytics import (
    PerformanceAnalyticsResponse,
    RequestSummary,
    MethodPerformanceStat,
    LatencyTrendPoint,
    PerformanceInsight,
)

router = APIRouter(prefix="/analytics", tags=["Performance Analytics"])


@router.get("/performance", response_model=PerformanceAnalyticsResponse)
def get_performance_analytics(
    start_date: Optional[datetime] = Query(None, description="Start date filter (UTC)"),
    end_date: Optional[datetime] = Query(None, description="End date filter (UTC)"),
    method: Optional[str] = Query(None, description="HTTP method filter (GET, POST, etc.)"),
    db: Session = Depends(get_db),
):
    """
    Calculate comprehensive API performance analytics including:
    - Average, minimum, and maximum response times
    - Fastest and slowest requests
    - Total, successful, and failed tests with success rate
    - Method-level performance breakdowns
    - Time-series response-time trends
    - Automated actionable performance insights
    """
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be later than end_date",
        )

    # Base query for filtering
    query = db.query(TestExecution)

    if start_date:
        query = query.filter(TestExecution.executed_at >= start_date)
    if end_date:
        query = query.filter(TestExecution.executed_at <= end_date)
    if method:
        cleaned_method = method.strip().upper()
        query = query.filter(func.upper(TestExecution.http_method) == cleaned_method)

    total_tests = query.count()

    # Handle empty datasets cleanly without division by zero
    if total_tests == 0:
        return PerformanceAnalyticsResponse(
            total_tests=0,
            successful_tests=0,
            failed_tests=0,
            success_rate=0.0,
            avg_response_time_ms=0.0,
            min_response_time_ms=0.0,
            max_response_time_ms=0.0,
            fastest_request=None,
            slowest_request=None,
            method_performance=[],
            response_time_trends=[],
            insights=[
                PerformanceInsight(
                    category="info",
                    title="No Data Available",
                    message="No API execution records match the specified filters. Execute tests via Request Builder or Collections to populate metrics.",
                    metric="0 tests",
                )
            ],
        )

    successful_tests = query.filter(TestExecution.is_success == True).count()
    failed_tests = total_tests - successful_tests
    success_rate = round((successful_tests / total_tests) * 100.0, 1)

    # Aggregate response time stats
    stats = (
        query.with_entities(
            func.avg(TestExecution.response_time_ms).label("avg_lat"),
            func.min(TestExecution.response_time_ms).label("min_lat"),
            func.max(TestExecution.response_time_ms).label("max_lat"),
        ).first()
    )

    avg_latency = round(float(stats.avg_lat or 0.0), 1)
    min_latency = round(float(stats.min_lat or 0.0), 1)
    max_latency = round(float(stats.max_lat or 0.0), 1)

    # Fastest request
    fastest_record = (
        query.order_by(TestExecution.response_time_ms.asc(), TestExecution.executed_at.desc())
        .first()
    )
    fastest_summary = RequestSummary.model_validate(fastest_record) if fastest_record else None

    # Slowest request
    slowest_record = (
        query.order_by(TestExecution.response_time_ms.desc(), TestExecution.executed_at.desc())
        .first()
    )
    slowest_summary = RequestSummary.model_validate(slowest_record) if slowest_record else None

    # Method performance comparison
    method_stats_query = (
        query.with_entities(
            TestExecution.http_method,
            func.count(TestExecution.id).label("count"),
            func.avg(TestExecution.response_time_ms).label("avg_time"),
            func.min(TestExecution.response_time_ms).label("min_time"),
            func.max(TestExecution.response_time_ms).label("max_time"),
            func.sum(case((TestExecution.is_success == True, 1), else_=0)).label("successes"),
        )
        .group_by(TestExecution.http_method)
        .all()
    )

    method_performance: List[MethodPerformanceStat] = []
    for row in method_stats_query:
        m_name = (row.http_method or "UNKNOWN").upper()
        m_count = row.count or 0
        m_avg = round(float(row.avg_time or 0.0), 1)
        m_min = round(float(row.min_time or 0.0), 1)
        m_max = round(float(row.max_time or 0.0), 1)
        m_succ = row.successes or 0
        m_fail = m_count - m_succ
        m_rate = round((m_succ / m_count) * 100.0, 1) if m_count > 0 else 0.0

        method_performance.append(
            MethodPerformanceStat(
                method=m_name,
                count=m_count,
                avg_response_time_ms=m_avg,
                min_response_time_ms=m_min,
                max_response_time_ms=m_max,
                success_count=m_succ,
                failure_count=m_fail,
                success_rate=m_rate,
            )
        )

    # Sort method performance descending by count
    method_performance.sort(key=lambda x: x.count, reverse=True)

    # Response time trends over the last 7 days (or custom period)
    now = datetime.now(timezone.utc)
    anchor_end = end_date or now
    response_time_trends: List[LatencyTrendPoint] = []

    for i in range(6, -1, -1):
        day_start = (anchor_end - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        date_label = day_start.strftime("%b %d")

        day_query = query.filter(
            TestExecution.executed_at >= day_start,
            TestExecution.executed_at < day_end,
        )

        day_total = day_query.count()
        day_passed = day_query.filter(TestExecution.is_success == True).count()
        day_failed = day_total - day_passed

        day_agg = day_query.with_entities(
            func.avg(TestExecution.response_time_ms).label("avg_lat"),
            func.min(TestExecution.response_time_ms).label("min_lat"),
            func.max(TestExecution.response_time_ms).label("max_lat"),
        ).first()

        day_avg = round(float(day_agg.avg_lat or 0.0), 1) if day_total > 0 else 0.0
        day_min = round(float(day_agg.min_lat or 0.0), 1) if day_total > 0 else 0.0
        day_max = round(float(day_agg.max_lat or 0.0), 1) if day_total > 0 else 0.0

        response_time_trends.append(
            LatencyTrendPoint(
                date=date_label,
                avg_response_time_ms=day_avg,
                min_response_time_ms=day_min,
                max_response_time_ms=day_max,
                total_requests=day_total,
                passed_requests=day_passed,
                failed_requests=day_failed,
            )
        )

    # Automated Performance Insights Generation
    insights: List[PerformanceInsight] = []

    # 1. Health / Reliability Insight
    if success_rate >= 95.0:
        insights.append(
            PerformanceInsight(
                category="success",
                title="High Reliability",
                message=f"Outstanding reliability with a {success_rate}% success rate across {total_tests} test runs.",
                metric=f"{success_rate}% success",
            )
        )
    elif success_rate >= 80.0:
        insights.append(
            PerformanceInsight(
                category="warning",
                title="Moderate Error Rate",
                message=f"Observed {failed_tests} failed requests ({round(100 - success_rate, 1)}% failure rate). Review recent error payloads in History.",
                metric=f"{failed_tests} failed",
            )
        )
    else:
        insights.append(
            PerformanceInsight(
                category="danger",
                title="Critical Reliability Alert",
                message=f"High failure rate detected ({round(100 - success_rate, 1)}% failures). More than 20% of tests are failing assertion or status checks.",
                metric=f"{success_rate}% pass rate",
            )
        )

    # 2. Latency Insight
    if avg_latency < 200.0:
        insights.append(
            PerformanceInsight(
                category="success",
                title="Excellent Response Times",
                message=f"Average response time is very fast at {avg_latency}ms, well within standard API performance SLAs (<200ms).",
                metric=f"{avg_latency} ms avg",
            )
        )
    elif avg_latency < 800.0:
        insights.append(
            PerformanceInsight(
                category="info",
                title="Acceptable Latency",
                message=f"Average response time is {avg_latency}ms. Consider investigating slower endpoints to optimize database queries and payload sizes.",
                metric=f"{avg_latency} ms avg",
            )
        )
    else:
        insights.append(
            PerformanceInsight(
                category="danger",
                title="High Latency Warning",
                message=f"Average response time of {avg_latency}ms exceeds recommended SLA thresholds (800ms).",
                metric=f"{avg_latency} ms avg",
            )
        )

    # 3. Slowest Request vs Fastest Request Delta Insight
    if slowest_summary and fastest_summary:
        spread = round(slowest_summary.response_time_ms - fastest_summary.response_time_ms, 1)
        insights.append(
            PerformanceInsight(
                category="info" if spread < 500 else "warning",
                title="Latency Spread Variance",
                message=f"Fastest request clocked {fastest_summary.response_time_ms}ms ({fastest_summary.http_method}) vs slowest at {slowest_summary.response_time_ms}ms ({slowest_summary.http_method}), exhibiting a {spread}ms delta.",
                metric=f"Δ {spread} ms",
            )
        )

    # 4. Method Latency Insight
    if len(method_performance) > 1:
        slowest_method = max(method_performance, key=lambda x: x.avg_response_time_ms)
        insights.append(
            PerformanceInsight(
                category="info",
                title="Method Bottleneck Comparison",
                message=f"{slowest_method.method} requests exhibited the highest average response time across methods at {slowest_method.avg_response_time_ms}ms.",
                metric=f"{slowest_method.method} ({slowest_method.avg_response_time_ms}ms)",
            )
        )

    return PerformanceAnalyticsResponse(
        total_tests=total_tests,
        successful_tests=successful_tests,
        failed_tests=failed_tests,
        success_rate=success_rate,
        avg_response_time_ms=avg_latency,
        min_response_time_ms=min_latency,
        max_response_time_ms=max_latency,
        fastest_request=fastest_summary,
        slowest_request=slowest_summary,
        method_performance=method_performance,
        response_time_trends=response_time_trends,
        insights=insights,
    )
