from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional
import httpx
import re
import asyncio
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

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="IPTV Core Backend", description="API Xtream Codes → TuTuTu")

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

# Xtream servers often use self-signed or no SSL certificate.
# verify=False applies only to outbound calls to user-provided Xtream hosts.
_xtream_client_kwargs = {"verify": False, "timeout": 30.0}

def _require_creds(host: Optional[str], user: Optional[str], pw: Optional[str]):
    if not host or not user or not pw:
        raise HTTPException(
            status_code=401,
            detail="Identifiants manquants. Fournissez X-Xtream-Host, X-Xtream-User et X-Xtream-Pass."
        )

# ─── Endpoints ────────────────────────────────────────────────────────────────
@app.get("/api/v1/validate")
async def validate(
    x_xtream_host: Optional[str] = Header(None),
    x_xtream_user: Optional[str] = Header(None),
    x_xtream_pass: Optional[str] = Header(None),
):
    _require_creds(x_xtream_host, x_xtream_user, x_xtream_pass)
    url = f"{x_xtream_host}/player_api.php?username={x_xtream_user}&password={x_xtream_pass}&action=get_user_info"
    try:
        async with httpx.AsyncClient(**_xtream_client_kwargs) as client:
            data = await _fetch_json(client, url)
        status = data.get("user_info", {}).get("status", "")
        if status == "Disabled":
            raise HTTPException(status_code=401, detail="Compte désactivé")
        return {"valid": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Identifiants invalides : {e}")


@app.get("/api/v1/channels", response_model=List[Channel])
async def get_channels(
    x_xtream_host: Optional[str] = Header(None),
    x_xtream_user: Optional[str] = Header(None),
    x_xtream_pass: Optional[str] = Header(None),
):
    _require_creds(x_xtream_host, x_xtream_user, x_xtream_pass)
    base = f"{x_xtream_host}/player_api.php?username={x_xtream_user}&password={x_xtream_pass}"
    try:
        async with httpx.AsyncClient(**_xtream_client_kwargs) as client:
            # Fetch categories and all streams in parallel (2 requests, not N+1)
            categories, streams = await asyncio.gather(
                _fetch_json(client, f"{base}&action=get_live_categories"),
                _fetch_json(client, f"{base}&action=get_live_streams"),
            )
        cat_map = {
            c["category_id"]: _clean_cat(c.get("category_name", "Autres"))
            for c in (categories if isinstance(categories, list) else [])
        }
        channels = []
        for s in (streams if isinstance(streams, list) else []):
            sid  = s.get("stream_id")
            name = _clean_name(s.get("name", ""))
            logo = s.get("stream_icon") or None
            cat_name = cat_map.get(str(s.get("category_id", "")), "Autres")
            url  = f"{x_xtream_host}/live/{x_xtream_user}/{x_xtream_pass}/{sid}.m3u8"
            if sid and name:
                channels.append(Channel(
                    name=name, url=url,
                    logo=logo if logo and logo.startswith("http") else None,
                    group=cat_name,
                ))
        return channels
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/movies", response_model=List[Movie])
async def get_movies(
    x_xtream_host: Optional[str] = Header(None),
    x_xtream_user: Optional[str] = Header(None),
    x_xtream_pass: Optional[str] = Header(None),
):
    _require_creds(x_xtream_host, x_xtream_user, x_xtream_pass)
    base = f"{x_xtream_host}/player_api.php?username={x_xtream_user}&password={x_xtream_pass}"
    try:
        async with httpx.AsyncClient(**_xtream_client_kwargs) as client:
            categories, streams = await asyncio.gather(
                _fetch_json(client, f"{base}&action=get_vod_categories"),
                _fetch_json(client, f"{base}&action=get_vod_streams"),
            )
        if not isinstance(streams, list):
            return []
        cat_map = {
            c["category_id"]: _clean_cat(c.get("category_name", "Autres"))
            for c in (categories if isinstance(categories, list) else [])
        }
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
                    url=f"{x_xtream_host}/movie/{x_xtream_user}/{x_xtream_pass}/{sid}.{ext}",
                    cover=cover if cover and cover.startswith("http") else None,
                    group=cat_name,
                    rating=str(s.get("rating") or "") or None,
                ))
        return movies
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/series", response_model=List[SeriesItem])
async def get_series(
    x_xtream_host: Optional[str] = Header(None),
    x_xtream_user: Optional[str] = Header(None),
    x_xtream_pass: Optional[str] = Header(None),
):
    _require_creds(x_xtream_host, x_xtream_user, x_xtream_pass)
    base = f"{x_xtream_host}/player_api.php?username={x_xtream_user}&password={x_xtream_pass}"
    try:
        async with httpx.AsyncClient(**_xtream_client_kwargs) as client:
            categories, items = await asyncio.gather(
                _fetch_json(client, f"{base}&action=get_series_categories"),
                _fetch_json(client, f"{base}&action=get_series"),
            )
        cat_map = {
            c["category_id"]: _clean_cat(c.get("category_name", "Autres"))
            for c in (categories if isinstance(categories, list) else [])
        }
        series_list = []
        for s in (items if isinstance(items, list) else []):
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/series/{series_id}", response_model=SeriesDetail)
async def get_series_detail(
    series_id: int,
    x_xtream_host: Optional[str] = Header(None),
    x_xtream_user: Optional[str] = Header(None),
    x_xtream_pass: Optional[str] = Header(None),
):
    _require_creds(x_xtream_host, x_xtream_user, x_xtream_pass)
    base = f"{x_xtream_host}/player_api.php?username={x_xtream_user}&password={x_xtream_pass}"
    try:
        async with httpx.AsyncClient(**_xtream_client_kwargs) as client:
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
                        url=f"{x_xtream_host}/series/{x_xtream_user}/{x_xtream_pass}/{ep_id}.{ext}",
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
async def get_movie_detail(
    vod_id: int,
    x_xtream_host: Optional[str] = Header(None),
    x_xtream_user: Optional[str] = Header(None),
    x_xtream_pass: Optional[str] = Header(None),
):
    _require_creds(x_xtream_host, x_xtream_user, x_xtream_pass)
    base = f"{x_xtream_host}/player_api.php?username={x_xtream_user}&password={x_xtream_pass}"
    try:
        async with httpx.AsyncClient(**_xtream_client_kwargs) as client:
            data = await _fetch_json(client, f"{base}&action=get_vod_info&vod_id={vod_id}")
        info        = data.get("info", {})
        movie_data  = data.get("movie_data", {})
        ext         = movie_data.get("container_extension") or "mp4"
        cover       = info.get("movie_image") or info.get("cover_big") or None
        description = info.get("description") or info.get("plot") or None
        return MovieDetail(
            id=vod_id,
            name=info.get("name") or movie_data.get("name") or "",
            url=f"{x_xtream_host}/movie/{x_xtream_user}/{x_xtream_pass}/{vod_id}.{ext}",
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


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
