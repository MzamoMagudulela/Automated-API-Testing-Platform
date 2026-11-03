from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from app.database.session import Base

class TestCollection(Base):
    __tablename__ = "test_collections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    test_cases = relationship("TestCase", back_populates="collection", cascade="all, delete-orphan", order_by="TestCase.order_index")
    runs = relationship("CollectionExecution", back_populates="collection", cascade="all, delete-orphan")
