from enum import Enum


class ReportStatus(str, Enum):

    PENDING = "PENDING"

    IN_PROGRESS = "IN_PROGRESS"

    RESOLVED = "RESOLVED"

    REJECTED = "REJECTED"