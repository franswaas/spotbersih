import os
import uuid
import shutil
import cv2

from ultralytics import YOLO

from database import SessionLocal
from models.report import Report
from config import (
    MODEL_PATH,
    ORIGINAL_UPLOADS_DIR,
    ANNOTATED_UPLOADS_DIR
)


model = YOLO(str(MODEL_PATH))


def process_detection(
    file,
    latitude,
    longitude
):

    db = SessionLocal()

    try:

        file_id = str(uuid.uuid4())

        extension = os.path.splitext(file.filename)[1]

        original_filename = f"{file_id}{extension}"

        original_path = (
            ORIGINAL_UPLOADS_DIR
            / original_filename
        )   

        with open(original_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        results = model.predict(
            source=original_path,
            conf=0.25
        )

        result = results[0]

        annotated_filename = f"{file_id}{extension}"

        annotated_path = (
            ANNOTATED_UPLOADS_DIR
            / annotated_filename
        )

        annotated_image = result.plot()

        cv2.imwrite(
            str(annotated_path),
            annotated_image
        )

        detections = []

        highest_confidence = 0

        for box in result.boxes:

            x1, y1, x2, y2 = box.xyxy[0].tolist()

            confidence = float(box.conf[0])

            highest_confidence = max(
                highest_confidence,
                confidence
            )

            detections.append({
                "confidence": round(confidence, 3),
                "x1": round(x1),
                "y1": round(y1),
                "x2": round(x2),
                "y2": round(y2)
            })

        report = Report(
            latitude=latitude,
            longitude=longitude,

            original_image_path=str(original_path),
            annotated_image_path=str(annotated_path),

            garbage_detected=len(detections) > 0,

            garbage_count=len(detections),

            highest_confidence=highest_confidence
        )

        db.add(report)
        db.commit()
        db.refresh(report)

        return {
            "report_id": report.id,

            "garbage_detected": len(detections) > 0,

            "garbage_count": len(detections),

            "highest_confidence": round(
                highest_confidence,
                3
            ),

            "latitude": latitude,
            "longitude": longitude,

            "detections": detections
        }

    finally:
        db.close()