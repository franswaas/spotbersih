from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import (
    Column,
    Integer,
    Float,
    Boolean,
    String,
    DateTime
)
from datetime import datetime


class Base(DeclarativeBase):
    pass


class Report(Base):

    __tablename__ = "reports"

    id = Column(Integer, primary_key=True)

    latitude = Column(Float, nullable=False)

    longitude = Column(Float, nullable=False)

    original_image_path = Column(String, nullable=False)

    annotated_image_path = Column(String, nullable=True)

    garbage_detected = Column(Boolean, nullable=False)

    garbage_count = Column(Integer, nullable=False)

    highest_confidence = Column(Float, nullable=False)

    status = Column(String, default="PENDING")

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )