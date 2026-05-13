from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx
import re
import os
import asyncio
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("iptv")

# ─── Models ───────────────────────────────────────────────────────────────────
class Channel(BaseModel):
    name: str
    url: str
    logo: Optional[str] = None
    group: Optional[str] = None

class Movie(BaseModel):
    id: int
    name: str
    url: str
    cover: Optional[str] = None
    group: Optional[str] = None
    rating: Optional[str] = None

class SeriesItem(BaseModel):
    id: int
    name: str
    cover: Optional[str] = None
    group: Optional[str] = None
    rating: Optional[str] = None

class MovieDetail(BaseModel):
    id: int
    name: str
    url: str
    cover: Optional[str] = None
    cover_big: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    genre: Optional[str] = None
    cast: Optional[str] = None
    director: Optional[str] = None
    year: Optional[str] = None
    rating: Optional[str] = None

class Episode(BaseModel):
    id: int
    title: str
    season: int
    episode_num: int
    url: str
    plot: Optional[str] = None
    cover: Optional[str] = None
    duration: Optional[str] = None

class SeriesDetail(BaseModel):
    id: int
    name: str
    cover: Optional[str] = None
    plot: Optional[str] = None
    seasons: dict[str, list[Episode]]

# ─── Cache state ──────────────────────────────────────────────────────────────
_CACHE_TTL = 1800  # 30 minutes

_channels_data: list | None = None
_channels_expires: float = 0.0
_channels_lock = asyncio.Lock()

_movies_data: list | None = None
_movies_expires: float = 0.0
_movies_lock = asyncio.Lock()

_series_data: list | None = None
_series_expires: float = 0.0
_series_lock = asyncio.Lock()

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="IPTV Core Backend", description="API Xtream Codes → WOC TV")

_XTREAM_HOST     = os.getenv("XTREAM_HOST",     "http://space.smartpro2.com:8789")
_XTREAM_USER     = os.getenv("XTREAM_USER",     "Hichem")
_XTREAM_PASSWORD = os.getenv("XTREAM_PASSWORD", "PASS")

_DISPLAY_TAGS = re.compile(r'\s*[\(\[][^\)\]]*[\)\]]|\s*[-|│‖]{1,3}\s*\w*\s*[-|│‖]{1,3}')

def _clean_name(name: str) -> str:
    cleaned = _DISPLAY_TAGS.sub('', name).strip()
    cleaned = re.sub(r'[★☆✪✦◈❤♛♕❖◆▶►•·]+', '', cleaned).strip()
    cleaned = re.sub(r'\s{2,}', ' ', cleaned)
    return cleaned or name.strip()

def _clean_cat(name: str) -> str:
    name = re.sub(r'[^\w\s\-/éèêëàâùûüîïôœç]', '', name, flags=re.UNICODE).strip()
    return re.sub(r'\s{2,}', ' ', name) or "Autres"

async def _fetch_json(client: httpx.AsyncClient, url: str) -> list | dict:
    r = await client.get(url, timeout=30.0)
    r.raise_for_status()
    return r.json()

# ─── Build functions ──────────────────────────────────────────────────────────
async def _build_channels() -> list:
    base = f"{_XTREAM_HOST}/player_api.php?username={_XTREAM_USER}&password={_XTREAM_PASSWORD}"
    async with httpx.AsyncClient() as client:
        categories: list = await _fetch_json(client, f"{base}&action=get_live_categories")
        channels = []
        for cat in categories:
            cat_id   = cat.get("category_id", "")
            cat_name = _clean_cat(cat.get("category_name", "Autres"))
            streams: list = await _fetch_json(client, f"{base}&action=get_live_streams&category_id={cat_id}")
            for s in streams:
                sid  = s.get("stream_id")
                name = _clean_name(s.get("name", ""))
                logo = s.get("stream_icon") or None
                url  = f"{_XTREAM_HOST}/live/{_XTREAM_USER}/{_XTREAM_PASSWORD}/{sid}.m3u8"
                if sid and name:
                    channels.append(Channel(
                        name=name, url=url,
                        logo=logo if logo and logo.startswith("http") else None,
                        group=cat_name,
                    ))
        return channels

