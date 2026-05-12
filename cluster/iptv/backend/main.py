from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx

class Channel(BaseModel):
    name: str
    url: str
    logo: Optional[str] = None
    group: Optional[str] = None

app = FastAPI(
    title="IPTV Core Backend", 
    description="API de distribution de flux TNT"
)

def parse_m3u_content(content: str) -> List[Channel]:
    channels = []
    lines = content.strip().split('\n')
    current_name, current_logo, current_group = "", None, None
    
    for line in lines:
        line = line.strip()
        if not line: continue
        if line.startswith("#EXTINF:"):
            if "," in line:
                meta_part, name_part = line.split(",", 1)
                current_name = name_part.strip()
                if 'tvg-logo="' in meta_part:
                    current_logo = meta_part.split('tvg-logo="')[1].split('"')[0]
                if 'group-title="' in meta_part:
                    current_group = meta_part.split('group-title="')[1].split('"')[0]
        elif not line.startswith("#"):
            if current_name and line.startswith("http"):
                channels.append(Channel(
                    name=current_name, url=line, logo=current_logo, group=current_group
                ))
                current_name, current_logo, current_group = "", None, None
    return channels

@app.get("/api/v1/channels", response_model=List[Channel])
async def get_channels():
    # URL des chaînes publiques et gratuites françaises
    url_tnt = "https://iptv-org.github.io/iptv/countries/fr.m3u"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url_tnt, follow_redirects=True, timeout=20.0)
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Source TNT injoignable")
            return parse_m3u_content(response.text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}