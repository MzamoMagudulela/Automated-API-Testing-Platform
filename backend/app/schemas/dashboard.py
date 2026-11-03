from typing import Dict, List, Optional
from pydantic import BaseModel
from app.schemas.execution import ExecutionOut

class ActivityTrendPoint(BaseModel):
    date: str
    total: int
    passed: int
    failed: int

class LatencyTrendPoint(BaseModel):
    date: str
    avg_latency_ms: float

class MethodDistributionItem(BaseModel):
    method: str
    count: int

class DashboardStats(BaseModel):
    total_tests: int
    successful_tests: int
    failed_tests: int
    success_rate: float
    avg_response_time_ms: float
    total_collections: int
    total_test_cases: int
    recent_executions: List[ExecutionOut]
    activity_trends: List[ActivityTrendPoint]
    latency_trends: List[LatencyTrendPoint]
    method_distribution: List[MethodDistributionItem]
