FROM python:3.12-slim

WORKDIR /app

# Install system deps needed by some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer-cache friendly)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Create memory directory if it doesn't exist
RUN mkdir -p memory && \
    [ -f memory/simulation_log.json ] || echo "[]" > memory/simulation_log.json

EXPOSE 8000

CMD ["python", "server.py"]
