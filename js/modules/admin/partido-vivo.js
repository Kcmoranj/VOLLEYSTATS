/**
 * partido-vivo.js
 * Motor de partido en vivo para el admin.
 *
 * Maneja:
 *   - Marcador punto a punto por set
 *   - Rotación automática (cada punto ganado con propio saque rota el equipo)
 *   - Cálculo de quién está en cancha según la rotación actual
 *   - Detección automática del líbero (entra cuando central rota a zaguera)
 *   - Sustituciones normales (máx 6 por set, contabilizadas aparte del líbero)
 *   - Tiempos muertos (máx 2 por set)
 *   - Cambio automático de set al llegar al límite de puntos
 *   - Saque inicial: lo define el admin al iniciar el partido
 */

// ── Constantes reglamentarias ─────────────────────────────────
const PUNTOS_SET       = 25;
const PUNTOS_TIEBREAK  = 15;
const VENTAJA_MIN      = 2;
const MAX_SUST         = 6;
const MAX_TM           = 2;

// Orden de rotación: al ganar saque, cada jugador avanza una posición en sentido horario
// pos1 → pos6 → pos5 → pos4 → pos3 → pos2 → pos1
const ORDEN_ROTACION = ['pos1','pos6','pos5','pos4','pos3','pos2'];

// ── Helpers de rotación ───────────────────────────────────────

/**
 * Dada la alineación inicial del R5 y un número de rotaciones,
 * devuelve quién está en cada posición en ese momento.
 * rotaciones=0 → formación inicial, rotaciones=1 → primer punto ganado, etc.
 */
function calcularFormacionActual(alineacionInicial, rotaciones) {
    const n = ((rotaciones % 6) + 6) % 6;
    if (n === 0) return { ...alineacionInicial };

    const formacion = {};
    ORDEN_ROTACION.forEach((posActual, i) => {
        // La posición actual la ocupa quien estaba n pasos atrás en la cadena
        const posOrigen = ORDEN_ROTACION[(i - n + 6) % 6];
        formacion[posActual] = alineacionInicial[posOrigen];
    });
    formacion.libero = alineacionInicial.libero;
    return formacion;
}

/**
 * Aplica las sustituciones activas al objeto de formación.
 * Una sustitución es permanente para el resto del set
 * (el jugador que entra puede volver a su lugar, pero eso cuenta como otra sustitución).
 */
function aplicarSustituciones(formacion, sustituciones) {
    const result = { ...formacion };
    sustituciones.forEach(s => {
        for (const pos of ORDEN_ROTACION) {
            if (result[pos] === s.id_inscripcion_sale) {
                result[pos] = s.id_inscripcion_entra;
                break;
            }
        }
    });
    return result;
}

/**
 * Dado el R5 con roles y la formación actual, detecta si el líbero
 * debe estar en cancha (reemplaza a los centrales cuando están en zaguera).
 * Devuelve el formacion con el líbero aplicado si corresponde.
 */
function aplicarLibero(formacion, roles) {
    if (!roles?.libero) return formacion;
    const result = { ...formacion };
    const zaguera = ['pos5', 'pos6', 'pos1'];
    const central1 = roles.central1;
    const central2 = roles.central2;

    zaguera.forEach(pos => {
        if (result[pos] === central1 || result[pos] === central2) {
            result[pos] = roles.libero;
        }
    });
    return result;
}

/**
 * Calcula quién está en cancha en este momento dado el estado vivo del partido.
 * Devuelve { pos1..pos6, libero } con ids de inscripción.
 */
window.calcularEnCancha = function(r5, vivoEquipo) {
    if (!r5?.alineacion) return null;
    const rotaciones = vivoEquipo?.rotaciones || 0;
    let formacion = calcularFormacionActual(r5.alineacion, rotaciones);
    const sustSet = vivoEquipo?.sustitucionesAplicadas || [];
    formacion = aplicarSustituciones(formacion, sustSet);
    formacion = aplicarLibero(formacion, r5.roles);
    return formacion;
};

