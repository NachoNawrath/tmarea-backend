#!/usr/bin/env python3
"""
Análisis armónico de mareas a partir de las observaciones descargadas en
src/services/data/tide-obs/ (UHSLC horario + IOC minutal).

Para cada estación:
  1. Carga la serie temporal
  2. Limpia: fill values (-32767, UHSLC), spikes > 3 sigma, reporta gaps > 30 días
  3. Resamplea a horario si viene minutal (IOC) -- eligiendo el sensor con
     más cobertura (prs vs rad) en vez de mezclar ambos
  4. Corre utide.solve() con M2,S2,N2,K2,K1,O1,P1,Q1,M4,MS4,MN4,SA,SSA
  5. Guarda amplitud/fase por constituyente + nivel medio (Z0)

Output: src/services/data/tidal-constants.json

Uso:
    python scripts/compute_tidal_constants.py
"""
import json
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import utide

DATA_DIR = Path(__file__).resolve().parent.parent / "src" / "services" / "data" / "tide-obs"
OUT_PATH = Path(__file__).resolve().parent.parent / "src" / "services" / "data" / "tidal-constants.json"

CONSTITUENTS = ["M2", "S2", "N2", "K2", "K1", "O1", "P1", "Q1", "M4", "MS4", "MN4", "SA", "SSA"]
UHSLC_FILL_VALUE = -32767
SPIKE_SIGMA = 3
GAP_DAYS = 30

# id, nombre, archivo, tipo (uhslc | ioc), fuente
STATIONS = [
    {"id": "isla_de_pascua",   "name": "Isla de Pascua",   "file": "isla_de_pascua.csv",   "kind": "uhslc", "source": "UHSLC-22"},
    {"id": "antofagasta",      "name": "Antofagasta",      "file": "antofagasta.csv",      "kind": "uhslc", "source": "UHSLC-80"},
    {"id": "valparaiso",       "name": "Valparaíso",       "file": "valparaiso.csv",       "kind": "uhslc", "source": "UHSLC-81"},
    {"id": "juan_fernandez",   "name": "Juan Fernández",   "file": "juan_fernandez.csv",   "kind": "uhslc", "source": "UHSLC-21"},
    {"id": "san_felix",        "name": "San Félix",        "file": "san_felix.csv",        "kind": "uhslc", "source": "UHSLC-35"},
    {"id": "puerto_montt",     "name": "Puerto Montt",     "file": "puerto_montt.csv",     "kind": "uhslc", "source": "UHSLC-684"},
    {"id": "base_prat",        "name": "Base Prat",        "file": "base_prat.csv",        "kind": "uhslc", "source": "UHSLC-730"},
    {"id": "ancud",            "name": "Ancud",             "file": "ancud.csv",            "kind": "ioc", "source": "IOC-ancu"},
    {"id": "castro",           "name": "Castro",            "file": "castro.csv",           "kind": "ioc", "source": "IOC-cstr"},
    {"id": "puerto_melinka",   "name": "Puerto Melinka",    "file": "puerto_melinka.csv",   "kind": "ioc", "source": "IOC-pmel"},
    {"id": "puerto_chacabuco", "name": "Puerto Chacabuco",  "file": "puerto_chacabuco.csv", "kind": "ioc", "source": "IOC-pcha"},
    {"id": "puerto_aguirre",   "name": "Puerto Aguirre",    "file": "puerto_aguirre.csv",   "kind": "ioc", "source": "IOC-pagi"},
    {"id": "arica",            "name": "Arica",             "file": "arica.csv",            "kind": "ioc", "source": "IOC-aric"},
    {"id": "iquique",          "name": "Iquique",           "file": "iquique.csv",          "kind": "ioc", "source": "IOC-iqui"},
    {"id": "caldera",          "name": "Caldera",           "file": "caldera.csv",          "kind": "ioc", "source": "IOC-cald"},
    {"id": "coquimbo",         "name": "Coquimbo",          "file": "coquimbo.csv",         "kind": "ioc", "source": "IOC-coqu"},
    {"id": "talcahuano",       "name": "Talcahuano",        "file": "talcahuano.csv",       "kind": "ioc", "source": "IOC-talc"},
    {"id": "corral",           "name": "Corral",            "file": "corral.csv",           "kind": "ioc", "source": "IOC-corr"},
    {"id": "bahia_mansa",      "name": "Bahía Mansa",       "file": "bahia_mansa.csv",      "kind": "ioc", "source": "IOC-bmsa"},
    {"id": "punta_arenas",     "name": "Punta Arenas",      "file": "punta_arenas.csv",     "kind": "ioc", "source": "IOC-ptar"},
    {"id": "puerto_williams",  "name": "Puerto Williams",   "file": "puerto_williams.csv",  "kind": "ioc", "source": "IOC-pwil"},
]


def remove_stuck_segments(df: pd.DataFrame, col: str, min_run: int = 3, tol: float = 0.005) -> pd.DataFrame:
    """Descarta tramos de >= min_run puntos consecutivos casi idénticos
    (sensor trabado/congelado). Un filtro global de 3 sigma sobre el nivel
    absoluto no detecta esto si el valor trabado cae cerca de la media."""
    diffs = df[col].diff().abs()
    stuck_point = diffs < tol
    run_id = (~stuck_point).cumsum()
    run_size = stuck_point.groupby(run_id).transform("sum")
    is_stuck_run = run_size >= (min_run - 1)
    return df[~is_stuck_run]


