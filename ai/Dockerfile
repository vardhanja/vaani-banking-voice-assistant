FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system deps often needed by AI/deps (ffmpeg for audio, build tools)
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg gcc libsndfile1 build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY ai/requirements.txt ./requirements.txt

RUN pip install --upgrade pip setuptools wheel \
    && pip install -r requirements.txt

# Copy only AI folder into container
COPY ai /app
COPY backend /app/backend

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
