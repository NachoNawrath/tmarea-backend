"""
FASE 5 — REGISTRO DE TOPONIMOS VERIFICADOS CONTRA EL IGM.

    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe scripts\\fase5_registrar_toponimos_igm.py

Escribe en el insumo cuatro puntos notables que el decreto nombra sin coordenadas y
que se resolvieron contra la capa oficial de Toponimos del IGM, y actualiza la causa
de las dos jurisdicciones que esos puntos dejan a un solo pendiente de cerrar.

POR QUE UN SCRIPT Y NO UNA EDICION A MANO: INV-3.7. El insumo es dato fuente y sus
correcciones tienen que quedar registradas con que dice el decreto, que se leyo y
por que. Este script ES ese registro, y es idempotente: correrlo dos veces deja el
archivo igual.

LA FUENTE, consultada y verificada el 2026-08-10, no transcrita de segunda mano:
  https://gis.inv.igm.cl/host/rest/services/Hosted/L/FeatureServer/0
  capa SECCION_L del Geoportal de Chile, Instituto Geografico Militar, 1:50.000.
  Consulta: /query?where=UPPER(texto) LIKE UPPER('%<nombre>%')&outSR=4326&f=json

SOBRE LA PRECISION QUE SE GUARDA. El servicio devuelve decimales; el decreto escribe
grados-minutos-segundos enteros. Se guarda el DMS redondeado al segundo entero Y el
decimal DERIVADO DE ESE DMS, para que los dos digan exactamente lo mismo — el
auditor compara DMS contra decimal con tolerancia de 5e-5 grados y una discrepancia
de redondeo lo haria fallar cuando estos puntos entren a un contorno. El valor crudo
del servicio queda guardado en fuente.valor_servicio: no se pierde nada, y lo que se
usa para construir es lo que el decreto sabria escribir. El redondeo es de hasta
0,5 segundos, unos 15 metros.
"""

import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V2 = os.path.join(REPO, "data", "decreto", "jurisdicciones_v2.json")

SERVICIO = ("https://gis.inv.igm.cl/host/rest/services/Hosted/L/FeatureServer/0"
            " — capa SECCION_L, Toponimos IGM, Geoportal de Chile, 1:50.000")
CONSULTA = "2026-08-10"


def dec(dms_txt):
    """'54 07 01 S' -> -54.116944. El decimal se DERIVA del DMS a proposito."""
    g, m, s, h = dms_txt.split()
    v = int(g) + int(m) / 60 + int(s) / 3600
    return round(-v if h in ("S", "W") else v, 6)


