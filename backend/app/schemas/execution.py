from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from app.schemas.assertion import AssertionResultOut

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

    class Config:
        from_attributes = True

class ExecutionDetailOut(ExecutionOut):
    request_headers: Optional[Dict[str, Any]] = None
    request_body: Optional[str] = None
    response_headers: Optional[Dict[str, Any]] = None
    response_body: Optional[str] = None
    assertion_results: List[AssertionResultOut] = []

    class Config:
        from_attributes = True

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

    class Config:
        from_attributes = True
