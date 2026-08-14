from fastapi import APIRouter, HTTPException

from services.report_service import (
    get_all_reports,
    get_report_by_id,
    update_report_status
)

from schemas.report_response import (
    ReportResponse
)

from schemas.status_update import (
    StatusUpdateRequest
)

router = APIRouter()


def report_to_response(report):

    return {
        "id": report.id,

        "latitude": report.latitude,
        "longitude": report.longitude,

        "original_image_url": (
            "/uploads/original/" +
            report.original_image_path.split("\\")[-1]
            if report.original_image_path
            else None
        ),

        "annotated_image_url": (
            "/uploads/annotated/" +
            report.annotated_image_path.split("\\")[-1]
            if report.annotated_image_path
            else None
        ),

        "garbage_detected":
            report.garbage_detected,

        "garbage_count":
            report.garbage_count,

        "highest_confidence":
            report.highest_confidence,

        "status":
            report.status,

        "created_at":
            report.created_at
    }


@router.get(
    "/reports",
    response_model=list[ReportResponse]
)
def get_reports():

    reports = get_all_reports()

    return [
        report_to_response(report)
        for report in reports
    ]


@router.get(
    "/reports/{report_id}",
    response_model=ReportResponse
)
def get_report(
    report_id: int
):

    report = get_report_by_id(
        report_id
    )

    if report is None:

        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    return report_to_response(report)


@router.patch(
    "/reports/{report_id}/status",
    response_model=ReportResponse
)
def update_status(
    report_id: int,
    request: StatusUpdateRequest
):

    report = update_report_status(
        report_id,
        request.status
    )

    if report is None:

        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    return report_to_response(report)