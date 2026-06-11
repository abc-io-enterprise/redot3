FROM python:3.12-alpine

WORKDIR /app

# Install docker CLI for container-level self-heal
RUN apk add --no-cache docker-cli bash

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY orchestrator.py .

ENV PYTHONUNBUFFERED=1
ENV CHECK_INTERVAL_SECONDS=30

CMD ["python", "-u", "orchestrator.py"]
