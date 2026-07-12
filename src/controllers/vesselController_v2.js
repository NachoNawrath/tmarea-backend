/**
 * VESSEL CONTROLLER V2 (CON QUEUE)
 *
 * Integra queue system para desacoplamiento:
 * - POST /api/vessels → Encola cálculo, retorna jobId inmediatamente
 * - GET /api/vessels/me → Obtiene resultado (con polling por jobId)
 */

const { Vessel } = require('../models');
const {
  calculateDisplacementByType,
  calculateDraft,
  validateDisplacement
} = require('../utils/displacementCalculator');
const { getCbByType } = require('../constants/vesselTypes');
const { enqueueDisplacementCalc, getJobStatus } = require('../config/queue');
const { QUEUES } = require('../config/queue');

async function createOrUpdateVessel(req, res) {
  try {
    const userId = req.user.id;
    const {
      nombre,
      trg,
      tipo_nave,
      eslora,
      manga,
      puntal,
      motor_hp,
      consumo_nominal,
      capacidad_fuel
    } = req.body;

    if (!nombre || !trg || !eslora || !manga || !tipo_nave) {
      return res.status(400).json({
        error: 'Campos requeridos: nombre, trg, eslora, manga, tipo_nave'
      });
    }

    const jobId = await enqueueDisplacementCalc({
      user_id: userId,
      nombre,
      trg,
      tipo_nave,
      eslora,
      manga,
      puntal: puntal || 2.0,
      motor_hp,
      consumo_nominal,
      capacidad_fuel
    });

    return res.status(202).json({
      success: true,
      message: 'Nave en procesamiento',
      job_id: jobId,
      status_url: `/api/vessels/job/${jobId}`
    });
  } catch (error) {
    console.error('Error en createOrUpdateVessel:', error);
    return res.status(500).json({
      error: 'Error procesando nave',
      message: error.message
    });
  }
}

async function getJobStatus(req, res) {
  try {
    const { jobId } = req.params;

    const status = await require('../config/queue').getJobStatus(
      jobId,
      QUEUES.DISPLACEMENT_CALCULATION
    );

    if (!status) {
      return res.status(404).json({
        error: 'Job not found',
        job_id: jobId
      });
    }

    if (status.state === 'completed' && status.result) {
      const userId = req.user.id;
      const jobData = status.data;

      await Vessel.destroy({ where: { user_id: userId } });

      const cb = getCbByType(jobData.tipo_nave);
      const vessel = await Vessel.create({
        user_id: userId,
        nombre: jobData.nombre,
        trg: jobData.trg,
        tipo_nave: jobData.tipo_nave,
        eslora: jobData.eslora,
        manga: jobData.manga,
        puntal: jobData.puntal,
        motor_hp: jobData.motor_hp,
        consumo_nominal: jobData.consumo_nominal,
        capacidad_fuel: jobData.capacidad_fuel,
        cb_asignado: cb,
        desplazamiento_vacio: status.result.displacement,
        calado_vacio_aprox: status.result.draft,
        validacion_warning: status.result.validation.warning,
        validacion_mensaje: status.result.validation.message
      });

      return res.status(200).json({
        success: true,
        state: 'completed',
        vessel: {
          id: vessel.id,
          nombre: vessel.nombre,
          trg: vessel.trg,
          tipo_nave: vessel.tipo_nave,
          eslora: vessel.eslora,
          manga: vessel.manga,
          puntal: vessel.puntal,
          motor_hp: vessel.motor_hp,
          consumo_nominal: vessel.consumo_nominal,
          capacidad_fuel: vessel.capacidad_fuel,
          cb_asignado: parseFloat(vessel.cb_asignado),
          desplazamiento_vacio: parseFloat(vessel.desplazamiento_vacio),
          calado_vacio_aprox: parseFloat(vessel.calado_vacio_aprox),
          validacion: {
            warning: vessel.validacion_warning,
            message: vessel.validacion_mensaje
          }
        }
      });
    }

    return res.status(200).json({
      job_id: jobId,
      state: status.state,
      progress: status.progress,
      error: status.failedReason || null
    });
  } catch (error) {
    console.error('Error en getJobStatus:', error);
    return res.status(500).json({
      error: 'Error verificando job',
      message: error.message
    });
  }
}

async function getCurrentVessel(req, res) {
  try {
    const userId = req.user.id;

    const vessel = await Vessel.findOne({
      where: { user_id: userId }
    });

    if (!vessel) {
      return res.status(404).json({
        error: 'No hay nave registrada',
        vessel: null
      });
    }

    return res.status(200).json({
      success: true,
      vessel: {
        id: vessel.id,
        nombre: vessel.nombre,
        trg: vessel.trg,
        tipo_nave: vessel.tipo_nave,
        eslora: vessel.eslora,
        manga: vessel.manga,
        puntal: vessel.puntal,
        motor_hp: vessel.motor_hp,
        consumo_nominal: vessel.consumo_nominal,
        capacidad_fuel: vessel.capacidad_fuel,
        cb_asignado: parseFloat(vessel.cb_asignado),
        desplazamiento_vacio: parseFloat(vessel.desplazamiento_vacio),
        calado_vacio_aprox: parseFloat(vessel.calado_vacio_aprox),
        validacion: {
          warning: vessel.validacion_warning,
          message: vessel.validacion_mensaje
        }
      }
    });
  } catch (error) {
    console.error('Error en getCurrentVessel:', error);
    return res.status(500).json({
      error: 'Error obteniendo nave',
      message: error.message
    });
  }
}

async function deleteVessel(req, res) {
  try {
    const userId = req.user.id;

    const deleted = await Vessel.destroy({
      where: { user_id: userId }
    });

    if (deleted === 0) {
      return res.status(404).json({
        error: 'No hay nave para eliminar'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Nave eliminada'
    });
  } catch (error) {
    console.error('Error en deleteVessel:', error);
    return res.status(500).json({
      error: 'Error eliminando nave',
      message: error.message
    });
  }
}

module.exports = {
  createOrUpdateVessel,
  getJobStatus,
  getCurrentVessel,
  deleteVessel
};