PUNTOS = [
    {
        "nombre": "Punta Anxious",
        "lat_dms": "54 07 01 S", "lon_dms": "070 56 04 W",
        "valor_servicio": (-54.116886, -70.934365),
        "texto_servicio": "Punta Anxious",
        "usado_por": ["Punta Arenas", "Tierra del Fuego"],
        "grafia": "El decreto lo escribe 'Punta Anxius'. La capa del IGM no tiene "
                  "ningun toponimo 'Anxius' — la consulta devuelve CERO — y si tiene "
                  "'Anxious'. Es una diferencia de grafia de la fuente del decreto, "
                  "no otro lugar.",
        "motivo_eleccion":
            "Es el UNICO 'Punta Anxious' de la capa. Los otros dos resultados de la "
            "consulta son 'Islotes Anxious' (54 06 58.1 S / 070 57 04.1 W) y 'Faro "
            "Islotes Anxious' (54 07 04.4 S / 070 57 16.0 W), los dos a menos de "
            "1,5 km: confirman el lugar en vez de competir con el.",
        "descartados": [],
    },
    {
        "nombre": "Peninsula Brecknock",
        "lat_dms": "54 33 42 S", "lon_dms": "071 51 01 W",
        "valor_servicio": (-54.561585, -71.850386),
        "texto_servicio": "PENÍNSULA BRECKNOCK",
        "usado_por": ["Punta Arenas"],
        "grafia": None,
        "motivo_eleccion":
            "La capa trae 19 toponimos con 'Brecknock', NUEVE de ellos llamados "
            "'PENÍNSULA BRECKNOCK': la peninsula esta representada por varios puntos "
            "y hay que elegir uno. Se elige el MAS CERCANO AL PARALELO 54 33 00 S, a "
            "1,29 km, porque es asi como el decreto la usa: 'hasta la Peninsula "
            "Brecknock y LUEGO POR EL PARALELO 54 33 00 S hacia el Oceano Pacifico'. "
            "El toponimo es el fin de un recorrido costero que empalma con ese "
            "paralelo, y el punto elegido hace ese empalme continuo.",
        "descartados": [
            "'Faro Península Brecknock' (54 37 30.4 S / 071 45 46.5 W). Era la "
            "primera eleccion, por ser marca de navegacion. Se descarta porque el "
            "decreto NO lo usa como marca sino como fin de recorrido: el faro queda "
            "8,3 km AL SUR del paralelo 54 33 00 S por el que el limite sigue, y "
            "elegirlo dejaria un salto de 8,3 km entre el final del recorrido "
            "costero y el paralelo. El criterio 'marca de navegacion' es bueno en "
            "general y equivocado en este caso. Decidido por la owner el 2026-08-10.",
            "los otros ocho 'PENÍNSULA BRECKNOCK', todos mas lejos del paralelo: "
            "54 30 59.7 S, 54 30 48.4 S, 54 30 19.7 S, 54 29 45.3 S, 54 29 42.1 S, "
            "54 29 01.3 S, 54 28 36.2 S y uno muy al Norte, 52 58 42.2 S.",
        ],
    },
    {
        "nombre": "Punta Harry",
        "lat_dms": "52 43 01 S", "lon_dms": "070 34 17 W",
        "valor_servicio": (-52.717013, -70.571306),
        "texto_servicio": "Punta Harry",
        "usado_por": ["Punta Arenas", "Punta Delgada"],
        "grafia": None,
        "motivo_eleccion":
            "La capa devuelve DOS 'Punta Harry'. Se elige esta porque el decreto la "
            "une con Cabo San Vicente 'en la Segunda Angostura del Estrecho de "
            "Magallanes', y desde esta hasta Cabo San Vicente hay 11,7 km medidos, "
            "en riberas opuestas de la Angostura.",
        "descartados": [
            "el otro 'Punta Harry', en 53 19 22.7 S / 073 11 20.6 W, a 197 km "
            "medidos de Cabo San Vicente, en los canales occidentales. Ninguna "
            "lectura del decreto une esa punta con Cabo San Vicente.",
        ],
    },
    {
        "nombre": "Cabo San Vicente",
        "lat_dms": "52 46 49 S", "lon_dms": "070 25 57 W",
        "valor_servicio": (-52.780330, -70.432513),
        "texto_servicio": "Cabo San Vicente",
        "usado_por": ["Punta Arenas", "Punta Delgada", "Tierra del Fuego"],
        "grafia": None,
        "motivo_eleccion":
            "Unico 'Cabo San Vicente' de la capa. Se registra porque lo citan TRES "
            "jurisdicciones y no venia en el lote de coordenadas que trajo la owner: "
            "sin el, ni Punta Delgada ni Tierra del Fuego tienen su linea divisoria.",
        "descartados": [
            "'Faro Cabo San Vicente' (52 46 31.0 S / 070 26 34.1 W), a 600 m. El "
            "decreto nombra el cabo, no el faro.",
        ],
    },
]

# El pendiente que queda, dicho como pendiente y no rellenado por deduccion (INV-3.7)
PENDIENTE_ORIENTE = {
    "id": "limite_maritimo_internacional_oriente_magallanes",
    "que_falta": "el extremo ARGENTINO de la linea que cierra por el Oriente la boca "
                 "oriental del Estrecho de Magallanes: Cabo del Espiritu Santo.",
    "decision_owner": "Se acepta la linea Punta Dungeness - Cabo del Espiritu Santo "
                      "del Tratado de Limites de 1881 como 'el limite maritimo "
                      "internacional por el Oriente' que invoca el decreto. Owner, "
                      "2026-08-10.",
    "extremo_chileno": {
        "nombre": "Punta Dungeness", "lat_dms": "52 23 53 S", "lon_dms": "068 26 36 W",
        "fuente": SERVICIO, "consultado": CONSULTA,
        "valor_servicio": [-52.398096, -68.443299],
    },
    "extremo_argentino": {
        "nombre": "Cabo del Espiritu Santo", "lat": None, "lon": None,
        "motivo_ausencia": "la consulta 'Espiritu Santo' contra la capa SECCION_L "
                           "devuelve CERO resultados: es costa argentina y esta es "
                           "la capa del IGM chileno. Hace falta otra fuente. NO se "
                           "deduce ni se aproxima.",
    },
    "bloquea": ["punta_delgada", "tierra_del_fuego"],
}


