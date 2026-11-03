from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean, JSON
from sqlalchemy.orm import relationship
from app.database.session import Base

class CollectionExecution(Base):
    __tablename__ = "collection_executions"

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("test_collections.id", ondelete="CASCADE"), nullable=False, index=True)
    environment_id = Column(Integer, ForeignKey("environments.id", ondelete="SET NULL"), nullable=True)
    collection_name = Column(String(150), nullable=False)
    total_tests = Column(Integer, default=0)
    passed_tests = Column(Integer, default=0)
    failed_tests = Column(Integer, default=0)
    duration_ms = Column(Float, default=0.0)
    status = Column(String(50), default="completed") # passed, failed, partial
    executed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    collection = relationship("TestCollection", back_populates="runs")
    executions = relationship("TestExecution", back_populates="collection_execution", cascade="all, delete-orphan")


class TestExecution(Base):
    __tablename__ = "test_executions"

    id = Column(Integer, primary_key=True, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id", ondelete="SET NULL"), nullable=True, index=True)
    collection_id = Column(Integer, ForeignKey("test_collections.id", ondelete="SET NULL"), nullable=True, index=True)
    collection_execution_id = Column(Integer, ForeignKey("collection_executions.id", ondelete="SET NULL"), nullable=True, index=True)
    environment_id = Column(Integer, ForeignKey("environments.id", ondelete="SET NULL"), nullable=True)

    test_name = Column(String(200), nullable=False, default="Ad-hoc Request", index=True)
    endpoint_url = Column(String(1000), nullable=False)
    http_method = Column(String(10), nullable=False, index=True)
    request_headers = Column(JSON, nullable=True, default=dict)
    request_body = Column(Text, nullable=True)

    status_code = Column(Integer, nullable=True, index=True)
    status_text = Column(String(100), nullable=True)
    response_time_ms = Column(Float, nullable=False, default=0.0)
    response_size_bytes = Column(Integer, nullable=False, default=0)
    response_headers = Column(JSON, nullable=True, default=dict)
    response_body = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    is_success = Column(Boolean, nullable=False, default=False, index=True)
    executed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    test_case = relationship("TestCase", back_populates="executions")
    collection_execution = relationship("CollectionExecution", back_populates="executions")
    assertion_results = relationship("ExecutionAssertionResult", back_populates="execution", cascade="all, delete-orphan")


class ExecutionAssertionResult(Base):
    __tablename__ = "execution_assertion_results"

    id = Column(Integer, primary_key=True, index=True)
    execution_id = Column(Integer, ForeignKey("test_executions.id", ondelete="CASCADE"), nullable=False, index=True)
    assertion_type = Column(String(50), nullable=False)
    target = Column(String(255), nullable=True)
    operator = Column(String(50), nullable=False)
    expected_value = Column(Text, nullable=True)
    actual_value = Column(Text, nullable=True)
    passed = Column(Boolean, nullable=False, default=False)
    message = Column(Text, nullable=False)

    execution = relationship("TestExecution", back_populates="assertion_results")
