from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.test_case import TestCaseOut
from app.schemas.collection_folder import CollectionFolderDetailOut

class TestCollectionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None

class TestCollectionCreate(TestCollectionBase):
    pass

class TestCollectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None

class TestCollectionOut(TestCollectionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    test_cases_count: Optional[int] = 0
    folders_count: Optional[int] = 0

class TestCollectionDetailOut(TestCollectionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    folders: List[CollectionFolderDetailOut] = []
    test_cases: List[TestCaseOut] = []
