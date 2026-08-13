"""
E3 — PRUEBA DE MORDIDA DEL GATE POR AMBITO.

Que prueba: que partir el gate por ambito (D3) hace lo que dice y NO afloja nada.
La pregunta que contesta no es "el gate corre", es "el gate sigue mordiendo".

    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe e3_prueba_mordida_gate.py

POR QUE NO CORRE EL BUILD DE VERDAD. La construccion real tarda ~10 minutos y
depende de la costa OSM cargada, asi que ejercitar diez escenarios contra ella no
es viable. Lo que se hace es levantar una capa de prueba de cuatro filas y correr
sobre ella EL MISMO SQL que el constructor emite — importando sus emisores, no
copiandolos. Si manana alguien cambia un control o el gate, esta prueba cambia con
el; si alguien los copiara aca, esta prueba dejaria de probar el codigo que corre.
Es la trampa que CLAUDE.md §2 persigue: dos representaciones de lo mismo que hay
que acordarse de sincronizar.

La capa de prueba se levanta con emitir_ddl(), la tabla que alimenta a C8 con
emitir_traslape_ensanche(), los controles con emitir_controles() y el gate con
emitir_gate(). Todo dentro de una transaccion que termina en ROLLBACK: en la base
no queda nada, ni siquiera cuando un escenario pasa.

SHELL: el agente corre en Git Bash. Para el owner, en PowerShell, desde la raiz:
    tools\\raster-build\\.venv\\Scripts\\python.exe scripts\\e3_prueba_mordida_gate.py
"""

import os
import re
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fase5_construir_capa_ds991 import (          # noqa: E402
    MARCA_PUBLICACION, buscar_psql, emitir_controles, emitir_ddl, emitir_gate,
    emitir_traslape_ensanche, leer_env, sql_str,
)

TABLA = "mordida_gate_ds991"

# Cuadrados de un grado en el Pacifico, lejos de todo. Solo importa si se pisan.
CUADROS = {
    "libre_a": (-80.0, -30.0), "libre_b": (-78.0, -30.0),
    "libre_c": (-80.0, -28.0), "libre_d": (-78.0, -28.0),
    "pisa_a":  (-75.0, -35.0), "pisa_b":  (-74.5, -35.0),
}


def poly(clave):
    x, y = CUADROS[clave]
    anillo = f"{x} {y}, {x + 1} {y}, {x + 1} {y + 1}, {x} {y + 1}, {x} {y}"
    return f"ST_Multi(ST_GeomFromText('POLYGON(({anillo}))', 4326))"


def fila(id_, ambito, cuadro=None, *, estado="construida", causa=None,
         litoral=0, km2_ensanche=None, testigo=True):
    """Una fila de la capa de prueba. La forma la impone emitir_ddl()."""
    g = poly(cuadro) if cuadro else "NULL"
    if cuadro and testigo:
        x, y = CUADROS[cuadro]
        pt = f"ST_SetSRID(ST_MakePoint({x + 0.5}, {y + 0.5}), 4326)"
        causa_pt = "NULL"
    else:
        pt, causa_pt = "NULL", sql_str("de prueba: sin testigo a proposito")
    return (f"INSERT INTO {TABLA} (id, nombre, gobernacion, ambito, "
            f"participa_matching, receta, estado_geometria, causa_sin_geometria, "
            f"sigue_litoral, tramos_litoral, fronteras_aplicadas, km2_ensanche, "
            f"punto_representativo, causa_sin_punto_representativo, texto_decreto, "
            f"_base, _amplia, geom) VALUES ({sql_str(id_)}, {sql_str(id_.upper())}, "
            f"{sql_str('GM de prueba')}, {sql_str(ambito)}, TRUE, "
            f"{sql_str('anillo')}, {sql_str(estado)}, {sql_str(causa)}, FALSE, "
            f"{litoral}, NULL, "
            f"{'NULL' if km2_ensanche is None else km2_ensanche}, {pt}, {causa_pt}, "
            f"{sql_str('texto de prueba')}, {g}, {g}, {g});")


def sql_escenario(filas, habilitados, permitidos=(), con_indice=True):
    L = []
    A = L.append
    A("BEGIN;")
    emitir_ddl(A, TABLA)
    for f in filas:
        A(f)
    A("")
    emitir_traslape_ensanche(A, TABLA)
    A(f"ALTER TABLE {TABLA} DROP COLUMN _base, DROP COLUMN _amplia;")
    if con_indice:
        A(f"CREATE INDEX idx_{TABLA}_geom ON {TABLA} USING GIST (geom);")
    A("")
    emitir_controles(A, TABLA, sorted(permitidos))
    A("")
    emitir_gate(A, TABLA, habilitados)
    A("")
    A("DO $$")
    A("DECLARE q TEXT;")
    A("BEGIN")
    A(f"  SELECT string_agg(id, ',' ORDER BY id) INTO q FROM {TABLA};")
    A("  RAISE NOTICE 'SOBREVIVEN :: [%]', COALESCE(q, '');")
    A("END $$;")
    A("ROLLBACK;")
    return "\n".join(L)