async def _build_movies() -> list:
    base = f"{_XTREAM_HOST}/player_api.php?username={_XTREAM_USER}&password={_XTREAM_PASSWORD}"
    async with httpx.AsyncClient() as client:
        categories, streams = await asyncio.gather(
            _fetch_json(client, f"{base}&action=get_vod_categories"),
            _fetch_json(client, f"{base}&action=get_vod_streams"),
        )
    logger.info("vod_categories=%s type=%s  vod_streams=%s type=%s",
                len(categories) if isinstance(categories, list) else categories,
                type(categories).__name__,
                len(streams) if isinstance(streams, list) else streams,
                type(streams).__name__)
    if not isinstance(streams, list):
        logger.warning("get_vod_streams returned unexpected type %s: %s", type(streams).__name__, streams)
        return []
    cat_map = {c["category_id"]: _clean_cat(c.get("category_name", "Autres")) for c in (categories if isinstance(categories, list) else [])}
    movies = []
    for s in streams:
        sid  = s.get("stream_id")
        name = _clean_name(s.get("name", ""))
        ext  = s.get("container_extension") or "mp4"
        cover = s.get("stream_icon") or None
        cat_name = cat_map.get(str(s.get("category_id", "")), "Autres")
        if sid and name:
            movies.append(Movie(
                id=sid, name=name,
                url=f"{_XTREAM_HOST}/movie/{_XTREAM_USER}/{_XTREAM_PASSWORD}/{sid}.{ext}",
                cover=cover if cover and cover.startswith("http") else None,
                group=cat_name,
                rating=str(s.get("rating") or "") or None,
            ))
    return movies

async def _build_series_list() -> list:
    base = f"{_XTREAM_HOST}/player_api.php?username={_XTREAM_USER}&password={_XTREAM_PASSWORD}"
    async with httpx.AsyncClient() as client:
        categories, items = await asyncio.gather(
            _fetch_json(client, f"{base}&action=get_series_categories"),
            _fetch_json(client, f"{base}&action=get_series"),
        )
    cat_map = {c["category_id"]: _clean_cat(c.get("category_name", "Autres")) for c in categories}
    series_list = []
    for s in items:
        sid  = s.get("series_id")
        name = _clean_name(s.get("name", ""))
        cover = s.get("cover") or None
        cat_name = cat_map.get(str(s.get("category_id", "")), "Autres")
        if sid and name:
            series_list.append(SeriesItem(
                id=sid, name=name,
                cover=cover if cover and cover.startswith("http") else None,
                group=cat_name,
                rating=str(s.get("rating") or "") or None,
            ))
    return series_list

# ─── Background refresh loops ─────────────────────────────────────────────────
async def _refresh_loop_channels():
    global _channels_data, _channels_expires
    while True:
        try:
            data = await _build_channels()
            async with _channels_lock:
                if data or _channels_data is None:
                    _channels_data = data
                    _channels_expires = time.monotonic() + _CACHE_TTL
            logger.info("channels refreshed: %d items", len(data))
        except Exception as e:
            logger.error("channels refresh failed: %s", e)
        await asyncio.sleep(_CACHE_TTL)

async def _refresh_loop_movies():
    global _movies_data, _movies_expires
    while True:
        try:
            data = await _build_movies()
            async with _movies_lock:
                if data or _movies_data is None:
                    _movies_data = data
                    _movies_expires = time.monotonic() + _CACHE_TTL
            logger.info("movies refreshed: %d items", len(data))
        except Exception as e:
            logger.error("movies refresh failed: %s", e)
        await asyncio.sleep(_CACHE_TTL)

async def _refresh_loop_series():
    global _series_data, _series_expires
    while True:
        try:
            data = await _build_series_list()
            async with _series_lock:
                if data or _series_data is None:
                    _series_data = data
                    _series_expires = time.monotonic() + _CACHE_TTL
            logger.info("series refreshed: %d items", len(data))
        except Exception as e:
            logger.error("series refresh failed: %s", e)
        await asyncio.sleep(_CACHE_TTL)

@app.on_event("startup")
async def _startup():
    asyncio.create_task(_refresh_loop_channels())
    asyncio.create_task(_refresh_loop_movies())
    asyncio.create_task(_refresh_loop_series())

