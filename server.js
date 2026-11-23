const express = require('express');
const path = require('path');
const { calcular, NOTA_MAX } = require('./calculadora');

const app = express();
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const version = process.env.APP_VERSION || '2.0.0';
const stats = { calculos: 0, aprobados: 0, reprobados: 0, enCurso: 0, imposibles: 0, asegurados: 0 };

app.post('/api/calcular', (req, res) => {
  const { evaluaciones, notaObjetivo } = req.body || {};
  const objetivo = notaObjetivo === undefined ? 3 : Number(notaObjetivo);
  if (!Number.isFinite(objetivo) || objetivo <= 0 || objetivo > NOTA_MAX) {
    return res.status(400).json({ ok: false, errores: ['La nota objetivo debe estar entre 0.1 y 5.'] });
  }
  const r = calcular(evaluaciones, objetivo);
  if (!r.ok) return res.status(400).json(r);
  stats.calculos++;
  const clave = { Aprobado: 'aprobados', Reprobado: 'reprobados', 'En curso': 'enCurso', Imposible: 'imposibles', Asegurado: 'asegurados' }[r.estado];
  if (clave) stats[clave]++;
  res.json(r);
});

// Estado público: indica si el secreto de Key Vault llegó a la app, sin revelarlo.
app.get('/api/config', (req, res) => {
  res.json({ version, keyVault: Boolean(process.env.ADMIN_KEY) });
});

// Endpoint protegido con la clave guardada en Azure Key Vault.
app.get('/api/estadisticas', (req, res) => {
  if (!process.env.ADMIN_KEY) return res.status(503).json({ error: 'Clave de administrador no configurada.' });
  if (req.get('x-admin-key') !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'Clave inválida.' });
  res.json(stats);
});

app.get('/health', (req, res) => res.json({ status: 'ok', version }));

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Calculadora de notas escuchando en el puerto ${port}`));
}
