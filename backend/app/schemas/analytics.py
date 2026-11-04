from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class RequestSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: Optional[str] = None
    endpoint_url: str
    http_method: str
    status_code: Optional[int] = None
    response_time_ms: float
    is_success: bool
    executed_at: datetime


class MethodPerformanceStat(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    method: str
    count: int
    avg_response_time_ms: float
    min_response_time_ms: float
    max_response_time_ms: float
    success_count: int
    failure_count: int
    success_rate: float


class LatencyTrendPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: str
    avg_response_time_ms: float
    min_response_time_ms: float
    max_response_time_ms: float
    total_requests: int
    passed_requests: int
    failed_requests: int


class PerformanceInsight(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category: str  # 'success', 'warning', 'danger', 'info'
    title: str
    message: str
    metric: Optional[str] = None


class PerformanceAnalyticsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_tests: int
    successful_tests: int
    failed_tests: int
    success_rate: float
    avg_response_time_ms: float
    min_response_time_ms: float
    max_response_time_ms: float
    fastest_request: Optional[RequestSummary] = None
    slowest_request: Optional[RequestSummary] = None
    method_performance: List[MethodPerformanceStat]
    response_time_trends: List[LatencyTrendPoint]
    insights: List[PerformanceInsight]
