"""404 Ecossistema import worker: turns pending YouTube tracks into MP3s in Supabase Storage.

The web app inserts a `tracks` row with source='youtube' and status='pending'. This worker runs on a
home computer (YouTube blocks datacenter IPs), polls for pending rows, downloads the audio and marks
the row `ready` (or `error`). The app picks the change up through Supabase Realtime.
"""

import os
import re
import tempfile
import time
import uuid
from pathlib import Path

import yt_dlp
from supabase import Client, create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
MAX_DURATION_SECONDS = int(os.environ.get("MAX_DURATION_SECONDS", "900"))
POLL_SECONDS = int(os.environ.get("POLL_SECONDS", "10"))
BUCKET = "music"

YOUTUBE_RE = re.compile(r"^https?://(www\.|m\.|music\.)?(youtube\.com|youtu\.be)/")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def log(msg: str):
    print(time.strftime("%H:%M:%S"), msg, flush=True)


def download(url: str, tmp: str):
    opts = {
        "format": "bestaudio/best",
        "outtmpl": str(Path(tmp) / "audio.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "match_filter": yt_dlp.utils.match_filter_func(f"duration <= {MAX_DURATION_SECONDS}"),
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }],
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
    mp3 = Path(tmp) / "audio.mp3"
    if not info or not mp3.exists():
        raise RuntimeError(f"Vídeo não baixado (limite de {MAX_DURATION_SECONDS // 60} min?)")
    return info, mp3


def process(track: dict):
    track_id, url = track["id"], (track.get("youtube_url") or "").strip()
    log(f"importando {url}")
    try:
        if not YOUTUBE_RE.match(url):
            raise RuntimeError("Link do YouTube inválido.")
        with tempfile.TemporaryDirectory() as tmp:
            info, mp3 = download(url, tmp)
            file_path = f"yt_{uuid.uuid4().hex}.mp3"
            supabase.storage.from_(BUCKET).upload(file_path, mp3.read_bytes(), {"content-type": "audio/mpeg"})

        update = {"status": "ready", "file_path": file_path, "error_msg": None}
        if not (track.get("name") or "").strip():
            update["name"] = info.get("track") or info.get("title") or "Sem título"
        if not (track.get("band") or "").strip():
            update["band"] = info.get("artist") or info.get("uploader") or ""
        supabase.table("tracks").update(update).eq("id", track_id).execute()
        log(f"pronto: {update.get('name', track.get('name'))}")
    except Exception as exc:  # report any failure back to the app instead of leaving it pending
        log(f"erro: {exc}")
        supabase.table("tracks").update({
            "status": "error",
            "error_msg": str(exc)[:500],
        }).eq("id", track_id).execute()


def main():
    log(f"aguardando imports do YouTube (verifica a cada {POLL_SECONDS}s)")
    while True:
        try:
            pending = (
                supabase.table("tracks")
                .select("id, name, band, youtube_url")
                .eq("source", "youtube")
                .eq("status", "pending")
                .order("created_at")
                .execute()
                .data
            )
            for track in pending:
                process(track)
        except Exception as exc:  # network hiccups must not kill the worker
            log(f"falha ao consultar o Supabase: {exc}")
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