def remove_spikes(df: pd.DataFrame, col: str, sigma: float = SPIKE_SIGMA) -> pd.DataFrame:
    mean, std = df[col].mean(), df[col].std()
    mask = (df[col] - mean).abs() <= sigma * std
    return df[mask]


def report_gaps(times: pd.Series, gap_days: int = GAP_DAYS) -> int:
    diffs = times.sort_values().diff().dt.total_seconds() / 86400.0
    return int((diffs > gap_days).sum())


def load_uhslc(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    df = df[df["sea_level"] != UHSLC_FILL_VALUE].copy()
    df["time"] = pd.to_datetime(df["time"], utc=True)
    df["h"] = df["sea_level"] / 1000.0  # mm -> m
    df["lat"] = df["latitude"].iloc[0]
    df["lon"] = df["longitude"].iloc[0]
    return df[["time", "h", "lat", "lon"]]


def load_ioc(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    # Elige el sensor con mayor cobertura para toda la estación -- mezclar
    # prs/rad introduciría un salto de nivel en el punto de cambio.
    best_sensor = df.groupby("sensor")["sea_level"].count().idxmax()
    df = df[df["sensor"] == best_sensor].copy()
    df["time"] = pd.to_datetime(df["time"], utc=True)
    df["h"] = df["sea_level"].astype(float)
    df["lat"] = df["latitude"].iloc[0]
    df["lon"] = df["longitude"].iloc[0]

    # Resample minutal -> horario (promedio por hora)
    df = df.set_index("time")
    hourly = df["h"].resample("1h").mean().dropna().reset_index()
    hourly["lat"] = df["lat"].iloc[0]
    hourly["lon"] = df["lon"].iloc[0]
    hourly = hourly.rename(columns={"h": "h"})
    return hourly[["time", "h", "lat", "lon"]], best_sensor


def process_station(st: dict) -> dict:
    path = DATA_DIR / st["file"]
    if not path.exists():
        raise FileNotFoundError(f"no existe {path}")

    sensor_used = None
    if st["kind"] == "uhslc":
        df = load_uhslc(path)
    else:
        df, sensor_used = load_ioc(path)

    n_gaps = report_gaps(df["time"])
    df = remove_stuck_segments(df, "h")
    df = remove_spikes(df, "h")

    if len(df) < 24 * 90:  # menos de ~90 días de datos horarios: insuficiente
        raise ValueError(f"datos insuficientes tras limpieza ({len(df)} filas horarias)")

    lat = float(df["lat"].iloc[0])
    lon = float(df["lon"].iloc[0])
    t = df["time"]
    h = df["h"].values

    coef = utide.solve(
        t, h,
        lat=lat,
        constit=CONSTITUENTS,
        method="ols",
        conf_int="none",
        trend=False,
        nodal=True,
        phase="Greenwich",
        verbose=False,
    )

    constituents = []
    for name, amp, phase in zip(coef.name, coef.A, coef.g):
        if name not in CONSTITUENTS:
            continue
        constituents.append({
            "name": str(name),
            "amplitude_mm": round(float(amp) * 1000, 1),
            "phase_deg": round(float(phase) % 360, 1),
        })
    # orden fijo según CONSTITUENTS para legibilidad/estabilidad del JSON
    order = {n: i for i, n in enumerate(CONSTITUENTS)}
    constituents.sort(key=lambda c: order.get(c["name"], 999))

    # Validación: reconstruir la marea desde los constituyentes ajustados y
    # compararla contra la observación -- documenta qué tan bien explica el
    # modelo armónico los datos reales (R^2), no solo que utide no reventó.
    recon = utide.reconstruct(t, coef, verbose=False)
    resid = h - recon.h
    ss_res = float(np.sum(resid**2))
    ss_tot = float(np.sum((h - h.mean()) ** 2))
    r_squared = round(1 - ss_res / ss_tot, 4) if ss_tot > 0 else None

    years_used = f"{t.min().year}-{t.max().year}"

    result = {
        "id": st["id"],
        "name": st["name"],
        "lat": round(lat, 4),
        "lon": round(lon, 4),
        "source": st["source"],
        "years_used": years_used,
        "z0_mm": round(float(coef.mean) * 1000, 1),
        "n_hourly_points": len(df),
        "n_gaps_gt_30d": n_gaps,
        "fit_r_squared": r_squared,
        "constituents": constituents,
    }
    if sensor_used:
        result["sensor_used"] = sensor_used
    return result


def main():
    stations_out = []
    failures = []

    for st in STATIONS:
        print(f"Procesando {st['name']} ({st['id']})...")
        try:
            result = process_station(st)
            n_resolved = len(result["constituents"])
            print(
                f"  OK: {result['n_hourly_points']} pts horarios, {result['years_used']}, "
                f"Z0={result['z0_mm']}mm, {n_resolved}/{len(CONSTITUENTS)} constituyentes, R2={result['fit_r_squared']}"
                + (f", gaps>30d={result['n_gaps_gt_30d']}" if result["n_gaps_gt_30d"] else "")
            )
            stations_out.append(result)
        except Exception as e:
            print(f"  ERROR: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            failures.append({"id": st["id"], "error": str(e)})

    output = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "stations": stations_out,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n{len(stations_out)}/{len(STATIONS)} estaciones procesadas correctamente.")
    if failures:
        print("Fallidas:")
        for fail in failures:
            print(f"  {fail['id']}: {fail['error']}")
    print(f"Guardado en {OUT_PATH}")


if __name__ == "__main__":
    main()