// ── Estado vivo del partido ────────────────────────────────────

/**
 * Inicializa el estado vivo cuando el admin arranca el partido.
 * saquePrimero: 'local' | 'visitante'
 */
window.iniciarVivo = function(data, partidoId, saquePrimero) {
    const partido = data.partidos.find(p => p.id === partidoId);
    if (!partido) return;

    partido.vivo = {
        setActual: 1,
        local:       { puntos: 0, rotaciones: 0, sustitucionesAplicadas: [], tiemposMuertosUsados: 0 },
        visitante:   { puntos: 0, rotaciones: 0, sustitucionesAplicadas: [], tiemposMuertosUsados: 0 },
        saqueActual: saquePrimero,
        historialPuntos: []  // [{ set, local, visitante, saque }]
    };
    partido.sets = [];
    window.AppDB.save(data);
};

/**
 * Registra un punto para el equipo indicado.
 * Actualiza rotaciones, detecta cambio de saque, cierra set si aplica.
 * Devuelve { setCerrado: bool, partidoCerrado: bool }
 */
window.registrarPunto = function(data, partidoId, quien) {
    const partido = data.partidos.find(p => p.id === partidoId);
    if (!partido?.vivo) return {};

    const v = partido.vivo;
    const rival = quien === 'local' ? 'visitante' : 'local';

    // Sumar punto
    v[quien].puntos++;

    // ¿Cambio de saque? Si el que NO sacaba gana el punto, el saque pasa al ganador
    // y el ganador rota su equipo
    const saqueAnterior = v.saqueActual;
    if (v.saqueActual !== quien) {
        // El equipo que ganaba el punto gana el saque → rota
        v[quien].rotaciones++;
        v.saqueActual = quien;
    }

    // Guardar en historial
    v.historialPuntos.push({
        set: v.setActual,
        local: v.local.puntos,
        visitante: v.visitante.puntos,
        saque: v.saqueActual
    });

    // ¿Se cerró el set?
    const limite   = v.setActual === 3 ? PUNTOS_TIEBREAK : PUNTOS_SET;
    const pLocal   = v.local.puntos;
    const pVisit   = v.visitante.puntos;
    const maxPtos  = Math.max(pLocal, pVisit);
    const diferencia = Math.abs(pLocal - pVisit);

    let setCerrado = false;
    let partidoCerrado = false;

    if (maxPtos >= limite && diferencia >= VENTAJA_MIN) {
        // Cerrar set
        partido.sets.push({ local: pLocal, visitante: pVisit });
        setCerrado = true;

        // Contar sets ganados
        let setsL = 0, setsV = 0;
        partido.sets.forEach(s => { if (s.local > s.visitante) setsL++; else setsV++; });

        if (setsL >= 2 || setsV >= 2) {
            // Partido terminado
            partido.estado = 'FINALIZADO';
            partidoCerrado = true;
        } else if (v.setActual < 3) {
            // Abrir siguiente set
            v.setActual++;
            v.local.puntos = 0;
            v.visitante.puntos = 0;
            // El equipo que perdió el set saca primero (reglamento FIVB)
            v.saqueActual = pLocal < pVisit ? 'local' : 'visitante';
            // Resetear rotaciones para el nuevo set
            v.local.rotaciones = 0;
            v.visitante.rotaciones = 0;
            v.local.sustitucionesAplicadas = [];
            v.visitante.sustitucionesAplicadas = [];
            v.local.tiemposMuertosUsados = 0;
            v.visitante.tiemposMuertosUsados = 0;
        }
    }

    window.AppDB.save(data);
    return { setCerrado, partidoCerrado };
};

/**
 * Deshace el último punto registrado.
 */
