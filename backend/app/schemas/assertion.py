from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class AssertionBase(BaseModel):
    assertion_type: str = Field(..., description="status_code, response_time, jsonpath, header, body_contains")
    target: Optional[str] = Field(None, description="e.g. '$.data.id' or 'content-type'")
    operator: str = Field(default="equals", description="equals, not_equals, contains, not_contains, greater_than, less_than, is_null, is_not_null, exists")
    expected_value: Optional[str] = None

class AssertionCreate(AssertionBase):
    pass

class AssertionOut(AssertionBase):
    id: int
    test_case_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class AssertionResultOut(BaseModel):
    id: Optional[int] = None
    assertion_type: str
    target: Optional[str] = None
    operator: str
    expected_value: Optional[str] = None
    actual_value: Optional[str] = None
    passed: bool
    message: str

    class Config:
        from_attributes = True
