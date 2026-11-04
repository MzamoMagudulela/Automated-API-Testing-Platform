from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from app.schemas.assertion import AssertionResultOut

class AssertionResultCreate(BaseModel):
    assertion_type: str = Field(..., min_length=1)
    target: Optional[str] = None
    operator: str = Field(default="equals")
    expected_value: Optional[str] = None
    actual_value: Optional[str] = None
    passed: bool = Field(default=False)
    message: str = Field(default="")

class ExecutionCreate(BaseModel):
    test_name: str = Field(..., min_length=1, max_length=200)
    endpoint_url: str = Field(..., min_length=1, max_length=1000)
    http_method: str = Field(..., min_length=2, max_length=10)
    status_code: Optional[int] = Field(None, ge=100, le=599)
    status_text: Optional[str] = Field(None, max_length=100)
    response_time_ms: float = Field(default=0.0, ge=0.0)
    response_size_bytes: int = Field(default=0, ge=0)
    is_success: bool = Field(default=False)
    error_message: Optional[str] = None
    request_headers: Optional[Dict[str, Any]] = Field(default_factory=dict)
    request_body: Optional[str] = None
    response_headers: Optional[Dict[str, Any]] = Field(default_factory=dict)
    response_body: Optional[str] = None
    test_case_id: Optional[int] = None
    collection_id: Optional[int] = None
    environment_id: Optional[int] = None
    assertion_results: Optional[List[AssertionResultCreate]] = Field(default_factory=list)

class ExecutionOut(BaseModel):
    id: int
    test_case_id: Optional[int] = None
    collection_id: Optional[int] = None
    collection_execution_id: Optional[int] = None
    environment_id: Optional[int] = None
    test_name: str
    endpoint_url: str
    http_method: str
    status_code: Optional[int] = None
    status_text: Optional[str] = None
    response_time_ms: float
    response_size_bytes: int
    is_success: bool
    error_message: Optional[str] = None
    executed_at: datetime

    model_config = {"from_attributes": True}

class ExecutionDetailOut(ExecutionOut):
    request_headers: Optional[Dict[str, Any]] = None
    request_body: Optional[str] = None
    response_headers: Optional[Dict[str, Any]] = None
    response_body: Optional[str] = None
    assertion_results: List[AssertionResultOut] = []

    model_config = {"from_attributes": True}

class CollectionExecutionOut(BaseModel):
    id: int
    collection_id: int
    environment_id: Optional[int] = None
    collection_name: str
    total_tests: int
    passed_tests: int
    failed_tests: int
    duration_ms: float
    status: str
    executed_at: datetime
    executions: List[ExecutionDetailOut] = []

    model_config = {"from_attributes": True}

class HistoryPaginationResponse(BaseModel):
    items: List[ExecutionOut]
    total: int
    page: int
    page_size: int
    total_pages: int

class HistorySummaryStats(BaseModel):
    total_executions: int
    passed_count: int
    failed_count: int
    success_rate: float
    avg_response_time_ms: float
    fastest_response_time_ms: Optional[float] = None
    slowest_response_time_ms: Optional[float] = None
