from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.test_case import TestCaseOut


class CollectionFolderBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    order_index: Optional[int] = 0


class CollectionFolderCreate(CollectionFolderBase):
    pass


class CollectionFolderUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    order_index: Optional[int] = None


class CollectionFolderOut(CollectionFolderBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    collection_id: int
    test_cases_count: int = 0
    created_at: datetime
    updated_at: datetime


class CollectionFolderDetailOut(CollectionFolderBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    collection_id: int
    test_cases: List[TestCaseOut] = []
    created_at: datetime
    updated_at: datetime
