# Use lightweight official Python runtime
FROM python:3.11-slim

# Set working directory inside container
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_APP=app.py

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Ensure data directory exists for persistent SQLite database
RUN mkdir -p /app/data

# Expose Flask application port
EXPOSE 5000

# Run the Flask web application
CMD ["python", "app.py"]
