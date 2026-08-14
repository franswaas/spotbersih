from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form
)

from services.detection_service import (
    process_detection
)

from schemas.detection_response import (
    DetectionResponse
)

router = APIRouter()


@router.get("/health")
def health():
    return {
        "status": "ok"
    }


@router.post("/detect", response_model=DetectionResponse)
async def detect(
    file: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...)
):

    return process_detection(
        file,
        latitude,
        longitude
    )
