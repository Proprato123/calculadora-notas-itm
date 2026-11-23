const fs = require('fs');
fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist/public', { recursive: true });
for (const f of ['calculadora.js', 'server.js', 'package.json']) fs.copyFileSync(f, 'dist/' + f);
for (const f of fs.readdirSync('public')) fs.copyFileSync('public/' + f, 'dist/public/' + f);
console.log('Build completado: dist/ generado');
