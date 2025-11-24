# syntax=docker/dockerfile:1.7

FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app:/app/backend

WORKDIR /code

# Install system packages required for psycopg2, soundfile, and voice verification
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        libsndfile1 \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first for better layer caching
COPY backend/requirements.txt /code/requirements.txt
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r /code/requirements.txt

# Copy backend source into a backend sub-directory
COPY backend /code/backend

# Set the working directory to the parent of the package
WORKDIR /code

# Set the command to run the application
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "backend.main:app", "--bind", "0.0.0.0:${PORT:-8000}"]
