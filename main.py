"""Aurum — local server + YouTube Data API v3 metadata proxy.

The API key lives only here (api_key.txt, next to this file). The browser
never sees it: the admin page calls /api/video when you paste a YouTube
link, and this server calls YouTube with the key. Nothing is ever
downloaded or re-uploaded — only metadata is fetched, and playback happens
through YouTube's own embed. The player itself searches only the songs
stored in the Supabase catalogue.

Run the site:
    python3 main.py                 # serves http://localhost:4173
    python3 main.py serve --port 8000

CLI metadata lookup (no server):
    python main.py search "nashe si chadh gayi" -n 15 --order viewCount
"""

import argparse
import html
import json
import mimetypes
import pathlib
import re
import sys
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = pathlib.Path(__file__).resolve().parent
API_KEY_FILE = ROOT / "api_key.txt"
BASE_URL = "https://www.googleapis.com/youtube/v3"
DEFAULT_PORT = 4173
# Search costs 100 units of the project's daily quota, so repeated lookups are
# served from memory for a while instead of hitting YouTube again.
CACHE_TTL = 3600  # seconds

# (query, order) -> (fetched_at, tracks). The largest response is kept so a
# later request for fewer results can be sliced without another API call.
_search_cache: dict = {}


# ── API key ──────────────────────────────────────────────────────
def load_api_key() -> str:
    if not API_KEY_FILE.exists():
        raise SystemExit(
            f"Missing {API_KEY_FILE.name}.\n"
            "Create it next to main.py and paste your YouTube Data API v3 key in it."
        )
    key = API_KEY_FILE.read_text(encoding="utf-8").strip()
    if not key or key.startswith("PASTE_"):
        raise SystemExit(
            f"{API_KEY_FILE.name} has no real key yet.\n"
            "Paste your YouTube Data API v3 key into that file and save it."
        )
    return key


