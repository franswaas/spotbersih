from pathlib import Path
from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

DATABASE_URL = (
    f"postgresql+psycopg2://"
    f"{DB_USER}:{DB_PASSWORD}@"
    f"{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

MODEL_PATH = BASE_DIR / "ml_models" / "best.pt"

UPLOADS_DIR = BASE_DIR / "uploads"

ORIGINAL_UPLOADS_DIR = (
    UPLOADS_DIR / "original"
)

ANNOTATED_UPLOADS_DIR = (
    UPLOADS_DIR / "annotated"
)