def correr(sql, psql, cfg):
    with tempfile.NamedTemporaryFile("w", suffix=".sql", encoding="utf-8",
                                     delete=False) as fh:
        fh.write(sql)
        ruta = fh.name
    try:
        p = subprocess.run([psql, "-h", cfg["DB_HOST"], "-p", cfg["DB_PORT"],
                            "-U", cfg["DB_USER"], "-d", cfg["DB_NAME"],
                            "-v", "ON_ERROR_STOP=1", "-q", "-f", ruta],
                           env=dict(os.environ, PGPASSWORD=cfg["DB_PASSWORD"]),
                           capture_output=True, text=True, encoding="utf-8",
                           errors="replace")
    finally:
        os.unlink(ruta)
    salida = (p.stdout or "") + (p.stderr or "")
    pub, falla, decl, sobreviven = None, None, None, None
    m = re.search(MARCA_PUBLICACION + r"\s*publicados=\[([^\]]*)\]\s*"
                  r"retenidos_por_falla=\[([^\]]*)\]\s*"
                  r"retenidos_por_declaracion=\[([^\]]*)\]", salida)
    if m:
        pub, falla, decl = [sorted(x for x in g.split(",") if x) for g in m.groups()]
    s = re.search(r"SOBREVIVEN :: \[([^\]]*)\]", salida)
    if s:
        sobreviven = sorted(x for x in s.group(1).split(",") if x)
    return {"exit": p.returncode, "publicados": pub, "por_falla": falla,
            "por_declaracion": decl, "sobreviven": sobreviven, "salida": salida}


# ── Los escenarios ───────────────────────────────────────────────────────────
# TODO habilitado salvo donde el escenario diga otra cosa.
HAB_TODO = {"maritima": True, "lacustre": True, "antartica": True,
            "insular_remota": True}

SANAS = [fila("mar_a", "maritima", "libre_a"), fila("mar_b", "maritima", "libre_b"),
         fila("lac_a", "lacustre", "libre_c"), fila("lac_b", "lacustre", "libre_d")]

casos = []


def caso(nombre, sql, espera):
    casos.append({"nombre": nombre, "sql": sql, "espera": espera})


# 1. CONTROL NEGATIVO PRIMERO. Un gate que retiene todo no prueba nada.
caso("CONTROL NEGATIVO — capa sana, todo habilitado: publican los dos ambitos",
     sql_escenario(SANAS, HAB_TODO),
     {"exit": 0, "publicados": ["lacustre", "maritima"],
      "sobreviven": ["lac_a", "lac_b", "mar_a", "mar_b"]})

# 2. EL CASO DE E3, el que motiva toda la etapa.
caso("C3 falla entre dos MARITIMAS: lo lacustre sale igual",
     sql_escenario([fila("mar_a", "maritima", "pisa_a"),
                    fila("mar_b", "maritima", "pisa_b")] + SANAS[2:], HAB_TODO),
     {"exit": 0, "publicados": ["lacustre"], "por_falla": ["maritima"],
      "sobreviven": ["lac_a", "lac_b"]})

# 3. LA DIRECCION CONTRARIA. Partir el gate no puede volver permisivo al ambito
#    que la etapa quiere publicar: si el traslape es LACUSTRE, lo lacustre no sale.
caso("C3 falla entre dos LACUSTRES: lo lacustre NO sale, lo maritimo si",
     sql_escenario(SANAS[:2] + [fila("lac_a", "lacustre", "pisa_a"),
                                fila("lac_b", "lacustre", "pisa_b")], HAB_TODO),
     {"exit": 0, "publicados": ["maritima"], "por_falla": ["lacustre"],
      "sobreviven": ["mar_a", "mar_b"]})

# 4. PAR CRUZADO. Un lado de cada ambito: no es de ninguno de los dos, va al
#    alcance de capa y no publica nadie. Decidir cual de los dos lados sobra exige
#    interpretar el decreto (E4).
caso("C3 con un par CRUZADO maritima x lacustre: no publica ningun ambito",
     sql_escenario([fila("mar_a", "maritima", "pisa_a"),
                    fila("lac_a", "lacustre", "pisa_b")], HAB_TODO),
     {"exit_no_cero": True, "sobreviven": None})

# 5. EL TRASLAPE DECLARADO SIGUE VALIENDO. Puyehue en miniatura: dos lacustres que
#    se pisan y estan declaradas, y el ambito publica igual.
caso("traslape DECLARADO entre dos lacustres: C3 lo acepta y lo lacustre publica",
     sql_escenario(SANAS[:2] + [fila("lac_a", "lacustre", "pisa_a"),
                                fila("lac_b", "lacustre", "pisa_b")],
                   HAB_TODO, permitidos=[("lac_a", "lac_b")]),
     {"exit": 0, "publicados": ["lacustre", "maritima"],
      "sobreviven": ["lac_a", "lac_b", "mar_a", "mar_b"]}),

