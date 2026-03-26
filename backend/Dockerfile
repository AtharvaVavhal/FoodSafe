# 1. Use a lightweight Python base image (Python 3.10 is highly stable for ML)
FROM python:3.10-slim

# 2. Set environment variables to optimize Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# 3. Install system dependencies for Prophet (C++ compilers) and PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    python3-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 4. Hugging Face Spaces SECURITY REQUIREMENT: Create and switch to a non-root user
RUN useradd -m -u 1000 user
USER user

# 5. Set up the working directory and PATH for the new user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH
WORKDIR $HOME/app

# 6. Copy requirements first (this caches the heavy ML installations so rebuilds are faster)
COPY --chown=user requirements.txt .

# 7. Install Python packages
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 8. Copy the rest of your application code
COPY --chown=user . .

# 9. Hugging Face Spaces PORT REQUIREMENT
EXPOSE 7860

# 10. Start the FastAPI application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
