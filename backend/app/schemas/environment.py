from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class EnvironmentVariableBase(BaseModel):
    key: str = Field(..., min_length=1, max_length=100)
    value: str = ""
    is_secret: bool = False

class EnvironmentVariableCreate(EnvironmentVariableBase):
    pass

class EnvironmentVariableOut(BaseModel):
    id: int
    environment_id: int
    key: str
    value: str
    is_secret: bool
    created_at: datetime

    class Config:
        from_attributes = True

class EnvironmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    base_url: str = Field("", max_length=500)
    description: Optional[str] = None
    is_active: bool = False

class EnvironmentCreate(EnvironmentBase):
    variables: Optional[List[EnvironmentVariableCreate]] = []

class EnvironmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    base_url: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    variables: Optional[List[EnvironmentVariableCreate]] = None

class EnvironmentOut(EnvironmentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    variables: List[EnvironmentVariableOut] = []

    class Config:
        from_attributes = True
