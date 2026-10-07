"""404 Ecossistema import worker: turns pending YouTube tracks into MP3s in Supabase Storage.

The web app inserts a `tracks` row with source='youtube' and status='pending'. `youtube_url` is either a
video link or `ytsearch:<query>` (bulk import), in which case the best studio match is picked.
This worker runs on a home computer (YouTube blocks datacenter IPs), polls for pending rows, downloads
the audio, estimates the key when none was given and marks the row `ready` (or `error`).
The app picks the change up through Supabase Realtime.
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
SEARCH_PREFIX = "ytsearch:"

YOUTUBE_RE = re.compile(r"^https?://(www\.|m\.|music\.)?(youtube\.com|youtu\.be)/")
# Search results to skip: we want the original studio recording
UNWANTED_RE = re.compile(
    r"\b(live|ao vivo|en vivo|cover|karaoke|instrumental|acoustic|ac[uú]stico|remix|8d|slowed|sped up|"
    r"nightcore|reaction|react|lesson|tutorial|backing track|guitar|drum|bass|piano|1 hour)\b",
    re.IGNORECASE,
)

# Spell detected keys the way musicians write them (Db major, not C# major)
CONVENTIONAL_MAJOR = {"C#": "Db", "D#": "Eb", "G#": "Ab", "A#": "Bb", "Gb": "F#"}
CONVENTIONAL_MINOR = {"Db": "C#", "D#": "Eb", "Gb": "F#", "Ab": "G#", "A#": "Bb"}

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def log(msg: str):
    print(time.strftime("%H:%M:%S"), msg, flush=True)


def resolve(locator: str) -> str:
    """Video URL for a link or a `ytsearch:` query."""
    if not locator.startswith(SEARCH_PREFIX):
        if not YOUTUBE_RE.match(locator):
            raise RuntimeError("Link do YouTube inválido.")
        return locator

    query = locator[len(SEARCH_PREFIX):].strip()
    opts = {"quiet": True, "no_warnings": True, "extract_flat": True, "noplaylist": True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        results = ydl.extract_info(f"ytsearch10:{query}", download=False) or {}
    for entry in results.get("entries") or []:
        title = entry.get("title") or ""
        duration = entry.get("duration") or 0
        if UNWANTED_RE.search(title) or not 60 <= duration <= MAX_DURATION_SECONDS:
            continue
        return entry.get("url") or f"https://www.youtube.com/watch?v={entry['id']}"
    raise RuntimeError(f"Nenhum vídeo adequado encontrado para: {query}")


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


def detect_key(mp3: Path) -> str:
    """Estimated key such as 'Am' or 'Eb'; empty if detection fails."""
    try:
        import essentia.standard as es

        audio = es.MonoLoader(filename=str(mp3), sampleRate=44100)()
        # 'edma' profile is tuned for popular/rock music
        key, scale, _strength = es.KeyExtractor(profileType="edma")(audio)
        minor = scale == "minor"
        return f"{CONVENTIONAL_MINOR.get(key, key)}m" if minor else CONVENTIONAL_MAJOR.get(key, key)
    except Exception as exc:  # key is a nice-to-have; never fail the import over it
        log(f"tom não detectado: {exc}")
        return ""


def process(track: dict):
    track_id, locator = track["id"], (track.get("youtube_url") or "").strip()
    log(f"importando {locator}")
    try:
        url = resolve(locator)
        with tempfile.TemporaryDirectory() as tmp:
            info, mp3 = download(url, tmp)
            key = "" if (track.get("key") or "").strip() else detect_key(mp3)
            file_path = f"yt_{uuid.uuid4().hex}.mp3"
            supabase.storage.from_(BUCKET).upload(file_path, mp3.read_bytes(), {"content-type": "audio/mpeg"})

        update = {
            "status": "ready",
            "file_path": file_path,
            "error_msg": None,
            "youtube_url": info.get("webpage_url") or url,
        }
        if key:
            update["key"] = key
        if not (track.get("name") or "").strip():
            update["name"] = info.get("track") or info.get("title") or "Sem título"
        if not (track.get("band") or "").strip():
            update["band"] = info.get("artist") or info.get("uploader") or ""
        supabase.table("tracks").update(update).eq("id", track_id).execute()
        log(f"pronto: {update.get('name', track.get('name'))} ({key or track.get('key') or 'sem tom'}) <- {info.get('title')}")
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
                .select("id, name, band, key, youtube_url")
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
