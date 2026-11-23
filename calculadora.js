const NOTA_MIN = 0;
const NOTA_MAX = 5;
const NOTA_APROBATORIA = 3;

function redondear(valor, decimales = 2) {
  const f = 10 ** decimales;
  return Math.round((valor + Number.EPSILON) * f) / f;
}

function validar(evaluaciones) {
  const errores = [];
  if (!Array.isArray(evaluaciones) || evaluaciones.length === 0) {
    return ['Debes ingresar al menos una evaluación.'];
  }
  let suma = 0;
  evaluaciones.forEach((e, i) => {
    const n = i + 1;
    const pct = Number(e.porcentaje);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      errores.push(`Evaluación ${n}: el porcentaje debe estar entre 1 y 100.`);
    } else {
      suma += pct;
    }
    if (e.nota !== null && e.nota !== undefined && e.nota !== '') {
      const nota = Number(e.nota);
      if (!Number.isFinite(nota) || nota < NOTA_MIN || nota > NOTA_MAX) {
        errores.push(`Evaluación ${n}: la nota debe estar entre ${NOTA_MIN} y ${NOTA_MAX}.`);
      }
    }
  });
  if (suma > 100.0001) errores.push(`Los porcentajes suman ${redondear(suma)}%, no pueden pasar de 100%.`);
  return errores;
}

function calcular(evaluaciones, notaObjetivo = NOTA_APROBATORIA) {
  const errores = validar(evaluaciones);
  if (errores.length) return { ok: false, errores };

  let acumulado = 0;
  let pctEvaluado = 0;
  let pctPendiente = 0;
  for (const e of evaluaciones) {
    const pct = Number(e.porcentaje);
    const tieneNota = e.nota !== null && e.nota !== undefined && e.nota !== '';
    if (tieneNota) {
      acumulado += Number(e.nota) * pct / 100;
      pctEvaluado += pct;
    } else {
      pctPendiente += pct;
    }
  }
  const pctTotal = pctEvaluado + pctPendiente;
  const pctSinDefinir = 100 - pctTotal;
  const restante = pctPendiente + pctSinDefinir;

  const resultado = {
    ok: true,
    acumulado: redondear(acumulado),
    porcentajeEvaluado: redondear(pctEvaluado),
    porcentajeRestante: redondear(restante),
    promedioEvaluado: pctEvaluado > 0 ? redondear(acumulado / (pctEvaluado / 100)) : null,
    notaObjetivo,
  };

  if (restante <= 0.0001) {
    resultado.definitiva = redondear(acumulado, 1);
    resultado.estado = resultado.definitiva >= notaObjetivo ? 'Aprobado' : 'Reprobado';
    resultado.mensaje = resultado.estado === 'Aprobado'
      ? `Aprobaste con ${resultado.definitiva.toFixed(1)}.`
      : `Reprobaste con ${resultado.definitiva.toFixed(1)}.`;
    return resultado;
  }

  const necesaria = (notaObjetivo - acumulado) / (restante / 100);
  resultado.notaNecesaria = redondear(Math.max(necesaria, 0));
  if (necesaria <= 0) {
    resultado.estado = 'Asegurado';
    resultado.mensaje = `Ya tienes ${resultado.acumulado} acumulado: alcanzas ${notaObjetivo.toFixed(1)} aunque saques 0 en el ${redondear(restante)}% restante.`;
  } else if (necesaria > NOTA_MAX) {
    resultado.estado = 'Imposible';
    resultado.mensaje = `Necesitarías ${resultado.notaNecesaria} en el ${redondear(restante)}% restante; no es posible llegar a ${notaObjetivo.toFixed(1)}.`;
  } else {
    resultado.estado = 'En curso';
    resultado.mensaje = `Necesitas un promedio de ${resultado.notaNecesaria} en el ${redondear(restante)}% restante para llegar a ${notaObjetivo.toFixed(1)}.`;
  }
  return resultado;
}

module.exports = { calcular, validar, redondear, NOTA_APROBATORIA, NOTA_MAX, NOTA_MIN };
