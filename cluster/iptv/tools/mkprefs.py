#!/usr/bin/env python3
"""Encode un fichier DataStore Preferences (.preferences_pb) minimal.

Schema (androidx.datastore.preferences.protobuf) :
  PreferenceMap { map<string, Value> preferences = 1; }
  Value { bool boolean=1; float float=2; int32 integer=3; int64 long=4;
          string string=5; StringSet string_set=6; double double=7; bytes bytes=8; }

Un map<K,V> est encode comme une suite de messages { key=1, value=2 }.
"""
import sys, base64

def varint(n):
    out = b""
    while True:
        b = n & 0x7F
        n >>= 7
        out += bytes([b | (0x80 if n else 0)])
        if not n:
            return out

def tag(field, wire):  return varint((field << 3) | wire)
def ld(field, payload): return tag(field, 2) + varint(len(payload)) + payload

def value_long(v):  return tag(4, 0) + varint(v)
def value_bool(v):  return tag(1, 0) + varint(1 if v else 0)

def entry(key, value_payload):
    return ld(1, ld(1, key.encode()) + ld(2, value_payload))

def build(pairs):
    out = b""
    for k, kind, v in pairs:
        out += entry(k, value_long(v) if kind == "long" else value_bool(v))
    return out

if __name__ == "__main__":
    import time
    # essai demarre il y a N jours (defaut 10 -> largement expire, essai = 3 jours)
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    started = int(time.time() * 1000) - days * 86_400_000
    blob = build([("trial_start_date", "long", started)])
    sys.stdout.write(base64.b64encode(blob).decode())
