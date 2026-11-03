from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from app.schemas.assertion import AssertionCreate, AssertionResultOut

class AdHocExecuteRequest(BaseModel):
    name: Optional[str] = "Ad-hoc Request"
    url: str = Field(..., min_length=1)
    method: str = Field(default="GET")
    headers: Optional[Dict[str, str]] = Field(default_factory=dict)
    query_params: Optional[Dict[str, str]] = Field(default_factory=dict)
    body: Optional[str] = None
    auth_type: Optional[str] = "none" # none, bearer, api_key, basic
    auth_config: Optional[Dict[str, Any]] = Field(default_factory=dict) # e.g. {"token": "..."} or {"key": "X-API-KEY", "value": "...", "addTo": "header"}
    timeout: Optional[float] = 30.0
    environment_id: Optional[int] = None
    assertions: Optional[List[AssertionCreate]] = Field(default_factory=list)
    test_case_id: Optional[int] = None
    collection_id: Optional[int] = None
    save_history: bool = True

class ExecuteResponse(BaseModel):
    execution_id: Optional[int] = None
    status_code: Optional[int] = None
    status_text: Optional[str] = None
    response_time_ms: float = 0.0
    response_size_bytes: int = 0
    headers: Dict[str, str] = Field(default_factory=dict)
    body: Optional[str] = None
    error_message: Optional[str] = None
    is_success: bool = False
    assertion_results: List[AssertionResultOut] = Field(default_factory=list)
    resolved_url: str = ""
    resolved_headers: Dict[str, str] = Field(default_factory=dict)
