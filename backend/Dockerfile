FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system deps required by some Python packages
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libsndfile1 build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first for better caching
COPY requirements-backend.txt ./requirements-backend.txt

RUN pip install --upgrade pip setuptools wheel \
    && pip install -r requirements-backend.txt

# Copy project
COPY . /app

EXPOSE 8000

CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
