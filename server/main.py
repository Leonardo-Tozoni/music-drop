"""Music Drop import service: turns a YouTube link into an MP3 in Supabase Storage.

POST /import {url, name?, band?, key?} with the member's Supabase access token.
A `tracks` row is created as `pending` and updated to `ready` (or `error`) when the download finishes;
the web app picks the change up through Supabase Realtime.
"""

import os
import re
import tempfile
import uuid
from pathlib import Path

import yt_dlp
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import Client, create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
# Browsers send the origin without a trailing slash, so normalize what was configured
ALLOWED_ORIGINS = [
    o.strip().rstrip("/")
    for o in os.environ.get("ALLOWED_ORIGIN", "http://localhost:5173").split(",")
    if o.strip()
]
MAX_DURATION_SECONDS = int(os.environ.get("MAX_DURATION_SECONDS", "900"))
BUCKET = "music"

YOUTUBE_RE = re.compile(r"^https?://(www\.|m\.|music\.)?(youtube\.com|youtu\.be)/")

print(f"CORS allowed origins: {ALLOWED_ORIGINS}", flush=True)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST"],
    allow_headers=["Authorization", "Content-Type"],
)


class ImportRequest(BaseModel):
    url: str
    name: str = ""
    band: str = ""
    key: str = ""


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/import", status_code=202)
def import_track(req: ImportRequest, background: BackgroundTasks, authorization: str = Header(default="")):
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(401, "Faça login para importar.")
    try:
        user = supabase.auth.get_user(token)
    except Exception:
        user = None
    if not user or not user.user:
        raise HTTPException(401, "Sessão inválida. Entre novamente.")

    url = req.url.strip()
    if not YOUTUBE_RE.match(url):
        raise HTTPException(400, "Envie um link do YouTube.")

    row = (
        supabase.table("tracks")
        .insert({
            "name": req.name.strip() or "Importando…",
            "band": req.band.strip(),
            "key": req.key.strip(),
            "source": "youtube",
            "youtube_url": url,
            "status": "pending",
        })
        .execute()
        .data[0]
    )

    background.add_task(download_and_store, row["id"], url, req.name.strip(), req.band.strip())
    return {"id": row["id"]}


def download_and_store(track_id: str, url: str, name: str, band: str):
    try:
        with tempfile.TemporaryDirectory() as tmp:
            opts = {
                "format": "bestaudio/best",
                "outtmpl": str(Path(tmp) / "audio.%(ext)s"),
                "noplaylist": True,
                "quiet": True,
                "no_warnings": True,
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

            file_path = f"yt_{uuid.uuid4().hex}.mp3"
            supabase.storage.from_(BUCKET).upload(
                file_path, mp3.read_bytes(), {"content-type": "audio/mpeg"}
            )

        update = {"status": "ready", "file_path": file_path, "error_msg": None}
        if not name:
            update["name"] = info.get("track") or info.get("title") or "Sem título"
        if not band:
            update["band"] = info.get("artist") or info.get("uploader") or ""
        supabase.table("tracks").update(update).eq("id", track_id).execute()
    except Exception as exc:  # report any failure back to the app instead of leaving it pending
        supabase.table("tracks").update({
            "status": "error",
            "error_msg": str(exc)[:500],
        }).eq("id", track_id).execute()
