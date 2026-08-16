r"""
INSERCION QUIRURGICA EN EL V1 — el bloque `alcance_costa_afuera`.

QUE HACE. Agrega UN bloque de nivel superior al insumo fuente
`data/decreto/jurisdicciones_capitanias.json`. No toca ninguna de las 64
Capitanias, no toca ningun otro bloque, y no cambia ningun valor existente.

POR QUE UN SCRIPT Y NO UNA EDICION A MANO. CLAUDE.md 3.4: toda escritura se
regenera desde el repositorio. Un bloque tipeado a mano no se puede volver a
producir ni comprobar. Precedente en la misma familia:
_bitacoras/arica_limite_norte_2026-08-15/insertar_en_v2.py.

ES IDEMPOTENTE Y NO PISA. Si el bloque ya existe con OTRO contenido, se detiene
en vez de sobrescribir: una segunda corrida con el texto cambiado seria una
edicion silenciosa del insumo fuente, que es lo que INV-3.7 prohibe.

FIDELIDAD DE FORMATO, COMPROBADA ANTES DE ESCRIBIR. El v1 esta en CRLF, indent=2,
ensure_ascii=False y sin BOM. El script comprueba que el archivo en disco
round-trip-ea BYTE A BYTE con esos parametros antes de tocarlo; si no, se
detiene. Sin esa comprobacion el diff traeria todo el archivo reflowado y
esconderia el cambio real.

SHELL: interprete del repo (python no esta en el PATH). Forma reproducible,
PowerShell, desde la raiz del repositorio:

    & "tools\raster-build\.venv\Scripts\python.exe" `
      "_bitacoras\alcance_costa_afuera_2026-08-15\07_insertar_alcance_v1.py"
"""

import io
import json
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(AQUI))
V1 = os.path.join(REPO, "data", "decreto", "jurisdicciones_capitanias.json")

CLAVE = "alcance_costa_afuera"

# ─────────────────────────────────────────────────────────────────────────────
# EL BLOQUE. Se escribe aca, entero, para que el texto que termina en el insumo
# sea el mismo que se revisa en este archivo.
# ─────────────────────────────────────────────────────────────────────────────
BLOQUE = {
    "que_es":
        "Hasta donde mar afuera llega la jurisdiccion de una Capitania de ambito "
        "maritimo. Es el borde EXTERIOR de la figura: el que no describe ningun "
        "tramo del contorno y que hasta el 2026-08-15 no existia como dato.",

    "de_que_norma_sale":
        "DE NINGUNA. El D.S. 991 guarda SILENCIO ABSOLUTO sobre el alcance costa "
        "afuera de todas sus Capitanias. Su Art. 2 dice que las jurisdicciones "
        "comprenden el litoral, lagos y rios navegables, aguas interiores, mar "
        "territorial, zona contigua, ZEE y plataforma continental, y NO fija el "
        "borde exterior de ninguna. Esto es CONVENCION NUESTRA y su texto lo "
        "declara, para no fabricar autoridad normativa (CLAUDE.md 1.1). Quien lea "
        "este bloque buscando el articulo que lo respalda no lo va a encontrar, y "
        "eso es correcto.",

    "por_defecto": {
        "metros": 370400,
        "equivalencia": "200 millas nauticas",
        "tipo": "convencion_nuestra",
        "declarada_el": "2026-08-15",
        "aplica_a":
            "toda jurisdiccion de ambito maritimo que no declare un "
            "`alcance_costa_afuera` propio.",
        "capa_rol": "limite_exterior",

        "de_donde_viene_este_numero":
            "Hasta el 2026-08-15 era LIMITE_ZEE_M, constante de codigo en "
            "scripts/fase5_construir_capa_ds991.py:114. EL VALOR NO CAMBIA: cambia "
            "donde vive. INV-3.7 pide que el archivo de definicion de "
            "jurisdicciones sea el dato fuente versionado y la geometria un "
            "derivado reproducible desde el; una convencion que gobierna el borde "
            "exterior de 44 jurisdicciones construidas y que solo existe adentro de "
            "un .py no cumple eso. La capa no se mueve ni un km2 por este cambio, y "
            "esa es la aceptacion de la pieza que lo hizo.",

        "por_que_se_declara_UNA_vez_y_no_52_veces":
            "CLAUDE.md 4.2 prohibe el mapeo por clave con caso por defecto "
            "silencioso, con excepcion unica cuando la ausencia es un estado "
            "legitimo del dato Y SE DECLARA COMO TAL. Este bloque es esa "
            "declaracion: el default deja de ser silencioso porque esta en el dato, "
            "con nombre, con motivo y con el silencio del decreto citado. Repetir "
            "el mismo numero 52 veces seria peor — CLAUDE.md 4.3, y 52 lugares "
            "donde el mismo valor envejece distinto.",

        "por_que_la_capa_gruesa_alcanza_para_200_mn":
            "El rol `limite_exterior` es `ne_land`, 1:10m. El error de una costa a "
            "esa resolucion son cientos de metros, CUATRO ORDENES DE MAGNITUD por "
            "debajo de las 200 millas. Ese argumento es del constructor y sigue "
            "siendo cierto PARA ESTE VALOR. NO se traslada automaticamente a un "
            "alcance corto: a 24 mn la distancia entre los dos ordenes es de DOS, "
            "no de cuatro. Ver `nota_sobre_la_capa_de_un_alcance_corto`.",
    },

    "como_se_declara_uno_propio":
        "Una jurisdiccion que se aparta del default escribe su propio "
        "`alcance_costa_afuera` con `metros`, `equivalencia`, `tipo`, "
        "`decidido_por`, `motivo` y `capa_rol`. El constructor lo lee del dato; NO "
        "hay ninguna rama en el codigo que nombre una jurisdiccion (CLAUDE.md 4.3). "
        "Al 2026-08-15 NINGUNA lo declara: `arica` tiene su alcance de 24 mn "
        "decidido y escrito EN PROSA dentro de `limite_norte_convencion.alcance`, y "
        "pasarlo a este bloque es lo que promueve `arica` al tercer estado de "
        "`estado_geometria` — trabajo de la pieza siguiente, no de esta.",

    "nota_sobre_la_capa_de_un_alcance_corto":
        "PENDIENTE, DEL OWNER, MEDIDO Y NO DECIDIDO. Un alcance corto puede "
        "bufferizarse sobre el rol `limite_exterior` (`ne_land`, gruesa) o sobre el "
        "rol `tierra` (`costa_osm`, fina). No es umbral tecnico: mueve el borde que "
        "el patron ve, asi que es del owner (CLAUDE.md 0.4). Los dos bordes estan "
        "medidos sobre la banda de `arica` en "
        "_bitacoras/alcance_costa_afuera_2026-08-15/05_mascara_24mn.txt. Mientras "
        "no este decidido, `capa_rol` de un alcance propio NO tiene default: el "
        "constructor se detiene si falta.",

    "lo_que_este_bloque_NO_hace":
        "No construye nada, no adjudica agua a nadie y no cambia ningun "
        "`estado_geometria`. Declara el borde exterior que ya estaba en uso y le da "
        "un lugar en el dato a los que se aparten de el.",

    "evidencia": "_bitacoras/alcance_costa_afuera_2026-08-15/",
}