# ── YouTube calls ────────────────────────────────────────────────
def yt_get(endpoint: str, params: dict) -> dict:
    query = urllib.parse.urlencode({**params, "key": load_api_key()})
    req = urllib.request.Request(
        f"{BASE_URL}/{endpoint}?{query}",
        headers={"User-Agent": "Aurum/1.0 (+local music player)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")[:400]
        if exc.code in (403, 429) and "quota" in body.lower():
            raise RuntimeError(
                "YouTube's daily search quota is used up for this API project. "
                "It resets at midnight Pacific; until then adding YouTube songs "
                "pauses. Your library and playback keep working."
            ) from exc
        if exc.code == 403:
            raise RuntimeError(
                "YouTube said 403 — key invalid, Data API v3 not enabled, quota "
                f"exhausted, or the key is restricted. Details: {body}"
            ) from exc
        if exc.code == 429:
            raise RuntimeError(
                "YouTube is rate-limiting searches right now (429). Try again in a minute."
            ) from exc
        raise RuntimeError(f"YouTube API error {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network problem talking to YouTube: {exc.reason}") from exc


ISO_DUR = re.compile(r"^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$")


def parse_duration(iso: str) -> int:
    """'PT4M13S' -> 253 (seconds)."""
    m = ISO_DUR.match(iso or "")
    if not m:
        return 0
    h, mins, s = (int(g) if g else 0 for g in m.groups())
    return h * 3600 + mins * 60 + s


def fmt_views(count) -> str:
    try:
        n = int(count)
    except (TypeError, ValueError):
        return "—"
    for limit, suffix in ((1_000_000_000, "B"), (1_000_000, "M"), (1_000, "K")):
        if n >= limit:
            v = n / limit
            return f"{v:.1f}".rstrip("0").rstrip(".") + suffix
    return str(n)


def search_videos(query: str, max_results: int = 10, order: str = "relevance") -> list[dict]:
    """Search YouTube and return app-shaped track objects (metadata only)."""
    max_results = max(1, min(int(max_results), 50))
    cache_key = (query.strip().lower(), order)
    cached = _search_cache.get(cache_key)
    if cached and time.time() - cached[0] < CACHE_TTL and len(cached[1]) >= max_results:
        return cached[1][:max_results]

    data = yt_get(
        "search",
        {
            "part": "snippet",
            "q": query,
            "type": "video",
            "videoCategoryId": "10",  # 10 = Music — sirf music results, poora YouTube nahi
            "videoEmbeddable": "true",  # only videos we can legally embed
            "maxResults": max_results,
            "order": order,
        },
    )

    items = data.get("items", [])
    ids = [i.get("id", {}).get("videoId") for i in items if i.get("id", {}).get("videoId")]
    details = {}
    if ids:
        # 1 quota unit for the whole batch — gives duration, view counts,
        # and embeddability status so we can filter out non-playable videos.
        info = yt_get(
            "videos",
            {"part": "contentDetails,statistics,status", "id": ",".join(ids)},
        )
        details = {v["id"]: v for v in info.get("items", [])}

    tracks = []
    for item in items:
        vid = item.get("id", {}).get("videoId")
        if not vid:
            continue
        snip = item.get("snippet", {})
        det = details.get(vid, {})
        status = det.get("status", {})

        # Skip videos that YouTube does not allow embedding (owner disabled,
        # age-restricted, region-blocked, copyright claim, etc.)
        if status.get("embeddable") is not True:
            continue
        if status.get("license") not in ("youtube", None):
            continue

        thumb = (snip.get("thumbnails", {}).get("medium") or {}).get("url", "")
        tracks.append(
            {
                "id": f"yt:{vid}",
                "videoId": vid,
                "yt": True,
                # YouTube returns HTML-escaped text ("&amp;", "&#39;"), and the
                # app renders titles with textContent — unescape once here so the
                # player never shows raw entities.
                "title": html.unescape(snip.get("title") or "Untitled"),
                "artist": html.unescape(snip.get("channelTitle") or "YouTube"),
                "album": "YouTube",
                "duration": parse_duration(det.get("contentDetails", {}).get("duration", "")),
                "cover": thumb,
                "thumb": thumb,
                "views": fmt_views(det.get("statistics", {}).get("viewCount")),
                "published": snip.get("publishedAt", "")[:10],
                "url": f"https://www.youtube.com/watch?v={vid}",
                "embed": f"https://www.youtube-nocookie.com/embed/{vid}",
            }
        )

    _search_cache[cache_key] = (time.time(), tracks)
    return tracks[:max_results]


# ── Single video metadata (admin: add a YouTube song to the catalogue) ──
_video_cache: dict = {}
VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{6,20}$")


def video_info(video_id: str) -> dict:
    """Metadata for one YouTube video — 1 quota unit, cached for an hour."""
    cached = _video_cache.get(video_id)
    if cached and time.time() - cached[0] < CACHE_TTL:
        return cached[1]

    data = yt_get(
        "videos",
        {"part": "snippet,contentDetails,statistics,status", "id": video_id},
    )
    items = data.get("items") or []
    if not items:
        raise RuntimeError(
            "That YouTube video was not found — it may be deleted, private or region-locked."
        )

    item = items[0]
    if item.get("status", {}).get("embeddable") is False:
        raise RuntimeError("The owner of that video does not allow it to be embedded.")

    snippet = item.get("snippet", {})
    thumbs = snippet.get("thumbnails", {})
    thumb = (thumbs.get("high") or thumbs.get("medium") or thumbs.get("default") or {}).get("url", "")
    info = {
        "id": video_id,
        "videoId": video_id,
        "title": html.unescape(snippet.get("title") or "Untitled"),
        "artist": html.unescape(snippet.get("channelTitle") or "YouTube"),
        # The uploader's own description. The admin form pre-fills the song
        # description with it (plus a YouTube source note) so the player can
        # show where the video/audio comes from and who owns it.
        "description": html.unescape(snippet.get("description") or "")[:4000],
        "duration": parse_duration(item.get("contentDetails", {}).get("duration", "")),
        "cover": thumb or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
        "views": fmt_views(item.get("statistics", {}).get("viewCount")),
        "published": snippet.get("publishedAt", "")[:10],
        "embed": f"https://www.youtube-nocookie.com/embed/{video_id}",
    }
    _video_cache[video_id] = (time.time(), info)
    return info


# ── Local HTTP server ────────────────────────────────────────────
class Handler(BaseHTTPRequestHandler):
    server_version = "Aurum/1.0"

    def log_message(self, fmt, *args):  # quieter console
        if self.path.startswith("/api/"):
            super().log_message(fmt, *args)

    def _allowed_origin(self):
        """Allow the proxy to be called from a file:// page or a local static
        server on another port (index.html opened from disk, :4174, ...)."""
        origin = self.headers.get("Origin")
        if not origin:
            return None
        if origin == "null":
            return origin
        if re.match(r"^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?$", origin):
            return origin
        return None

    def _send_json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        origin = self._allowed_origin()
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/video":
            self.handle_video(parsed)
            return
        self.serve_static(parsed.path)

    def handle_video(self, parsed) -> None:
        params = urllib.parse.parse_qs(parsed.query)
        video_id = (params.get("id") or [""])[0].strip()
        if not VIDEO_ID_RE.match(video_id):
            self._send_json(400, {"error": "Missing or invalid ?id= YouTube video id"})
            return

        try:
            info = video_info(video_id)
        except SystemExit as exc:
            self._send_json(500, {"error": str(exc)})
            return
        except RuntimeError as exc:
            self._send_json(502, {"error": str(exc)})
            return

        self._send_json(200, info)

    def serve_static(self, path: str) -> None:
        if path in ("/", ""):
            path = "/index.html"
        try:
            target = (ROOT / urllib.parse.unquote(path).lstrip("/")).resolve()
        except (OSError, ValueError):
            self._send_json(404, {"error": f"Not found: {path}"})
            return

        # No path traversal outside the project folder.
        if ROOT != target and ROOT not in target.parents:
            self._send_json(404, {"error": f"Not found: {path}"})
            return

        # The whole point of the proxy in this file is that the YouTube key
        # stays server-side, and the repo internals are none of the browser's
        # business — so refuse the key file, dotfiles (.git, .env, ...) and
        # anything else that is not a regular site asset.
        rel = target.relative_to(ROOT)
        # Lower-case compare: macOS/Windows file systems are case-insensitive,
        # so /API_KEY.TXT resolves to the real key file.
        if rel.name.lower() == API_KEY_FILE.name.lower() or any(
            part.startswith(".") for part in rel.parts
        ):
            self._send_json(404, {"error": f"Not found: {path}"})
            return
        if not target.is_file():
            self._send_json(404, {"error": f"Not found: {path}"})
            return

        body = target.read_bytes()
        ctype = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json"):
            ctype += "; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        # dev-friendly: always serve fresh code so fixes land without
        # users needing a hard refresh (Cmd+Shift+R)
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        self.end_headers()
        self.wfile.write(body)


def serve(port: int) -> None:
    key_note = "loaded" if API_KEY_FILE.exists() and not API_KEY_FILE.read_text().strip().startswith("PASTE_") else "MISSING"
    try:
        server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    except OSError as exc:
        if exc.errno == 48:
            raise SystemExit(
                f"Port {port} is already in use.\n"
                f"Stop the other server (lsof -nP -iTCP:{port} -sTCP:LISTEN) "
                f"or run: python3 main.py serve --port {port + 1}"
            )
        raise
    print(f"Aurum running → http://localhost:{port}")
    print(f"  api key    : {key_note} ({API_KEY_FILE.name})")
    print(f"  video api  : http://localhost:{port}/api/video?id=VIDEO_ID")
    print("  Ctrl+C to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.server_close()


def main() -> None:
    argv = sys.argv[1:]
    # `python3 main.py serve ...` and bare `python3 main.py` both start the server;
    # `python3 main.py search ...` runs the CLI search.
    if not argv or argv[0] == "serve":
        parser = argparse.ArgumentParser(description="Run the Aurum local server")
        parser.add_argument("command", nargs="?", default="serve")
        parser.add_argument("--port", type=int, default=DEFAULT_PORT)
        serve(parser.parse_args().port)
        return

    if argv[0] == "search":
        parser = argparse.ArgumentParser(description="Search YouTube from the terminal")
        parser.add_argument("command")
        parser.add_argument("query", help="what to search for")
        parser.add_argument("-n", "--max-results", type=int, default=10)
        parser.add_argument("--order", default="relevance",
                            choices=["relevance", "date", "viewCount", "rating"])
        args = parser.parse_args()
        try:
            tracks = search_videos(args.query, args.max_results, args.order)
        except (SystemExit, RuntimeError) as exc:
            raise SystemExit(str(exc))
        if not tracks:
            print(f'No results for "{args.query}".')
            return
        print(f'\nResults for "{args.query}" ({len(tracks)}):\n')
        for i, t in enumerate(tracks, 1):
            print(f"{i:>2}. {t['title']}")
            print(f"    channel : {t['artist']}")
            print(f"    views   : {t['views']}   published: {t['published']}")
            print(f"    watch   : {t['url']}")
            print(f"    embed   : {t['embed']}\n")
        return

    parser = argparse.ArgumentParser(description="Aurum local server / YouTube search")
    if argv[0] in ("-h", "--help"):
        parser.print_help()
        return
    parser.print_help()
    raise SystemExit(f"\nUnknown command: {argv[0]!r} (use 'serve' or 'search')")


if __name__ == "__main__":
    main()
