FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install system dependencies including Docker CLI
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        docker-cli && \
    rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create non-root user, grant root group membership for docker.sock access, and setup /data
RUN useradd -m -u 1000 -s /bin/bash autoheal && \
    usermod -aG root autoheal && \
    mkdir -p /data && \
    chown -R autoheal:autoheal /app /data

# Copy application source
COPY app ./app
COPY tests ./tests

USER autoheal

EXPOSE 5001

HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=10s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5001/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5001"]
