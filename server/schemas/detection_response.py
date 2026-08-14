from pydantic import BaseModel


class DetectionBox(BaseModel):

    confidence: float

    x1: int
    y1: int

    x2: int
    y2: int


class DetectionResponse(BaseModel):

    report_id: int

    garbage_detected: bool

    garbage_count: int

    highest_confidence: float

    latitude: float
    longitude: float

    detections: list[DetectionBox]