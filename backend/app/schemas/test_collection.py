from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.test_case import TestCaseOut

class TestCollectionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None

class TestCollectionCreate(TestCollectionBase):
    pass

class TestCollectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None

class TestCollectionOut(TestCollectionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    test_cases_count: Optional[int] = 0

    class Config:
        from_attributes = True

class TestCollectionDetailOut(TestCollectionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    test_cases: List[TestCaseOut] = []

    class Config:
        from_attributes = True
