"""
Genera src/config/peligros-por-canal.json agrupando peligros_full.csv por
canal, para la advertencia de texto por tramo (Fase 3 redefinida,
docs/handoff-fase2.md). No alimenta el raster (spec extraccion SS0.1) --
es texto informativo, el router lo adjunta cuando confirma geometricamente
que la ruta cruza ese canal (ver canal-geometria.js).

Dedupe por nombre normalizado (minusculas, sin acentos) DENTRO de cada
canal: dos entradas del mismo peligro con distinta grafia (ej. "Roca
Remolinos" / "Rocas Remolinos") no deben aparecer dos veces en el mismo
aviso. peligros_full.csv ya trae un campo es_duplicado_de para nombres
identicos exactos: esto cubre ademas variantes de grafia que ese campo no
detecta.
"""
import csv
import json
import re
import unicodedata
from collections import defaultdict

IN_CSV = r"C:\Users\katia\tmarea-backend\tools\derrotero\piloto_chacao\peligros_full.csv"
OUT_JSON = r"C:\Users\katia\tmarea-backend\src\config\peligros-por-canal.json"


def normalizar(nombre):
    n = unicodedata.normalize("NFD", nombre.lower())
    n = "".join(c for c in n if unicodedata.category(c) != "Mn")
    n = re.sub(r"^(roca|rocas|bajo|banco|restinga|escollo)s?\s+", "", n)
    return n.strip()


def main():
    por_canal = defaultdict(list)
    with open(IN_CSV, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            por_canal[row["canal"]].append(row)

    salida = {}
    for canal, filas in por_canal.items():
        vistos = {}
        for row in filas:
            key = normalizar(row["nombre"])
            if key not in vistos:
                vistos[key] = row
        nombres = [row["nombre"] for row in vistos.values()]
        cartas = sorted({row["carta_ref"] for row in vistos.values() if row["carta_ref"]})
        nombres.sort()

        texto = f"El derrotero menciona en este sector: {', '.join(nombres)}"
        if cartas:
            texto += f" — consulte carta{'s' if len(cartas) > 1 else ''} N° {', '.join(cartas)}"
        texto += "."

        salida[canal] = {
            "cantidad_peligros": len(nombres),
            "nombres": nombres,
            "cartas_ref": cartas,
            "texto_advertencia": texto,
        }

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, indent=2)

    print(f"{len(salida)} canales -> {OUT_JSON}")
    total_antes = sum(len(v) for v in por_canal.values())
    total_despues = sum(len(v["nombres"]) for v in salida.values())
    print(f"peligros_full.csv: {total_antes} filas -> {total_despues} peligros unicos tras dedupe por canal")


if __name__ == "__main__":
    main()
