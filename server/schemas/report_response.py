from pydantic import BaseModel
from datetime import datetime
from models.status import ReportStatus

class ReportResponse(BaseModel):

    id: int

    latitude: float
    longitude: float

    original_image_url: str
    annotated_image_url: str | None

    garbage_detected: bool

    garbage_count: int

    highest_confidence: float

    status: ReportStatus

    created_at: datetime

    class Config:
        from_attributes = True