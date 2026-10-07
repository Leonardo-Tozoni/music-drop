FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# yt-dlp needs a JavaScript runtime to download from YouTube
COPY --from=denoland/deno:bin /deno /usr/local/bin/deno

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY worker.py .

# YouTube changes often; update yt-dlp on every start so restarting the container fixes most breakages
CMD ["sh", "-c", "pip install --no-cache-dir -q --root-user-action=ignore --disable-pip-version-check -U 'yt-dlp[default]' && python -u worker.py"]
