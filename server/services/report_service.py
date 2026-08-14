from database import SessionLocal
from models.report import Report



def get_all_reports():

    db = SessionLocal()

    try:

        reports = db.query(
            Report
        ).order_by(
            Report.created_at.desc()
        ).all()

        return reports

    finally:
        db.close()


def get_report_by_id(
    report_id: int
):

    db = SessionLocal()

    try:

        report = db.query(
            Report
        ).filter(
            Report.id == report_id
        ).first()

        return report

    finally:
        db.close()

def update_report_status(
    report_id: int,
    status: str
):

    db = SessionLocal()

    try:

        report = db.query(
            Report
        ).filter(
            Report.id == report_id
        ).first()

        if report is None:
            return None

        report.status = status

        db.commit()

        db.refresh(report)

        return report

    finally:
        db.close()