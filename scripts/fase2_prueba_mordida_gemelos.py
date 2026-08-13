"""
PRUEBA DE MORDIDA — control de gemelos geometricos y anclaje por FID (D12).

QUE PRUEBA, Y POR QUE ESTE CONTROL EXISTE. El catastro de lagos tiene filas
duplicadas: una con nombre y otra sin nombre, con la geometria IDENTICA. Si una
adjudicacion las toma a las dos, el cuerpo se duplica. Y el duplicado NO se ve
midiendo area: dos poligonos identicos unidos dan exactamente la misma area que
uno. Solo se ve CONTANDO FILAS.

Esta prueba muerde primero (control negativo) y recien despues acepta el verde.

NO ESCRIBE EL COTEJO REAL. La salida se redirige a un temporal y ademas se
comprueba por sha256 que data/decreto/cotejo_lacustre_adjudicado.json no cambio.
Esa comprobacion esta porque este repositorio ya pago una vez el error contrario:
un script de mordida que creia redirigir su estado y no lo lograba, y publico el
resultado de su propia prueba (ver e02_construccion_2026-08-11 §6).

Uso (desde la raiz del repo):
    tools\\raster-build\\.venv\\Scripts\\python.exe scripts\\fase2_prueba_mordida_gemelos.py
"""

import copy
import hashlib
import io
import os
import sys
import contextlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import fase2_adjudicacion as adj
import geopandas as gpd

REPO = adj.REPO
COTEJO_REAL = os.path.join(REPO, "data", "decreto", "cotejo_lacustre_adjudicado.json")
TMP = os.path.join(REPO, "_bitacoras", "_tmp_mordida_gemelos.json")


def sha256(ruta):
    h = hashlib.sha256()
    with open(ruta, "rb") as fh:
        for b in iter(lambda: fh.read(65536), b""):
            h.update(b)
    return h.hexdigest()


def correr():
    """Corre main() con la salida redirigida. Devuelve (ok, mensaje)."""
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            adj.main()
        return True, ""
    except SystemExit as e:
        return False, str(e)


def caso(nombre, espera_fallo, deformar, fragmento_esperado=None):
    """Deforma, corre, restaura. Verifica el resultado y el texto del fallo."""
    orig = {
        "ADJUDICADOS": copy.deepcopy(adj.ADJUDICADOS),
        "ADJUDICADOS_FID": copy.deepcopy(adj.ADJUDICADOS_FID),
        "GEMELOS_DECLARADOS": copy.deepcopy(adj.GEMELOS_DECLARADOS),
        "FUERA_DE_ALCANCE_D11": copy.deepcopy(adj.FUERA_DE_ALCANCE_D11),
        "CUERPOS": copy.deepcopy(adj.CUERPOS),
    }
    try:
        deformar()
        ok, msg = correr()
    finally:
        for k, v in orig.items():
            setattr(adj, k, v)

    paso = (not ok) if espera_fallo else ok
    if paso and espera_fallo and fragmento_esperado:
        paso = fragmento_esperado.lower() in msg.lower()
    estado = "MUERDE" if (espera_fallo and paso) else ("OK" if paso else "NO MUERDE")
    print(f"  [{estado:<9}] {nombre}")
    if not paso:
        print(f"              esperaba {'fallo' if espera_fallo else 'exito'}; "
              f"mensaje: {msg[:160]}")
    return paso


