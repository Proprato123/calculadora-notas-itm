const filas = document.getElementById('filas');
const totalPct = document.getElementById('totalPct');

function agregarFila(nombre = '', porcentaje = '', nota = '') {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="nombre" type="text" maxlength="40" placeholder="Ej: Parcial 1"></td>
    <td><input class="pct" type="number" min="1" max="100" step="1"></td>
    <td><input class="nota" type="number" min="0" max="5" step="0.1" placeholder="pendiente"></td>
    <td><button class="quitar" type="button" title="Quitar">×</button></td>`;
  tr.querySelector('.nombre').value = nombre;
  tr.querySelector('.pct').value = porcentaje;
  tr.querySelector('.nota').value = nota;
  tr.querySelector('.quitar').addEventListener('click', () => { tr.remove(); actualizarTotal(); });
  tr.querySelector('.pct').addEventListener('input', actualizarTotal);
  filas.appendChild(tr);
  actualizarTotal();
}

function actualizarTotal() {
  const suma = [...filas.querySelectorAll('.pct')].reduce((s, i) => s + (Number(i.value) || 0), 0);
  totalPct.textContent = `${suma}%`;
  totalPct.style.color = suma > 100 ? 'var(--mal)' : '';
}

function leerEvaluaciones() {
  return [...filas.querySelectorAll('tr')].map((tr) => ({
    nombre: tr.querySelector('.nombre').value.trim(),
    porcentaje: tr.querySelector('.pct').value,
    nota: tr.querySelector('.nota').value === '' ? null : tr.querySelector('.nota').value,
  }));
}

function mostrarErrores(lista) {
  const caja = document.getElementById('errores');
  caja.innerHTML = '<strong>Revisa los datos:</strong><ul>' + lista.map((e) => `<li>${e}</li>`).join('') + '</ul>';
  caja.classList.remove('oculto');
  document.getElementById('resultado').classList.add('oculto');
}

async function calcular() {
  document.getElementById('errores').classList.add('oculto');
  try {
    const res = await fetch('/api/calcular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evaluaciones: leerEvaluaciones(), notaObjetivo: Number(document.getElementById('objetivo').value) }),
    });
    const r = await res.json();
    if (!r.ok) return mostrarErrores(r.errores || ['No se pudo calcular.']);
    document.getElementById('rAcum').textContent = (r.definitiva ?? r.acumulado).toFixed(2);
    document.getElementById('rEval').textContent = `${r.porcentajeEvaluado}%`;
    document.getElementById('rNec').textContent = r.notaNecesaria === undefined ? '—' : r.notaNecesaria.toFixed(2);
    document.getElementById('barraAcum').style.width = `${Math.min(100, (r.acumulado / 5) * 100)}%`;
    const est = document.getElementById('rEstado');
    est.textContent = r.estado;
    est.className = 'estado ' + r.estado.split(' ')[0];
    const materia = document.getElementById('materia').value.trim();
    document.getElementById('rMensaje').textContent = (materia ? `${materia}: ` : '') + r.mensaje;
    document.getElementById('resultado').classList.remove('oculto');
  } catch (e) {
    mostrarErrores(['No hay conexión con el servidor.']);
  }
}

document.getElementById('agregar').addEventListener('click', () => agregarFila());
document.getElementById('calcular').addEventListener('click', calcular);
document.getElementById('limpiar').addEventListener('click', () => {
  filas.innerHTML = '';
  agregarFila(); agregarFila();
  document.getElementById('resultado').classList.add('oculto');
  document.getElementById('errores').classList.add('oculto');
});
document.getElementById('ejemplo').addEventListener('click', () => {
  filas.innerHTML = '';
  document.getElementById('materia').value = 'Pruebas y Calidad de Software';
  [['Seguimiento 1', 20, 3.8], ['Parcial 1', 20, 2.9], ['Seguimiento 2', 20, 4.2], ['Proyecto final', 20, ''], ['Examen final', 20, '']]
    .forEach((f) => agregarFila(...f));
});

agregarFila(); agregarFila();

fetch('/api/config').then((r) => r.json()).then((c) => {
  const kv = document.getElementById('kv');
  kv.textContent = c.keyVault ? 'Key Vault: secreto cargado ✓' : 'Key Vault: sin configurar';
  kv.classList.toggle('on', c.keyVault);
  document.getElementById('pie').textContent = `Práctica de Azure DevOps · ITM 2026-2 · v${c.version}`;
}).catch(() => {});