# ─── Endpoints ────────────────────────────────────────────────────────────────
@app.get("/api/v1/channels", response_model=List[Channel])
async def get_channels():
    global _channels_data, _channels_expires
    if _channels_data is not None and time.monotonic() < _channels_expires:
        return _channels_data
    async with _channels_lock:
        if _channels_data is not None and time.monotonic() < _channels_expires:
            return _channels_data
        try:
            data = await _build_channels()
            _channels_data = data
            _channels_expires = time.monotonic() + _CACHE_TTL
            return data
        except HTTPException:
            raise
        except Exception as e:
            if _channels_data is not None:
                return _channels_data
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/movies", response_model=List[Movie])
async def get_movies():
    global _movies_data, _movies_expires
    if _movies_data is not None and time.monotonic() < _movies_expires:
        return _movies_data
    async with _movies_lock:
        if _movies_data is not None and time.monotonic() < _movies_expires:
            return _movies_data
        try:
            data = await _build_movies()
            _movies_data = data
            _movies_expires = time.monotonic() + _CACHE_TTL
            return data
        except HTTPException:
            raise
        except Exception as e:
            if _movies_data is not None:
                return _movies_data
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/series", response_model=List[SeriesItem])
async def get_series():
    global _series_data, _series_expires
    if _series_data is not None and time.monotonic() < _series_expires:
        return _series_data
    async with _series_lock:
        if _series_data is not None and time.monotonic() < _series_expires:
            return _series_data
        try:
            data = await _build_series_list()
            _series_data = data
            _series_expires = time.monotonic() + _CACHE_TTL
            return data
        except HTTPException:
            raise
        except Exception as e:
            if _series_data is not None:
                return _series_data
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/series/{series_id}", response_model=SeriesDetail)
async def get_series_detail(series_id: int):
    base = f"{_XTREAM_HOST}/player_api.php?username={_XTREAM_USER}&password={_XTREAM_PASSWORD}"
    try:
        async with httpx.AsyncClient() as client:
            data = await _fetch_json(client, f"{base}&action=get_series_info&series_id={series_id}")
        info = data.get("info", {})
        episodes_raw: dict = data.get("episodes", {})
        seasons: dict[str, list[Episode]] = {}
        for season_num, eps in episodes_raw.items():
            season_episodes = []
            for ep in eps:
                ep_id   = ep.get("id")
                ext     = ep.get("container_extension") or "mkv"
                title   = ep.get("title") or f"Épisode {ep.get('episode_num', '?')}"
                ep_info = ep.get("info") or {}
                ep_cover = ep_info.get("movie_image") or None
                if ep_id:
                    season_episodes.append(Episode(
                        id=int(ep_id),
                        title=title,
                        season=int(season_num),
                        episode_num=ep.get("episode_num", 0),
                        url=f"{_XTREAM_HOST}/series/{_XTREAM_USER}/{_XTREAM_PASSWORD}/{ep_id}.{ext}",
                        plot=ep_info.get("plot") or None,
                        cover=ep_cover if ep_cover and ep_cover.startswith("http") else None,
                        duration=ep_info.get("duration") or None,
                    ))
            if season_episodes:
                seasons[season_num] = season_episodes
        cover = info.get("cover") or None
        return SeriesDetail(
            id=series_id,
            name=info.get("name", ""),
            cover=cover if cover and cover.startswith("http") else None,
            plot=info.get("plot") or None,
            seasons=seasons,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/movies/{vod_id}", response_model=MovieDetail)
async def get_movie_detail(vod_id: int):
    base = f"{_XTREAM_HOST}/player_api.php?username={_XTREAM_USER}&password={_XTREAM_PASSWORD}"
    try:
        async with httpx.AsyncClient() as client:
            data = await _fetch_json(client, f"{base}&action=get_vod_info&vod_id={vod_id}")
        info        = data.get("info", {})
        movie_data  = data.get("movie_data", {})
        ext         = movie_data.get("container_extension") or "mp4"
        cover       = info.get("movie_image") or info.get("cover_big") or None
        description = info.get("description") or info.get("plot") or None
        return MovieDetail(
            id=vod_id,
            name=info.get("name") or movie_data.get("name") or "",
            url=f"{_XTREAM_HOST}/movie/{_XTREAM_USER}/{_XTREAM_PASSWORD}/{vod_id}.{ext}",
            cover=cover if cover and cover.startswith("http") else None,
            cover_big=info.get("cover_big") or None,
            description=description,
            duration=info.get("duration") or None,
            genre=info.get("genre") or None,
            cast=info.get("cast") or None,
            director=info.get("director") or None,
            year=str(info.get("releasedate") or info.get("year") or "") or None,
            rating=str(info.get("rating") or info.get("rating_5based") or "") or None,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/cache/status")
async def cache_status():
    now = time.monotonic()
    return {
        "channels": {"cached": _channels_data is not None, "count": len(_channels_data) if _channels_data else 0, "expires_in": int(max(0, _channels_expires - now))},
        "movies":   {"cached": _movies_data   is not None, "count": len(_movies_data)   if _movies_data   else 0, "expires_in": int(max(0, _movies_expires   - now))},
        "series":   {"cached": _series_data   is not None, "count": len(_series_data)   if _series_data   else 0, "expires_in": int(max(0, _series_expires   - now))},
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
