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


# ---------------------------------------------------------------------------
# VERIFICACION A MANO CONTRA EL TEXTO FUENTE — 2026-08-21
#
# La Sec 6.1 de docs/TMAREA_SPEC_Router_Raster_v1.md la pedia ANTES de cargar
# ("Dato bien extraido, campo mal interpretado -- verificar caso por caso contra
# el texto fuente") y no se habia corrido. Se corrio el 2026-08-21 sobre los 7,
# leyendo el tomo cacheado; instrumentos reproducibles y salida cruda en
# _bitacoras/advertencia_sonda_2026-08-21/ (mediciones 4, 5 y 6).
#
# ESTAS CORRECCIONES VIVEN ACA Y NO EN EL JSON A PROPOSITO: el JSON se REGENERA
# desde el CSV, asi que una correccion aplicada solo al JSON la pierde en silencio
# el proximo que corra este script. Puestas aca, sobreviven a la regeneracion.
#
# NO SE TOCA pasos_full.csv: es la salida cruda de la extraccion y tiene que
# seguir diciendo lo que la extraccion produjo. Lo que se corrige es LA CARGA.
VERIFICADO_A_MANO = {
    "Canal Tenglo": {
        "sonda_canal_min_m": 1.0,
        # OJO: ESTA CADENA VA A PANTALLA, así que lleva acentos de verdad. El resto
        # de los comentarios de este archivo están sin acentuar por convención del
        # repositorio; este valor no es un comentario, es texto al patrón.
        "punto_bajo": "frente a punta Hoffmann, la parte más angosta y baja del canal",
        "_por_que": (
            "El extractor cargaba 11.0, que es el extremo bajo del RANGO DEL TRAMO MAS "
            "PROFUNDO: p.291 dice <<encontrandose MAYORES profundidades hacia su acceso SW, "
            "donde hay de 11 a 21 metros>>. La misma entrada declara el punto bajo real: "
            "<<frente a la punta Hoffmann, se sonda en bajamar apenas 1 metro, siendo esta "
            "la parte mas angosta y baja del canal Tenglo>>, mas 6,1 m en la otra angostura "
            "y 8,2 m en el acceso E. Cargar 11 dejaba SIN AVISO a toda nave de menos de "
            "10,1 m de calado sobre un punto de 1 m: el error iba en la direccion INSEGURA."),
    },
    "Canal Pilcomayo. Acceso W": {
        "canal": "Canal Pilcomayo",
        "_por_que": (
            "Estaba atribuida a CANAL MORALEDA y la sonda no es de ahi. p.482: <<Es profundo "
            "y sin peligro; pero a medio canal en su ACCESO E hay una sonda de 9,5 metros>> "
            "-- del canal Pilcomayo. Moraleda son ~200 km y la propia frase lo llama profundo "
            "y sin peligro. Reatribuida a Canal Pilcomayo, que no tiene geometria, asi que "
            "deja de poder salir a pantalla. Es ademas LA MISMA FRASE que la fila de p.538: "
            "dos de los siete registros son la misma sonda."),
    },
}


def main():
    registros = []
    with open(IN_CSV, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if not row.get("sonda_canal_min_m"):
                continue
            corr = VERIFICADO_A_MANO.get(row["nombre"], {})
            canal = corr.get("canal", row["canal"])
            registros.append({
                "nombre": row["nombre"],
                "canal": canal,
                "sonda_canal_min_m": corr.get("sonda_canal_min_m", float(row["sonda_canal_min_m"])),
                # El lugar que la fuente le pone a LA SONDA, no al paso. Null donde la
                # fuente no lo nombra, y la rama del texto se elige por eso -- nunca
                # por un regex sobre la prosa (§4.2). Medido: de 7, solo Canal Tenglo
                # nombra el lugar de su sonda; los otros toponimos ubican EL PASO.
                "punto_bajo": corr.get("punto_bajo"),
                "geometria_ref": row["geometria_ref"],
                "pagina": int(row["pagina"]),
                "canal_geometria_disponible": canal in CANALES_CON_GEOMETRIA,
                "verificado_a_mano": row["nombre"] in VERIFICADO_A_MANO,
            })

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(registros, f, ensure_ascii=False, indent=2)

    print(f"{len(registros)} registros -> {OUT_JSON}")
    for r in registros:
        print(f"  {r['nombre']:<28} canal={r['canal']:<16} sonda={r['sonda_canal_min_m']}m "
              f"geometria={'si' if r['canal_geometria_disponible'] else 'NO'}")


if __name__ == "__main__":
    main()
