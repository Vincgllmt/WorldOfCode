#!/usr/bin/env python3
"""Panneau Xtream minimal — pour vérifier l'app TV sans le fournisseur réel.

Sert `player_api.php` avec un catalogue de quelques entrées : de quoi rendre la
**branche succès** des écrans Films et Séries, donc la rangée « Reprendre la
lecture », l'écran d'achat, et tout ce qui n'existe qu'une fois le catalogue
chargé. C'est ce qui manquait pour vérifier ces écrans à l'émulateur (§71).

    python3 tools/fake_xtream.py &          # écoute sur 0.0.0.0:8099
    # dans l'app, lien M3U :
    #   http://10.0.2.2:8099/get.php?username=demo&password=demo
    # `Credentials.parseUrl` y repère username/password et bascule en Xtream.

⚠️ L'émulateur doit être **sans proxy** : un `global_http_proxy_host` résiduel
suffit à faire échouer toute requête sans qu'aucune n'atteigne ce serveur, et
l'app affiche « connexion au serveur impossible » (§71.1). Vérifier par
`adb shell settings get global global_http_proxy_host`.

Les identifiants sont factices : ce fichier ne contient aucun secret.
"""
import json, re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

def cats(pairs):
    return [{"category_id": str(i), "category_name": n} for i, n in pairs]

VOD_CATS = cats([(1, "ACTION"), (2, "COMEDIE")])
VOD = [
    {"stream_id": 101, "name": "Film Alpha",   "stream_icon": "", "category_id": "1",
     "container_extension": "mp4", "rating": "7.5"},
    {"stream_id": 102, "name": "Film Beta",    "stream_icon": "", "category_id": "1",
     "container_extension": "mp4", "rating": "6.1"},
    {"stream_id": 103, "name": "Film Gamma",   "stream_icon": "", "category_id": "2",
     "container_extension": "mp4", "rating": "8.0"},
    {"stream_id": 104, "name": "Film Delta",   "stream_icon": "", "category_id": "2",
     "container_extension": "mp4", "rating": "5.4"},
]
SER_CATS = cats([(10, "DRAME")])
SERIES = [
    {"series_id": 900, "name": "Serie Omega", "cover": "", "category_id": "10", "rating": "8.2"},
]
LIVE_CATS = cats([(20, "GENERALISTES")])
LIVE = [
    {"stream_id": 201, "name": "Chaine Un",   "stream_icon": "", "category_id": "20",
     "epg_channel_id": "un"},
    {"stream_id": 202, "name": "Chaine Deux", "stream_icon": "", "category_id": "20",
     "epg_channel_id": "deux"},
]

ROUTES = {
    None:                     {"user_info": {"auth": 1, "status": "Active"},
                               "server_info": {"url": "10.0.2.2", "port": "8099"}},
    "get_vod_categories":     VOD_CATS,
    "get_vod_streams":        VOD,
    "get_series_categories":  SER_CATS,
    "get_series":             SERIES,
    "get_live_categories":    LIVE_CATS,
    "get_live_streams":       LIVE,
    "get_short_epg":          {"epg_listings": []},
}

class H(BaseHTTPRequestHandler):
    def log_message(self, fmt, *a):
        print("  %s" % (fmt % a), flush=True)

    def _send(self, payload, code=200):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_HEAD(self):
        self.send_response(200); self.send_header("Content-Length", "0"); self.end_headers()

    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        action = q.get("action", [None])[0]
        if u.path.endswith("player_api.php"):
            if action in ROUTES:
                return self._send(ROUTES[action])
            return self._send([])
        return self._send({"ok": True})

if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8099), H).serve_forever()
