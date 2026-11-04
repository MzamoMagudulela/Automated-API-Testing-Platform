from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.assertion import AssertionCreate, AssertionOut

class TestCaseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    collection_id: Optional[int] = None
    folder_id: Optional[int] = None
    method: str = Field(default="GET")
    url: str = Field(..., min_length=1, max_length=1000)
    headers: Optional[Dict[str, Any]] = Field(default_factory=dict)
    query_params: Optional[Dict[str, Any]] = Field(default_factory=dict)
    body: Optional[str] = None
    auth_type: Optional[str] = Field(default="none")
    auth_config: Optional[Dict[str, Any]] = Field(default_factory=dict)
    expected_status_code: Optional[int] = None
    max_response_time_ms: Optional[int] = None
    order_index: Optional[int] = 0

class TestCaseCreate(TestCaseBase):
    assertions: Optional[List[AssertionCreate]] = []

class TestCaseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    collection_id: Optional[int] = None
    folder_id: Optional[int] = None
    method: Optional[str] = None
    url: Optional[str] = None
    headers: Optional[Dict[str, Any]] = None
    query_params: Optional[Dict[str, Any]] = None
    body: Optional[str] = None
    auth_type: Optional[str] = None
    auth_config: Optional[Dict[str, Any]] = None
    expected_status_code: Optional[int] = None
    max_response_time_ms: Optional[int] = None
    order_index: Optional[int] = None
    assertions: Optional[List[AssertionCreate]] = None

class TestCaseOut(TestCaseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    assertions: List[AssertionOut] = []
