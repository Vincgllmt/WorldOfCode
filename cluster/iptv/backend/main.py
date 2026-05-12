from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx
import re
import os
import asyncio
import time

class Channel(BaseModel):
    name: str
    url: str
    logo: Optional[str] = None
    group: Optional[str] = None

_CACHE_TTL = 1800  # 30 minutes

_cache_data: list | None = None
_cache_expires: float = 0.0
_cache_lock = asyncio.Lock()

app = FastAPI(
    title="IPTV Core Backend",
    description="API Xtream Codes → WOC TV"
)

_XTREAM_HOST     = os.getenv("XTREAM_HOST",     "http://space.smartpro2.com:8789")
_XTREAM_USER     = os.getenv("XTREAM_USER",     "Hichem")
_XTREAM_PASSWORD = os.getenv("XTREAM_PASSWORD", "PASS")

_DISPLAY_TAGS = re.compile(r'\s*[\(\[][^\)\]]*[\)\]]|\s*[-|│‖]{1,3}\s*\w*\s*[-|│‖]{1,3}')

def _clean_name(name: str) -> str:
    cleaned = _DISPLAY_TAGS.sub('', name).strip()
    cleaned = re.sub(r'[★☆✪✦◈❤♛♕❖◆▶►•·]+', '', cleaned).strip()
    cleaned = re.sub(r'\s{2,}', ' ', cleaned)
    return cleaned or name.strip()

async def _fetch_json(client: httpx.AsyncClient, url: str) -> list | dict:
    r = await client.get(url, timeout=20.0)
    r.raise_for_status()
    return r.json()

async def _build_channels() -> list:
    base = f"{_XTREAM_HOST}/player_api.php?username={_XTREAM_USER}&password={_XTREAM_PASSWORD}"
    async with httpx.AsyncClient() as client:
        categories: list = await _fetch_json(client, f"{base}&action=get_live_categories")
        channels = []
        for cat in categories:
            cat_id   = cat.get("category_id", "")
            cat_name = cat.get("category_name", "Autres")
            cat_name = re.sub(r'[^\w\s\-/éèêëàâùûüîïôœç]', '', cat_name, flags=re.UNICODE).strip()
            cat_name = re.sub(r'\s{2,}', ' ', cat_name) or "Autres"

            streams: list = await _fetch_json(
                client, f"{base}&action=get_live_streams&category_id={cat_id}"
            )
            for s in streams:
                sid  = s.get("stream_id")
                name = _clean_name(s.get("name", ""))
                logo = s.get("stream_icon") or None
                url  = f"{_XTREAM_HOST}/live/{_XTREAM_USER}/{_XTREAM_PASSWORD}/{sid}.m3u8"
                if sid and name:
                    channels.append(Channel(
                        name=name,
                        url=url,
                        logo=logo if logo and logo.startswith("http") else None,
                        group=cat_name,
                    ))
        return channels

async def _refresh_loop():
    global _cache_data, _cache_expires
    while True:
        try:
            channels = await _build_channels()
            async with _cache_lock:
                _cache_data = channels
                _cache_expires = time.monotonic() + _CACHE_TTL
        except Exception:
            pass  # keep stale cache on failure, retry next cycle
        await asyncio.sleep(_CACHE_TTL)

@app.on_event("startup")
async def _startup():
    asyncio.create_task(_refresh_loop())

@app.get("/api/v1/channels", response_model=List[Channel])
async def get_channels():
    global _cache_data, _cache_expires

    # Fast path: serve from cache
    if _cache_data is not None and time.monotonic() < _cache_expires:
        return _cache_data

    # Slow path: first request or cache expired — only one coroutine fetches
    async with _cache_lock:
        if _cache_data is not None and time.monotonic() < _cache_expires:
            return _cache_data
        try:
            channels = await _build_channels()
            _cache_data = channels
            _cache_expires = time.monotonic() + _CACHE_TTL
            return channels
        except HTTPException:
            raise
        except Exception as e:
            if _cache_data is not None:
                return _cache_data  # return stale rather than crashing
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/cache/status")
async def cache_status():
    remaining = max(0.0, _cache_expires - time.monotonic())
    return {
        "cached": _cache_data is not None,
        "channels": len(_cache_data) if _cache_data else 0,
        "expires_in_seconds": int(remaining),
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
