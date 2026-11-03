from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.execution import ExecutionDetailOut

class ReportFilterParams(BaseModel):
    collection_id: Optional[int] = None
    status: Optional[str] = None # "success", "failed", "all"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    http_method: Optional[str] = None

class ReportSummary(BaseModel):
    generated_at: datetime
    total_tests: int
    passed_tests: int
    failed_tests: int
    success_rate: float
    avg_response_time_ms: float
    total_failed_assertions: int
    executions: List[ExecutionDetailOut] = []
