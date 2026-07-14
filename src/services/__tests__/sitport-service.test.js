const test = require('node:test');
const assert = require('node:assert');
const axios = require('axios');

// Cada test recarga el módulo para partir con la cache en memoria vacía.
// axios se mockea reemplazando post/get directamente porque es un singleton
// compartido entre las recargas del servicio.
function freshService() {
  delete require.cache[require.resolve('../sitport-service')];
  return require('../sitport-service');
}

test('consultaRestricciones retorna datos en llamada exitosa', async () => {
  const service = freshService();
  const originalPost = axios.post;
  axios.post = async (url) => {
    assert.ok(url.includes('consultaRestricciones'));
    return { data: { recordsets: [[{ GLBahia: 'Valparaíso', tipoRestriccion: 'Cierre' }]] } };
  };
  try {
    const data = await service.consultaRestricciones();
    assert.strictEqual(data.length, 1);
    assert.strictEqual(data[0].GLBahia, 'Valparaíso');
  } finally {
    axios.post = originalPost;
  }
});

test('consultaBahias usa cache en la segunda llamada', async () => {
  const service = freshService();
  const originalPost = axios.post;
  let callCount = 0;
  axios.post = async () => {
    callCount++;
    return { data: { recordsets: [[{ idBahia: 1, NMbahia: 'San Antonio' }]] } };
  };
  try {
    await service.consultaBahias();
    await service.consultaBahias();
    assert.strictEqual(callCount, 1);
  } finally {
    axios.post = originalPost;
  }
});

test('consultaRestricciones desenvuelve el formato { recordsets: [[...]] } de DIRECTEMAR', async () => {
  const service = freshService();
  const originalPost = axios.post;
  axios.post = async () => ({
    data: { recordsets: [[{ bahia: 88, tipo: 'TODOS' }]] },
  });
  try {
    const data = await service.consultaRestricciones();
    assert.ok(Array.isArray(data));
    assert.strictEqual(data[0].bahia, 88);
  } finally {
    axios.post = originalPost;
  }
});

test('totalPronostico envía headers Accept y Referer', async () => {
  const service = freshService();
  const originalGet = axios.get;
  let capturedConfig;
  axios.get = async (url, config) => {
    capturedConfig = config;
    return { data: [{ idBahia: 72, temperatura: 18.6 }] };
  };
  try {
    await service.totalPronostico();
    assert.strictEqual(capturedConfig.headers.Accept, 'application/json');
    assert.strictEqual(capturedConfig.headers.Referer, 'https://orion.directemar.cl/sitport/');
  } finally {
    axios.get = originalGet;
  }
});

test('consultaRestricciones maneja timeout', async () => {
  const service = freshService();
  const originalPost = axios.post;
  axios.post = async () => {
    const err = new Error('timeout of 10000ms exceeded');
    err.code = 'ECONNABORTED';
    throw err;
  };
  try {
    await assert.rejects(() => service.consultaRestricciones(), /Timeout/);
  } finally {
    axios.post = originalPost;
  }
});

test('consultaBahias maneja error HTTP (404)', async () => {
  const service = freshService();
  const originalPost = axios.post;
  axios.post = async () => {
    const err = new Error('Request failed');
    err.response = { status: 404 };
    throw err;
  };
  try {
    await assert.rejects(() => service.consultaBahias(), /404/);
  } finally {
    axios.post = originalPost;
  }
});

test('totalPronostico maneja error de red', async () => {
  const service = freshService();
  const originalGet = axios.get;
  axios.get = async () => {
    const err = new Error('Network Error');
    err.request = {};
    throw err;
  };
  try {
    await assert.rejects(() => service.totalPronostico(), /Sin respuesta de red/);
  } finally {
    axios.get = originalGet;
  }
});
