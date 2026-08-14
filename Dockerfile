FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY yolo_api_server.py .
COPY ml_models/ ml_models/

ENV PORT=8000
EXPOSE 8000

CMD ["python", "yolo_api_server.py"]