# 6. LA HABILITACION MUERDE. Un ambito impecable que la declaracion no habilita no
#    entra — que es lo que impide que partir el gate publique solo un ambito que
#    ninguna etapa audito.
caso("un ambito SANO pero NO habilitado no entra, y sus filas no quedan",
     sql_escenario(SANAS, dict(HAB_TODO, maritima=False)),
     {"exit": 0, "publicados": ["lacustre"], "por_declaracion": ["maritima"],
      "sobreviven": ["lac_a", "lac_b"]})

# 7. HABILITADO Y SIN NADA QUE PUBLICAR. Es el caso de insular_remota.
caso("un ambito habilitado cuyas jurisdicciones son todas nulas declaradas",
     sql_escenario(SANAS[2:] + [
         fila("ins_a", "insular_remota", None, estado="nula_declarada",
              causa="de prueba: el decreto no la cierra")], HAB_TODO),
     {"exit": 0, "publicados": ["lacustre"], "por_declaracion": ["insular_remota"],
      "sobreviven": ["lac_a", "lac_b"]})

# 8. OTRO CONTROL, MISMO GATE. C3 no es el unico que tiene que acotar su alcance.
caso("C1 falla en una LACUSTRE (construida sin geometria): no publica lo lacustre",
     sql_escenario(SANAS[:2] + [fila("lac_a", "lacustre", None),
                                fila("lac_b", "lacustre", "libre_d")], HAB_TODO),
     {"exit": 0, "publicados": ["maritima"], "por_falla": ["lacustre"],
      "sobreviven": ["mar_a", "mar_b"]})

# 9. UN CONTROL ESTRUCTURAL NO SE REPARTE. Sin indice, la capa entera no sirve.
caso("C7 sin indice espacial: es de la capa, no de un ambito, y no publica nadie",
     sql_escenario(SANAS, HAB_TODO, con_indice=False),
     {"exit_no_cero": True, "sobreviven": None})

# 10. NINGUN MAPEO POR CLAVE CON DEFAULT SILENCIOSO (§4.2).
caso("un ambito construido que el registro no declara: se detiene",
     sql_escenario(SANAS, {k: v for k, v in HAB_TODO.items() if k != "lacustre"}),
     {"exit_no_cero": True, "sobreviven": None})


def main():
    cfg, psql = leer_env(), buscar_psql()
    print("PRUEBA DE MORDIDA — GATE POR AMBITO DE LA CAPA DEL D.S. 991 (E3)")
    print(f"tabla de prueba: {TABLA} · todo dentro de una transaccion que hace "
          f"ROLLBACK")
    print("los controles y el gate se IMPORTAN del constructor, no se copian")
    print("=" * 78)

    ok_total = 0
    for i, c in enumerate(casos, 1):
        r = correr(c["sql"], psql, cfg)
        e, fallas = c["espera"], []
        if e.get("exit_no_cero"):
            if r["exit"] == 0:
                fallas.append(f"esperaba que se detuviera y salio 0")
        elif r["exit"] != e.get("exit", 0):
            fallas.append(f"exit {r['exit']}, esperaba {e.get('exit', 0)}")
        for k in ("publicados", "por_falla", "por_declaracion", "sobreviven"):
            if k in e and r[k] != e[k]:
                fallas.append(f"{k}={r[k]}, esperaba {e[k]}")
        # Un escenario que espera detencion no puede darse por bueno porque algo
        # reviento: tiene que reventar por el gate, no por un SQL mal formado.
        if e.get("exit_no_cero") and r["exit"] != 0:
            esperados = ("NINGUN AMBITO PASA EL GATE", "no declara")
            if not any(t in r["salida"] for t in esperados):
                fallas.append("se detuvo, pero no por el gate: "
                              + r["salida"].strip().splitlines()[-1][:120])
        estado = "OK    " if not fallas else "FALLA "
        ok_total += 0 if fallas else 1
        print(f"\n[{i:02d}] {estado} {c['nombre']}")
        print(f"     publicados={r['publicados']} por_falla={r['por_falla']} "
              f"por_declaracion={r['por_declaracion']}")
        print(f"     sobreviven={r['sobreviven']} exit={r['exit']}")
        for f in fallas:
            print(f"     >> {f}")
        if fallas and r["salida"].strip():
            print("     >> ultima linea: "
                  + r["salida"].strip().splitlines()[-1][:200])

    print("\n" + "=" * 78)
    print(f"MORDIDA: {ok_total}/{len(casos)}")
    print("La capa de prueba no quedo en la base: cada escenario termina en "
          "ROLLBACK.")
    sys.exit(0 if ok_total == len(casos) else 1)


if __name__ == "__main__":
    main()