window.deshacerPunto = function(data, partidoId) {
    const partido = data.partidos.find(p => p.id === partidoId);
    if (!partido?.vivo?.historialPuntos?.length) return;

    const v = partido.vivo;
    v.historialPuntos.pop();

    if (v.historialPuntos.length === 0) {
        // Volver al inicio
        v.local.puntos = 0;
        v.visitante.puntos = 0;
        v.saqueActual = v.saqueActual; // no se sabe el original, mantener
    } else {
        const ultimo = v.historialPuntos[v.historialPuntos.length - 1];
        v.local.puntos = ultimo.local;
        v.visitante.puntos = ultimo.visitante;
        v.saqueActual = ultimo.saque;
    }

    // Recalcular rotaciones desde el historial
    const histSet = v.historialPuntos.filter(h => h.set === v.setActual);
    // Rotaciones = número de veces que cada equipo ganó el saque
    let rotL = 0, rotV = 0, saqueAnterior = null;
    histSet.forEach(h => {
        if (saqueAnterior !== null && h.saque !== saqueAnterior) {
            if (h.saque === 'local') rotL++;
            else rotV++;
        }
        saqueAnterior = h.saque;
    });
    v.local.rotaciones = rotL;
    v.visitante.rotaciones = rotV;

    window.AppDB.save(data);
};

/**
 * Registra una sustitución en vivo (admin).
 */
window.registrarSustitucionVivo = function(data, partidoId, equipo, idSale, idEntra) {
    const partido = data.partidos.find(p => p.id === partidoId);
    if (!partido?.vivo) return { ok: false, msg: 'Partido no está en vivo' };

    const v = partido.vivo[equipo];
    if (v.sustitucionesAplicadas.length >= MAX_SUST)
        return { ok: false, msg: `Límite de ${MAX_SUST} sustituciones alcanzado` };

    if (idSale === idEntra)
        return { ok: false, msg: 'El jugador que sale y el que entra no pueden ser el mismo' };

    const puntoCurrent = (partido.vivo.local.puntos + partido.vivo.visitante.puntos);
    v.sustitucionesAplicadas.push({
        id: window.genId(),
        id_inscripcion_sale: idSale,
        id_inscripcion_entra: idEntra,
        punto: puntoCurrent
    });

    // También guardar en sustitucionesPartido para el libro público
    if (!data.sustitucionesPartido) data.sustitucionesPartido = [];
    const idPartSide = equipo === 'local' ? partido.id_local_participacion : partido.id_visitante_participacion;
    data.sustitucionesPartido.push({
        id: window.genId(),
        id_partido: partidoId,
        id_participacion: idPartSide,
        numero_set: partido.vivo.setActual,
        id_inscripcion_sale: idSale,
        id_inscripcion_entra: idEntra,
        punto: puntoCurrent
    });

    window.AppDB.save(data);
    return { ok: true };
};

/**
 * Registra un tiempo muerto (admin).
 */
window.registrarTiempoMuertoVivo = function(data, partidoId, equipo) {
    const partido = data.partidos.find(p => p.id === partidoId);
    if (!partido?.vivo) return { ok: false, msg: 'Partido no está en vivo' };

    const v = partido.vivo[equipo];
    if (v.tiemposMuertosUsados >= MAX_TM)
        return { ok: false, msg: `Límite de ${MAX_TM} tiempos muertos alcanzado` };

    v.tiemposMuertosUsados++;

    const puntoCurrent = partido.vivo.local.puntos + partido.vivo.visitante.puntos;
    if (!data.tiemposMuertosPartido) data.tiemposMuertosPartido = [];
    const idPartSide = equipo === 'local' ? partido.id_local_participacion : partido.id_visitante_participacion;
    data.tiemposMuertosPartido.push({
        id: window.genId(),
        id_partido: partidoId,
        id_participacion: idPartSide,
        numero_set: partido.vivo.setActual,
        punto: puntoCurrent
    });

    window.AppDB.save(data);
    return { ok: true };
};
