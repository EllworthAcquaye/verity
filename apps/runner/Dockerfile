FROM python:3.14.7-slim@sha256:cae66f2ef0ec51a9891263eeee7f987dacf0a9879e8aa9353d5606e0530619a5
WORKDIR /app
RUN addgroup --system verity && adduser --system --ingroup verity verity
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY verity_runner ./verity_runner
USER verity
EXPOSE 8000
CMD ["uvicorn", "verity_runner.main:app", "--host", "0.0.0.0", "--port", "8000"]
