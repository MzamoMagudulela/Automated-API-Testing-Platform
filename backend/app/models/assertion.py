from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base

class TestCaseAssertion(Base):
    __tablename__ = "test_case_assertions"

    id = Column(Integer, primary_key=True, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    assertion_type = Column(String(50), nullable=False)  # status_code, response_time, jsonpath, header, body_contains
    target = Column(String(255), nullable=True)          # e.g. '$.data.id' or 'content-type'
    operator = Column(String(50), nullable=False, default="equals") # equals, not_equals, contains, greater_than, less_than, etc.
    expected_value = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    test_case = relationship("TestCase", back_populates="assertions")
