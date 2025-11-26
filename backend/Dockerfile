# Use an ARM64-compatible Python base image
FROM python:3.11-slim-bookworm

# Set the working directory
WORKDIR /app

# Install build dependencies required for compiling C extensions
# 'gcc', 'libc-dev' (or 'build-essential'), and 'python3-dev' are essential for C compiling.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    libz-dev && \ 
    rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application code (including AI module)
COPY . .

# Expose the port Dokku expects (5000 is the default)
ENV PORT=5000
EXPOSE 5000

# Run the web process using the Procfile command
# The entry point command must be the same as your Procfile
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:5000", "backend.app:app"]