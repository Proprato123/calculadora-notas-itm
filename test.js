const assert = require('assert');
const http = require('http');
const { calcular, validar } = require('./calculadora');

let pruebas = 0;
function prueba(nombre, fn) { fn(); pruebas++; console.log('  ok -', nombre); }

console.log('Pruebas unitarias de calculadora.js');
prueba('todas las notas: aprueba con 3.0 exacto', () => {
  const r = calcular([{ porcentaje: 50, nota: 3 }, { porcentaje: 50, nota: 3 }]);
  assert.strictEqual(r.definitiva, 3); assert.strictEqual(r.estado, 'Aprobado');
});
prueba('todas las notas: reprueba', () => {
  const r = calcular([{ porcentaje: 60, nota: 2 }, { porcentaje: 40, nota: 3.5 }]);
  assert.strictEqual(r.definitiva, 2.6); assert.strictEqual(r.estado, 'Reprobado');
});
prueba('nota necesaria en lo pendiente', () => {
  const r = calcular([{ porcentaje: 20, nota: 3.8 }, { porcentaje: 20, nota: 2.9 }, { porcentaje: 20, nota: 4.2 }, { porcentaje: 40, nota: null }]);
  assert.strictEqual(r.acumulado, 2.18); assert.strictEqual(r.notaNecesaria, 2.05); assert.strictEqual(r.estado, 'En curso');
});
prueba('porcentaje sin definir cuenta como pendiente', () => {
  const r = calcular([{ porcentaje: 50, nota: 4 }]);
  assert.strictEqual(r.porcentajeRestante, 50); assert.strictEqual(r.notaNecesaria, 2);
});
prueba('imposible si necesita más de 5', () => {
  assert.strictEqual(calcular([{ porcentaje: 80, nota: 1 }, { porcentaje: 20, nota: null }]).estado, 'Imposible');
});
prueba('asegurado si ya alcanza el objetivo', () => {
  assert.strictEqual(calcular([{ porcentaje: 70, nota: 5 }, { porcentaje: 30, nota: null }]).estado, 'Asegurado');
});
prueba('nota objetivo personalizada', () => {
  assert.strictEqual(calcular([{ porcentaje: 50, nota: 4 }, { porcentaje: 50, nota: null }], 4.5).notaNecesaria, 5);
});
prueba('valida porcentajes > 100', () => {
  assert.ok(validar([{ porcentaje: 70, nota: 3 }, { porcentaje: 40, nota: 3 }])[0].includes('110'));
});
prueba('valida notas fuera de rango y lista vacía', () => {
  assert.strictEqual(validar([{ porcentaje: 10, nota: 6 }]).length, 1);
  assert.strictEqual(validar([]).length, 1);
});

console.log('Pruebas de la API');
process.env.ADMIN_KEY = 'clave-de-prueba';
const app = require('./server');

function pedir(port, method, ruta, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({ host: '127.0.0.1', port, method, path: ruta, headers: { 'Content-Type': 'application/json', ...headers } }, (res) => {
      let t = ''; res.on('data', (c) => (t += c)); res.on('end', () => resolve({ status: res.statusCode, body: t ? JSON.parse(t) : null }));
    });
    req.on('error', reject); if (data) req.write(data); req.end();
  });
}

const server = app.listen(0, async () => {
  const { port } = server.address();
  try {
    let r = await pedir(port, 'POST', '/api/calcular', { evaluaciones: [{ porcentaje: 60, nota: 3.5 }, { porcentaje: 40, nota: null }] });
    assert.strictEqual(r.status, 200); assert.strictEqual(r.body.notaNecesaria, 2.25); pruebas++; console.log('  ok - POST /api/calcular');
    r = await pedir(port, 'POST', '/api/calcular', { evaluaciones: [{ porcentaje: 120, nota: 3 }] });
    assert.strictEqual(r.status, 400); pruebas++; console.log('  ok - POST /api/calcular rechaza datos inválidos');
    r = await pedir(port, 'GET', '/api/config');
    assert.strictEqual(r.body.keyVault, true); pruebas++; console.log('  ok - GET /api/config');
    r = await pedir(port, 'GET', '/api/estadisticas');
    assert.strictEqual(r.status, 401); pruebas++; console.log('  ok - /api/estadisticas sin clave -> 401');
    r = await pedir(port, 'GET', '/api/estadisticas', null, { 'x-admin-key': 'clave-de-prueba' });
    assert.strictEqual(r.status, 200); assert.strictEqual(r.body.calculos, 1); pruebas++; console.log('  ok - /api/estadisticas con clave -> 200');
    console.log(`Pruebas OK (${pruebas} pruebas)`);
    server.close();
  } catch (e) { console.error(e); process.exit(1); }
});