def main():
    v2 = json.load(open(V2, encoding="utf-8"))
    notables = v2.setdefault("puntos_notables", [])
    por_nombre = {p["nombre"]: p for p in notables}

    nuevos = act = 0
    for p in PUNTOS:
        reg = {
            "nombre": p["nombre"],
            "lat_dms": p["lat_dms"], "lon_dms": p["lon_dms"],
            "lat": dec(p["lat_dms"]), "lon": dec(p["lon_dms"]),
            "fuente": {
                "servicio": SERVICIO,
                "consultado": CONSULTA,
                "texto_en_la_capa": p["texto_servicio"],
                "valor_servicio": list(p["valor_servicio"]),
                "nota_precision": "lat/lon derivados del DMS redondeado al segundo "
                                  "entero, para que DMS y decimal coincidan exacto. "
                                  "El crudo del servicio esta en valor_servicio; el "
                                  "redondeo es de hasta 0,5 s, unos 15 m.",
            },
            "usado_por": p["usado_por"],
            "motivo_eleccion": p["motivo_eleccion"],
            "descartados": p["descartados"],
        }
        if p["grafia"]:
            reg["nota_grafia"] = p["grafia"]
        if p["nombre"] in por_nombre:
            i = notables.index(por_nombre[p["nombre"]])
            if notables[i] != reg:
                notables[i] = reg
                act += 1
        else:
            notables.append(reg)
            nuevos += 1

    # Las dos nulas: la causa cambia, porque el pendiente cambio de tamaño.
    causas = {
        "punta_delgada":
            "falta UNICAMENTE el limite maritimo internacional por el Oriente, que "
            "el propio decreto invoca sin darlo en coordenadas. Su linea del Weste "
            "ya esta resuelta: Punta Harry y Cabo San Vicente estan verificados "
            "contra la capa de Toponimos del IGM (ver puntos_notables). El owner "
            "acepto que ese limite es la linea Punta Dungeness - Cabo del Espiritu "
            "Santo del Tratado de 1881; falta el extremo argentino, que la capa "
            "chilena no trae. Ver pendientes.",
        "tierra_del_fuego":
            "faltan DOS cosas, y ya no es la falta de coordenadas de sus accidentes: "
            "Cabo San Vicente y Punta Anxious estan verificados contra la capa de "
            "Toponimos del IGM (ver puntos_notables). Falta (1) el limite oriental "
            "internacional — mismo pendiente que Punta Delgada, ver pendientes — y "
            "(2) un ancla que diga de que lado de la linea esta la jurisdiccion. El "
            "decreto dice 'el area oriental', pero la construccion no decide lados "
            "por letra cardinal; lo limpio es anclar en uno de los cuerpos que el "
            "propio parrafo le enumera (Bahia Gente Grande, Bahia Inutil, Canal "
            "Whiteside, Canal Gabriel, Seno Almirantazgo).",
    }
    tocadas = []
    for j in v2["jurisdicciones"]:
        if j["id"] in causas and j["causa_sin_geometria"] != causas[j["id"]]:
            j["causa_sin_geometria"] = causas[j["id"]]
            tocadas.append(j["nombre"])

    pend = v2.setdefault("pendientes", [])
    if not any(x.get("id") == PENDIENTE_ORIENTE["id"] for x in pend):
        pend.append(PENDIENTE_ORIENTE)
        nuevo_pend = True
    else:
        pend[[x.get("id") for x in pend].index(PENDIENTE_ORIENTE["id"])] = \
            PENDIENTE_ORIENTE
        nuevo_pend = False

    with open(V2, "w", encoding="utf-8") as fh:
        json.dump(v2, fh, ensure_ascii=False, indent=1)

    print("FASE 5 — REGISTRO DE TOPONIMOS IGM")
    print(f"  puntos notables agregados : {nuevos}")
    print(f"  puntos notables corregidos: {act}")
    print(f"  causas actualizadas       : {tocadas or 'ninguna'}")
    print(f"  pendiente {'agregado' if nuevo_pend else 'actualizado'}: "
          f"{PENDIENTE_ORIENTE['id']}")
    print("")
    for p in PUNTOS:
        print(f"  {p['nombre']:<22} {p['lat_dms']:>12} / {p['lon_dms']:>13}"
              f"   -> {dec(p['lat_dms'])}, {dec(p['lon_dms'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
