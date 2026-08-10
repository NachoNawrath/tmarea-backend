-- FASE 3 ter — Control de adyacencia entre vecinas que comparten frontera.
-- Un par comparte frontera si comparte 2 o mas vertices en el JSON del decreto.
-- HUECO: superficie dentro de una franja de 1 km alrededor de la frontera
-- compartida que no cubre ninguna de las dos y que no es tierra.
DROP TABLE IF EXISTS _ady;
CREATE TEMP TABLE _ady (id_a TEXT, id_b TEXT, n_vert INT, linea geometry);
INSERT INTO _ady VALUES ('achao', 'castro', 6, ST_GeomFromText('LINESTRING (-73.358333 -42.333333, -73.397222 -42.661111, -73.397222 -42.586667, -73.508333 -42.547222, -73.644444 -42.466667, -73.658333 -42.391667)', 4326));
INSERT INTO _ady VALUES ('achao', 'quemchi', 2, ST_GeomFromText('LINESTRING (-73.358333 -42.333333, -73.283333 -42.391667)', 4326));
INSERT INTO _ady VALUES ('ancud', 'calbuco', 2, ST_GeomFromText('LINESTRING (-73.525 -41.783333, -73 -42)', 4326));
INSERT INTO _ady VALUES ('ancud', 'maullin', 2, ST_GeomFromText('LINESTRING (-73.75 -41.744444, -73.525 -41.783333)', 4326));
INSERT INTO _ady VALUES ('bahia_fildes', 'puerto_soberania', 2, ST_GeomFromText('LINESTRING (-59.266667 -62.833333, -59.5 -58.25)', 4326));
INSERT INTO _ady VALUES ('bahia_fildes', 'rada_covadonga', 2, ST_GeomFromText('LINESTRING (-53 -61.5, -59.266667 -62.833333)', 4326));
INSERT INTO _ady VALUES ('bahia_paraiso', 'puerto_soberania', 2, ST_GeomFromText('LINESTRING (-59.266667 -62.833333, -75.25 -65)', 4326));
INSERT INTO _ady VALUES ('bahia_paraiso', 'rada_covadonga', 2, ST_GeomFromText('LINESTRING (-53 -70, -59.266667 -62.833333)', 4326));
INSERT INTO _ady VALUES ('calbuco', 'hornopiren', 2, ST_GeomFromText('LINESTRING (-73 -42, -72.883333 -41.911667)', 4326));
INSERT INTO _ady VALUES ('calbuco', 'puerto_montt', 3, ST_GeomFromText('LINESTRING (-73.065 -41.65, -72.883333 -41.911667, -72.875 -41.65)', 4326));
INSERT INTO _ady VALUES ('castro', 'chonchi', 4, ST_GeomFromText('LINESTRING (-73.558333 -42.661111, -73.558333 -42.558333, -73.616667 -42.558333, -73.616667 -42.583333)', 4326));
INSERT INTO _ady VALUES ('chaiten', 'quellon', 2, ST_GeomFromText('LINESTRING (-73.25 -43.008333, -73.25 -43.740278)', 4326));
INSERT INTO _ady VALUES ('chonchi', 'quellon', 4, ST_GeomFromText('LINESTRING (-73.325 -43.008333, -73.602778 -42.922222, -73.602778 -42.886111, -73.75 -42.833333)', 4326));
INSERT INTO _ady VALUES ('cochamo', 'puerto_montt', 2, ST_GeomFromText('LINESTRING (-72.651111 -41.733333, -72.641667 -41.704167)', 4326));
INSERT INTO _ady VALUES ('corral', 'valdivia', 3, ST_GeomFromText('LINESTRING (-73.405 -39.865278, -73.405 -39.871667, -73.374167 -39.890278)', 4326));
INSERT INTO _ady VALUES ('lirquen', 'talcahuano', 2, ST_GeomFromText('LINESTRING (-73.013333 -36.516667, -73.013333 -36.736111)', 4326));
INSERT INTO _ady VALUES ('melinka', 'puerto_cisnes', 4, ST_GeomFromText('LINESTRING (-73.5 -43.740278, -73.453611 -43.985278, -73.4 -44.266667, -73.541667 -44.781667)', 4326));
INSERT INTO _ady VALUES ('puerto_aguirre', 'puerto_chacabuco', 4, ST_GeomFromText('LINESTRING (-73.361111 -44.954167, -73.273333 -45.245833, -73.491667 -45.371667, -73.551944 -45.463333)', 4326));
INSERT INTO _ady VALUES ('puerto_aguirre', 'puerto_cisnes', 2, ST_GeomFromText('LINESTRING (-73.541667 -44.781667, -73.361111 -44.954167)', 4326));

CREATE TEMP TABLE _tierra2 AS
SELECT ST_Subdivide(ST_MakeValid(geom), 256) AS geom FROM mapa_base_multipoligonos
WHERE geom && ST_MakeEnvelope(-85.0, -60, -65.0, -17, 4326)
UNION ALL
SELECT ST_Subdivide(ST_MakeValid(ST_Intersection(ST_MakeValid(geom),
       ST_MakeEnvelope(-85.0, -60, -65.0, -17, 4326))), 256) FROM ne_land
WHERE ST_Intersects(geom, ST_MakeEnvelope(-85.0, -60, -65.0, -17, 4326));
CREATE INDEX ON _tierra2 USING GIST (geom);
ANALYZE _tierra2;

-- Un par con una geometria NULL NO se informa como traslape 0 ni hueco 0: se
-- informa como no evaluable. Cero medido y cero por falta de dato son cosas
-- distintas, y darlos con el mismo numero es el falso negativo silencioso que
-- prohibe INV-3.6, aplicado al control en vez de a la capa.
SELECT a.nombre AS vecina_a, b.nombre AS vecina_b, d.n_vert AS vert_comunes,
  a.estado_geometria AS est_a, b.estado_geometria AS est_b,
  (a.geom IS NOT NULL AND b.geom IS NOT NULL) AS evaluable,
  round((ST_Area(ST_Intersection(a.geom, b.geom)::geography)
        /1e6)::numeric, 4) AS km2_traslape,
  round((ST_Area((
     SELECT ST_Difference(
       ST_Difference(ST_Buffer(d.linea::geography, 1000)::geometry,
         ST_Union(a.geom, b.geom)),
       COALESCE((SELECT ST_UnaryUnion(ST_Collect(t.geom)) FROM _tierra2 t
                 WHERE t.geom && ST_Buffer(d.linea::geography, 1000)::geometry),
                ST_SetSRID('POLYGON EMPTY'::geometry, 4326)))
  )::geography))/1e6)::numeric, 4) AS km2_hueco
FROM _ady d JOIN jurisdicciones_decreto a ON a.id = d.id_a JOIN jurisdicciones_decreto b ON b.id = d.id_b
ORDER BY evaluable, km2_traslape DESC NULLS LAST, km2_hueco DESC NULLS LAST;