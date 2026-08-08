DO $$
DECLARE
  r RECORD;
  dup RECORD;
  insertados INT := 0;
  duplicados INT := 0;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('Puerto de Arica',            -70.322, -18.475),
      ('Terminal Sica Sica',          -70.323, -18.461),
      ('Puerto de Iquique',           -70.156, -20.201),
      ('Puerto de Tocopilla',         -70.203, -22.085),
      ('Puerto Angamos / Mejillones', -70.418, -23.100),
      ('Puerto de Antofagasta',       -70.403, -23.645),
      ('Puerto Barquito',             -70.627, -26.353),
      ('Puerto Caldera',              -70.824, -27.065),
      ('Puerto Guacolda / Las Losas', -71.250, -28.468),
      ('Puerto Coquimbo',             -71.336, -29.951),
      ('Puerto Guayacan',             -71.350, -29.966),
      ('Punta Chungo',                -71.503, -31.897),
      ('Puerto Ventanas',             -71.482, -32.744),
      ('Puerto San Antonio',          -71.616, -33.585),
      ('Puerto Lirquen',              -72.977, -36.711),
      ('Puerto Talcahuano',           -73.111, -36.712),
      ('Puerto San Vicente',          -73.133, -36.726),
      ('Puerto Coronel',              -73.153, -37.025),
      ('Puerto Cabo Froward',         -73.161, -37.009),
      ('Puerto Corral',               -73.427, -39.883),
      ('Puerto Las Mulatas',          -73.245, -39.827),
      ('Puerto de Puerto Montt',      -72.964, -41.481),
      ('Puerto Chincui / Oxxean',     -73.047, -41.512),
      ('Puerto Calbuco',              -73.132, -41.778)
    ) AS t(nombre, lon, lat)
  LOOP
    SELECT id, nombre INTO dup
    FROM nodos_maritimos
    WHERE ST_DWithin(
      geom::geography,
      ST_SetSRID(ST_MakePoint(r.lon, r.lat), 4326)::geography,
      500
    )
    LIMIT 1;

    IF dup.id IS NOT NULL THEN
      RAISE NOTICE 'DUPLICADO: % -> ya existe "%" (id=%)', r.nombre, dup.nombre, dup.id;
      duplicados := duplicados + 1;
    ELSE
      INSERT INTO nodos_maritimos (nombre, geom, fuente, tipo)
      VALUES (r.nombre, ST_SetSRID(ST_MakePoint(r.lon, r.lat), 4326), 'BEM', 'puerto');
      RAISE NOTICE 'INSERTADO: %', r.nombre;
      insertados := insertados + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '---';
  RAISE NOTICE 'Insertados: % | Duplicados: % | Total procesados: %', insertados, duplicados, insertados + duplicados;
END $$;

SELECT COUNT(*) AS total_nodos FROM nodos_maritimos;
SELECT nombre, fuente, bahia_sitport_id FROM nodos_maritimos WHERE fuente = 'BEM' ORDER BY nombre;
