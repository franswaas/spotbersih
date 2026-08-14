from pydantic import BaseModel

from models.status import ReportStatus


class StatusUpdateRequest(BaseModel):

    status: ReportStatus