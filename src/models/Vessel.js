/**
 * VESSEL MODEL
 *
 * Esquema de BD para perfil de nave del usuario.
 * Un usuario = UNA nave activa (última registrada sobrescribe anterior).
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Vessel = sequelize.define(
    'Vessel',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre de la embarcación'
      },
      trg: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        comment: 'Toneladas de Registro'
      },
      tipo_nave: {
        type: DataTypes.ENUM('barcaza', 'trasmallo', 'motonave', 'catamarano', 'otro'),
        allowNull: false,
        defaultValue: 'trasmallo',
        comment: 'Tipo de nave'
      },
      eslora: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        comment: 'Eslora entre perpendiculares (metros)'
      },
      manga: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        comment: 'Manga (metros)'
      },
      puntal: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
        comment: 'Puntal (metros)'
      },
      motor_hp: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Potencia motor (HP)'
      },
      consumo_nominal: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Consumo nominal (L/h)'
      },
      capacidad_fuel: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Capacidad tanque fuel (litros)'
      },
      cb_asignado: {
        type: DataTypes.DECIMAL(4, 3),
        allowNull: false,
        comment: 'Coeficiente de bloque (SOLAS)'
      },
      desplazamiento_vacio: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        comment: 'Desplazamiento sin carga (toneladas)'
      },
      calado_vacio_aprox: {
        type: DataTypes.DECIMAL(6, 3),
        allowNull: true,
        comment: 'Calado aproximado sin carga (metros)'
      },
      validacion_warning: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Flag si desplazamiento desviado vs TRG'
      },
      validacion_mensaje: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mensaje de validación'
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
      }
    },
    {
      tableName: 'vessels',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ['user_id']
        }
      ]
    }
  );

  return Vessel;
};
