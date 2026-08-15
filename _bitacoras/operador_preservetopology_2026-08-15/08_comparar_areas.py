# -*- coding: utf-8 -*-
"""
08_comparar_areas.py - EL ANTES Y EL DESPUES, JURISDICCION POR JURISDICCION

QUE HACE: cruza 03_areas_antes.csv contra 03_areas_despues.csv por id y escribe
la tabla de diferencias. Los dos CSV salen de la misma tabla de constancia
—jurisdicciones_ds991_areas, que el constructor emite ANTES del gate—, uno por
cada build: el de ST_Simplify(0.01) y el de ST_SimplifyPreserveTopology(0.01).

POR QUE ESTE NUMERO NO ES EL DE LA ATRIBUCION DE LA SESION ANTERIOR, y la
diferencia importa: aquella reconstruia la banda de cada jurisdiccion desde la
extension latitudinal de su figura (ST_YMin/ST_YMax) y no aplicaba contorno,
fronteras declaradas, resta de tierra ni ensanche. Estaba declarada como
aproximada y no firmable km2 por km2. Esta sale del build, con todo aplicado.

SE COMPARA POR id Y NO POR NOMBRE, y se exige que los dos conjuntos de ids sean
identicos: si una jurisdiccion apareciera o desapareciera entre los dos builds,
un cruce por nombre lo taparia emparejando mal en vez de detenerse.

SHELL: se corre con el interprete del repo (python no esta en el PATH):
  & "tools\\raster-build\\.venv\\Scripts\\python.exe" `
      _bitacoras\\operador_preservetopology_2026-08-15\\08_comparar_areas.py
La salida va a 08_areas_antes_despues.txt, en este mismo directorio.
"""
import csv
import io
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(AQUI))


class Alto(Exception):
    pass


def leer(nombre):
    ruta = os.path.join(AQUI, nombre)
    if not os.path.exists(ruta):
        raise Alto(f"falta {nombre}: lo escribe psql con --csv desde "
                   f"jurisdicciones_ds991_areas, ver la cabecera de 03_areas.sql")
    with io.open(ruta, encoding="utf-8", newline="") as fh:
        filas = {f["id"]: f for f in csv.DictReader(fh)}
    if not filas:
        raise Alto(f"{nombre} no trae ninguna fila")
    return filas


def num(fila, campo):
    """Una celda vacia es una nula_declarada de INV-3.6, no un cero. Se devuelve
    None y se propaga como None: convertirla en 0.0 haria que una jurisdiccion
    sin geometria se sumara al total como si midiera cero km2, que es
    exactamente el falso negativo silencioso que INV-3.6 prohibe."""
    v = fila[campo]
    return None if v is None or v.strip() == "" else float(v)


def main():
    a, d = leer("03_areas_antes.csv"), leer("03_areas_despues.csv")
    if set(a) != set(d):
        raise Alto(f"los dos builds no traen las mismas jurisdicciones: "
                   f"solo en antes {sorted(set(a) - set(d))}, "
                   f"solo en despues {sorted(set(d) - set(a))}")

    L = []
    P = L.append
    P("EL AREA DE CADA JURISDICCION, ANTES Y DESPUES DEL CAMBIO DE OPERADOR")
    P("2026-08-15")
    P("  antes   = build con ST_Simplify(0.01)")
    P("  despues = build con ST_SimplifyPreserveTopology(0.01)")
    P("  fuente  = jurisdicciones_ds991_areas, tomada ANTES del gate por ambito")
    P("=" * 78)
    P("")

    movidas, quietas, nulas = [], [], []
    for i in sorted(a):
        ka, kd = num(a[i], "km2"), num(d[i], "km2")
        if ka is None and kd is None:
            nulas.append(a[i]["nombre"])
            continue
        if ka is None or kd is None:
            raise Alto(f"{i} cambia de estado de geometria entre los dos builds "
                       f"(antes {ka}, despues {kd}): eso no lo produce un cambio "
                       f"de operador y no se reporta como si fuera un delta")
        (movidas if round(kd - ka, 1) != 0.0 else quietas).append(
            (a[i]["nombre"], a[i]["ambito"], ka, kd, kd - ka))

    movidas.sort(key=lambda r: -r[4])
    P(f"JURISDICCIONES QUE SE MUEVEN: {len(movidas)}")
    P(f"{'NOMBRE':<24} {'AMBITO':<10} {'ANTES km2':>12} {'DESPUES km2':>12} "
      f"{'DELTA km2':>12}")
    P("-" * 78)
    for n, am, ka, kd, dl in movidas:
        P(f"{n:<24} {am:<10} {ka:>12,.1f} {kd:>12,.1f} {dl:>+12,.1f}")
    P("")
    P(f"JURISDICCIONES QUE NO SE MUEVEN: {len(quietas)}")
    for n, am, ka, _, _ in sorted(quietas):
        P(f"  {n:<24} {am:<10} {ka:>12,.1f}")
    P("")
    P(f"NULAS DECLARADAS (sin geometria en los dos builds, INV-3.6): {len(nulas)}")
    P("  " + ", ".join(sorted(nulas)))
    P("")

    P("TOTALES POR AMBITO")
    P(f"{'AMBITO':<16} {'ANTES km2':>14} {'DESPUES km2':>14} {'DELTA km2':>14}")
    P("-" * 78)
    ambitos = sorted({a[i]["ambito"] for i in a})
    for am in ambitos:
        sa = sum(num(a[i], "km2") or 0.0 for i in a if a[i]["ambito"] == am)
        sd = sum(num(d[i], "km2") or 0.0 for i in d if d[i]["ambito"] == am)
        P(f"{am:<16} {sa:>14,.1f} {sd:>14,.1f} {sd - sa:>+14,.1f}")
    P("")
    P("PIEZAS Y VERTICES, solo donde cambian")
    hubo = False
    for i in sorted(a):
        if a[i]["vertices"] != d[i]["vertices"] or a[i]["piezas"] != d[i]["piezas"]:
            hubo = True
            P(f"  {a[i]['nombre']:<24} vertices {a[i]['vertices']:>7} -> "
              f"{d[i]['vertices']:<7}  piezas {a[i]['piezas']:>4} -> "
              f"{d[i]['piezas']}")
    if not hubo:
        P("  ninguna")

    texto = "\n".join(L) + "\n"
    # La evidencia se escribe antes de imprimir: una consola que no sabe imprimir
    # un caracter no puede ser lo que deje el archivo sin escribir.
    destino = os.path.join(AQUI, "08_areas_antes_despues.txt")
    with io.open(destino, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(texto)
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    print(texto)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Alto as e:
        print(f"\nALTO: {e}\n", file=sys.stderr)
        sys.exit(2)
