from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


class CollectionFolder(Base):
    __tablename__ = "collection_folders"

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("test_collections.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    collection = relationship("TestCollection", back_populates="folders")
    test_cases = relationship("TestCase", back_populates="folder", cascade="all, delete-orphan", order_by="TestCase.order_index")
