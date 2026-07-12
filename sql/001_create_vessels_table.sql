CREATE TABLE IF NOT EXISTS vessels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  trg DECIMAL(6, 2) NOT NULL,
  tipo_nave VARCHAR(20) NOT NULL CHECK (tipo_nave IN ('barcaza', 'trasmallo', 'motonave', 'catamarano', 'otro')),
  eslora DECIMAL(6, 2) NOT NULL,
  manga DECIMAL(6, 2) NOT NULL,
  puntal DECIMAL(6, 2),
  motor_hp INTEGER,
  consumo_nominal DECIMAL(5, 2),
  capacidad_fuel INTEGER,
  cb_asignado DECIMAL(4, 3) NOT NULL,
  desplazamiento_vacio DECIMAL(8, 2) NOT NULL,
  calado_vacio_aprox DECIMAL(6, 3),
  validacion_warning BOOLEAN DEFAULT FALSE,
  validacion_mensaje TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT check_eslora_positive CHECK (eslora > 0),
  CONSTRAINT check_manga_positive CHECK (manga > 0),
  CONSTRAINT check_trg_positive CHECK (trg > 0),
  CONSTRAINT check_cb_range CHECK (cb_asignado >= 0.40 AND cb_asignado <= 0.80),
  CONSTRAINT check_desplazamiento_positive CHECK (desplazamiento_vacio > 0)
);

CREATE INDEX idx_vessels_user_id ON vessels(user_id);
CREATE INDEX idx_vessels_updated_at ON vessels(updated_at DESC);

CREATE OR REPLACE FUNCTION update_vessels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vessels_updated_at ON vessels;

CREATE TRIGGER trigger_vessels_updated_at
BEFORE UPDATE ON vessels
FOR EACH ROW
EXECUTE FUNCTION update_vessels_updated_at();