def main():
    crudo = open(V1, "rb").read()
    d = json.load(io.open(V1, encoding="utf-8"))

    # Fidelidad de formato: si el archivo no vuelve a salir identico, cualquier
    # escritura reflowaria el archivo entero y el diff dejaria de mostrar el
    # cambio. Se comprueba ANTES de tocar nada.
    def serializar(obj):
        return json.dumps(obj, ensure_ascii=False,
                          indent=2).replace("\n", "\r\n").encode("utf-8")

    if serializar(d) != crudo:
        print("ALTO: el v1 no round-trip-ea byte a byte con "
              "(CRLF, indent=2, ensure_ascii=False). No se escribe: el diff "
              "vendria con el archivo entero reflowado.")
        return 2

    if CLAVE in d:
        if d[CLAVE] == BLOQUE:
            print(f"ok  el bloque '{CLAVE}' ya esta y es identico. No se escribe "
                  f"nada (idempotente).")
            return 0
        print(f"ALTO: el v1 ya trae '{CLAVE}' con OTRO contenido. Sobrescribirlo "
              f"seria una edicion silenciosa del insumo fuente (INV-3.7). Se "
              f"detiene.")
        return 2

    # Posicion: despues de `nota_construccion`, que es el otro bloque de
    # convenciones de construccion de nivel superior. Un dict de Python conserva
    # el orden de insercion, asi que se rearma en vez de agregar al final.
    salida = {}
    for k, v in d.items():
        salida[k] = v
        if k == "nota_construccion":
            salida[CLAVE] = BLOQUE
    if CLAVE not in salida:
        print("ALTO: no se encontro 'nota_construccion' en el v1; no se adivina "
              "otra posicion.")
        return 2

    nuevo = serializar(salida)
    open(V1, "wb").write(nuevo)
    print(f"ok  '{CLAVE}' insertado en {os.path.relpath(V1, REPO)}")
    print(f"    bytes {len(crudo)} -> {len(nuevo)}  (+{len(nuevo) - len(crudo)})")
    print(f"    claves de nivel superior: {len(d)} -> {len(salida)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
