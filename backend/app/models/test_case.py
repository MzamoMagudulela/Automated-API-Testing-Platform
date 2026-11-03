from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.session import Base

class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("test_collections.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    method = Column(String(10), nullable=False, default="GET", index=True)
    url = Column(String(1000), nullable=False)
    headers = Column(JSON, nullable=True, default=dict)
    query_params = Column(JSON, nullable=True, default=dict)
    body = Column(Text, nullable=True)
    auth_type = Column(String(50), nullable=True, default="none")  # none, bearer, api_key, basic
    auth_config = Column(JSON, nullable=True, default=dict)
    expected_status_code = Column(Integer, nullable=True)
    max_response_time_ms = Column(Integer, nullable=True)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    collection = relationship("TestCollection", back_populates="test_cases")
    assertions = relationship("TestCaseAssertion", back_populates="test_case", cascade="all, delete-orphan")
    executions = relationship("TestExecution", back_populates="test_case", cascade="all, delete-orphan")
