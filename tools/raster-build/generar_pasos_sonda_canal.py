"""
Genera src/config/pasos-sonda-canal.json desde pasos_full.csv: los 7
registros con sonda_canal_min_m documentada (el dataset que califica el
umbral de VERDE fallo y quedo redefinido como cotejo vertical de
advertencia -- ver docs/handoff-fase2.md, seccion Fase 3).

NOTA DE NOMBRE: la tarea original decia "pasos.csv", pero el campo
sonda_canal_min_m vive en pasos_full.csv (247 registros de la corrida
completa pp.141-623) -- pasos.csv es un archivo piloto anterior, mas chico,
con otro esquema (sonda_minima_m, sin el campo que este script necesita).
Se usa pasos_full.csv porque es donde el dato realmente esta.

canal_geometria_disponible marca los 3 de 7 para los que existe geometria
real hoy en el proyecto (Canal Tenglo via tmarea_nodos_nauticos_v1.json
edge E-01, Canal Chacao y Canal Moraleda via red_nautica_chile_completa.
geojson) -- ver src/services/raster/canal-geometria.js. Los otros 4
(Cruces, Galvarino, Pilcomayo, De Vidts) quedan con el campo en false: el
cotejo vertical no puede verificar si una ruta los cruza sin geometria, y
no se inventa una.
"""
import csv
import json

IN_CSV = r"C:\Users\katia\tmarea-backend\tools\derrotero\piloto_chacao\pasos_full.csv"
OUT_JSON = r"C:\Users\katia\tmarea-backend\src\config\pasos-sonda-canal.json"

# Alias: nombre de canal en pasos_full.csv -> nombre de canal resuelto por
# canal-geometria.js (ver ese archivo para el porque de cada alias).
CANALES_CON_GEOMETRIA = {"Canal Chacao", "Canal Tenglo", "Canal Moraleda"}


def main():
    registros = []
    with open(IN_CSV, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if not row.get("sonda_canal_min_m"):
                continue
            registros.append({
                "nombre": row["nombre"],
                "canal": row["canal"],
                "sonda_canal_min_m": float(row["sonda_canal_min_m"]),
                "geometria_ref": row["geometria_ref"],
                "pagina": int(row["pagina"]),
                "canal_geometria_disponible": row["canal"] in CANALES_CON_GEOMETRIA,
            })

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(registros, f, ensure_ascii=False, indent=2)

    print(f"{len(registros)} registros -> {OUT_JSON}")
    for r in registros:
        print(f"  {r['nombre']:<28} canal={r['canal']:<16} sonda={r['sonda_canal_min_m']}m "
              f"geometria={'si' if r['canal_geometria_disponible'] else 'NO'}")


if __name__ == "__main__":
    main()