def main():
    sha_antes = sha256(COTEJO_REAL)
    adj.SALIDA = TMP  # la salida NO va al archivo real

    print("=" * 78)
    print("PRUEBA DE MORDIDA — gemelos geometricos y anclaje por FID")
    print("=" * 78)
    print()

    # ── La demostracion de por que el control cuenta filas y no mide area ─────
    gdf = gpd.read_file(adj.SHP)
    a965 = gdf.iloc[965].geometry
    a960 = gdf.iloc[960].geometry
    union = a965.union(a960)
    dif_abs = abs(union.area - a965.area)
    dif_rel = dif_abs / a965.area if a965.area else float("inf")
    print("POR QUE CONTANDO FILAS Y NO MIDIENDO AREA")
    print(f"  area del fid 965 solo          : {a965.area:.6f}")
    print(f"  area de la union 965 + 960     : {union.area:.6f}")
    print(f"  diferencia absoluta            : {dif_abs:.2e}")
    print(f"  diferencia RELATIVA            : {dif_rel:.2e}   <-- lo que hay que mirar")
    print(f"  filas involucradas             : 1 contra 2     <-- ESTO si se ve")
    # La comparacion va en RELATIVO. Un umbral absoluto sobre magnitudes de 1e7 no
    # dice nada: 7e-09 parece "distinto de cero" y es ruido de punto flotante de la
    # union. En relativo son ~1e-16, o sea epsilon de maquina. Comparar en absoluto
    # aca seria el mismo error que este repositorio viene cazando todo el dia:
    # medir la magnitud equivocada y sacar la conclusion opuesta.
    iguales = dif_rel < 1e-12
    print(f"  => a un control de AREA con cualquier tolerancia razonable el duplicado "
          f"{'LE PASA POR DEBAJO' if iguales else 'lo detectaria'}")
    print(f"  => el control cuenta FILAS, que es lo unico que cambia de verdad")
    print()
    if not iguales:
        print("  ATENCION: la premisa del control no se sostiene en esta corrida.")


    resultados = []

    print("CONTROL NEGATIVO PRIMERO — casos que TIENEN que morder")

    def sin_declarar():
        adj.GEMELOS_DECLARADOS = {k: v for k, v in adj.GEMELOS_DECLARADOS.items()
                                  if k != 965}
    resultados.append(caso("gemelo de Galletue sin declarar", True, sin_declarar,
                           "comparte geometria exacta"))

    def sin_declarar_icalma():
        adj.GEMELOS_DECLARADOS = {k: v for k, v in adj.GEMELOS_DECLARADOS.items()
                                  if k != 966}
    resultados.append(caso("gemelo de Icalma (parte mayor) sin declarar", True,
                           sin_declarar_icalma, "comparte geometria exacta"))

    def lista_mal():
        adj.GEMELOS_DECLARADOS[965] = dict(adj.GEMELOS_DECLARADOS[965], gemelos=[961])
    resultados.append(caso("gemelo declarado con el fid equivocado", True, lista_mal,
                           "no esta declarado"))

    def dice_dos_filas():
        adj.GEMELOS_DECLARADOS[965] = dict(adj.GEMELOS_DECLARADOS[965], gemelos=[960, 961])
    resultados.append(caso("gemelo declarado de mas", True, dice_dos_filas,
                           "no esta declarado"))

    def fid_fuera_de_rango():
        adj.ADJUDICADOS_FID[("lago_villarrica", "Laguna Galletue")] = (
            "aceptado", [999999], {"nombre": "LAGO GUALLETUE", "region": "IX",
                                   "area_km2": 13.075}, "x")
    resultados.append(caso("FID fuera del rango del shapefile", True, fid_fuera_de_rango,
                           "el shapefile tiene"))

    def fid_otro_cuerpo():
        adj.ADJUDICADOS_FID[("lago_villarrica", "Laguna Galletue")] = (
            "aceptado", [966], {"nombre": "LAGO GUALLETUE", "region": "IX",
                                "area_km2": 13.075}, "x")
    resultados.append(caso("FID apunta a otra fila que la declarada", True, fid_otro_cuerpo,
                           "no es el adjudicado"))

    def doble_anclaje():
        adj.ADJUDICADOS[("lago_villarrica", "Laguna Galletue")] = (
            "ausente", [], "x")
    resultados.append(caso("un cuerpo anclado por nombre Y por FID", True, doble_anclaje,
                           "no por los dos"))

    def d11_lacustre():
        adj.FUERA_DE_ALCANCE_D11["lago_ranco"] = "x"
    resultados.append(caso("D11 saca de alcance una jurisdiccion LACUSTRE", True,
                           d11_lacustre, "ambito"))

    def d11_inexistente():
        adj.FUERA_DE_ALCANCE_D11["capitania_que_no_existe"] = "x"
    resultados.append(caso("D11 nombra una jurisdiccion que el decreto no tiene", True,
                           d11_inexistente, "no en el decreto"))

    print()
    print("Y RECIEN AHORA, EL VERDE")
    resultados.append(caso("arbol limpio: la adjudicacion corre entera", False, lambda: None))

    print()
    sha_despues = sha256(COTEJO_REAL)
    intacto = sha_antes == sha_despues
    print(f"  [{'OK' if intacto else 'ROTO':<9}] el cotejo real NO fue tocado por la prueba")
    if not intacto:
        print(f"              antes {sha_antes[:16]} · despues {sha_despues[:16]}")
    resultados.append(intacto)

    if os.path.exists(TMP):
        os.remove(TMP)

    print()
    print("=" * 78)
    print(f"MORDIDA: {sum(resultados)}/{len(resultados)}")
    print("=" * 78)
    return 0 if all(resultados) else 1


if __name__ == "__main__":
    raise SystemExit(main())
