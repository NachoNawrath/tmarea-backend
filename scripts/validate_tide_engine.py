#!/usr/bin/env python3
"""
Genera una curva de referencia con utide.reconstruct() para comparar contra
el motor JS puro (src/services/tide-astronomy.js + tide-prediction-service.js).

No usa tidal-constants.json (ahí solo están A/phase/Z0, no el objeto `coef`
completo que pide utide.reconstruct) -- re-corre solve() igual que
compute_tidal_constants.py para obtener el coef, y reconstruye la curva.

Uso:
    python scripts/validate_tide_engine.py puerto_montt 2026-08-01 168
"""
import json
import sys
from pathlib import Path

import pandas as pd
import utide

sys.path.insert(0, str(Path(__file__).resolve().parent))
from compute_tidal_constants import (  # noqa: E402
    load_uhslc as _load_uhslc,
    load_ioc as _load_ioc,
    remove_stuck_segments,
    remove_spikes,
)

DATA_DIR = Path(__file__).resolve().parent.parent / "src" / "services" / "data" / "tide-obs"
CONSTITUENTS = ["M2", "S2", "N2", "K2", "K1", "O1", "P1", "Q1", "M4", "MS4", "MN4", "SA", "SSA"]

STATION_FILES = {
    "puerto_montt": ("puerto_montt.csv", "uhslc", -41.485),
    "ancud": ("ancud.csv", "ioc", -41.867),
    "valparaiso": ("valparaiso.csv", "uhslc", -33.0267),
    "punta_arenas": ("punta_arenas.csv", "ioc", -53.124),
}


def load_uhslc(path):
    df = _load_uhslc(path)
    df = remove_stuck_segments(df, "h")
    df = remove_spikes(df, "h")
    return df[["time", "h"]]


def load_ioc(path):
    df, _sensor = _load_ioc(path)
    df = remove_stuck_segments(df, "h")
    df = remove_spikes(df, "h")
    return df[["time", "h"]]


def main():
    station_id = sys.argv[1] if len(sys.argv) > 1 else "puerto_montt"
    start = sys.argv[2] if len(sys.argv) > 2 else "2026-08-01"
    hours = int(sys.argv[3]) if len(sys.argv) > 3 else 168

    fname, kind, lat = STATION_FILES[station_id]
    df = load_uhslc(DATA_DIR / fname) if kind == "uhslc" else load_ioc(DATA_DIR / fname)

    coef = utide.solve(
        df["time"], df["h"].values, lat=lat, constit=CONSTITUENTS,
        method="ols", conf_int="none", trend=False, nodal=True, phase="Greenwich", verbose=False,
    )

    t0 = pd.Timestamp(start, tz="UTC")
    times = pd.date_range(t0, periods=hours * 6 + 1, freq="10min", tz="UTC")  # cada 10 min
    recon = utide.reconstruct(times, coef, verbose=False)

    out = [
        {"time": t.strftime("%Y-%m-%dT%H:%M:%SZ"), "height_m": round(float(h), 4)}
        for t, h in zip(times, recon.h)
    ]
    out_path = Path(r"C:\Users\katia\AppData\Local\Temp\claude\C--Users-katia--claude\38df2102-963f-4f13-b684-cf61de0ba171\scratchpad") / "tide_validation.json"
    with out_path.open("w") as f:
        json.dump({"station_id": station_id, "lat": lat, "points": out}, f)
    print(f"{len(out)} puntos guardados en {out_path}")


if __name__ == "__main__":
    main()
