/**
 * estadisticas-admin.js - Lógica completa
 * escHTML, normalizarEstado y logout viven en js/shared/data-bridge.js
 */

const getAppData = () => window.AppDB.get();
const guardarAppData = (data) => window.AppDB.save(data);
const normalizarEstado = (e) => window.normalizarEstado(e);

// Capturamos ID de la URL
const params = new URLSearchParams(window.location.search);
const partidoId = parseInt(params.get('partidoId'));
let ladoModalActivo = null;
const FLUJO_ESTADOS = ['PROGRAMADO', 'EN_PROGRESO', 'FINALIZADO'];
let equipoSeleccionadoVisualizacion = 'local';

document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    if (!partidoId) {
        alert("Error: No se seleccionó un partido");
        window.location.href = "partidos-admin.html";
        return;
    }
    inicializarPagina();
    inicializarEventos();

    // Refresh live display if already in progress when page loads
    const dataInit    = getAppData();
    const partidoInit = dataInit?.partidos?.find(p => p.id === partidoId);
    if (partidoInit?.vivo && normalizarEstado(partidoInit.estado) === 'EN_PROGRESO') {
        renderizarMarcadorVivo(dataInit, partidoInit);
        renderizarCancharVivo(dataInit, partidoInit);
    }
});

function inicializarPagina() {
    const data = getAppData();
    const partido = data.partidos.find(p => p.id === partidoId);
    if (!partido) {
        alert("Error: Partido no encontrado");
        window.location.href = "partidos-admin.html";
        return;
    }

    // 1. PRIMERO: Renderizar los componentes básicos de la página
    renderizarCabecera(partido, data);
    renderizarMarcador(partido);
    renderizarAside(partido, data);
    renderizarBotonEstado(partido);

    // 2. SEGUNDO: Obtener los nombres de los equipos
    const nombreLocal = getNombreEquipoPorParticipacion(data, partido.id_local_participacion);
    const nombreVisit = getNombreEquipoPorParticipacion(data, partido.id_visitante_participacion);

    // 3. TERCERO: Asignar los nombres a las pestañas segmentadas del HTML
    const elTabLocal = document.getElementById('lblTabLocalName');
    if (elTabLocal) elTabLocal.textContent = nombreLocal;

    const elTabVisit = document.getElementById('lblTabVisitName');
    if (elTabVisit) elTabVisit.textContent = nombreVisit;

    // 4. CUARTO: Renderizar la tabla del equipo seleccionado por defecto
    renderizarTablaUnicaDinamica();
}

// --- Helpers de lookup sobre el mock data ---

function getParticipacion(data, idParticipacion) {
    return data.participaciones.find(p => p.id === idParticipacion);
}

function getEquipo(data, idEquipo) {
    return data.equipos.find(e => e.id === idEquipo);
}

function getNombreEquipoPorParticipacion(data, idParticipacion) {
    const part = getParticipacion(data, idParticipacion);
    if (!part) return "Equipo desconocido";
    const equipo = getEquipo(data, part.id_equipo);
    return equipo?.nombre || "Equipo desconocido";
}

function getNombreRama(data, idRama) {
    return data.ramas.find(r => r.id === idRama)?.nombre || "-";
}

function getNombreCategoriaTorneo(data, idCategoria) {
    return data.categoriasTorneo.find(c => c.id === idCategoria)?.nombre || "-";
}

// --- Render: cabecera, marcador, aside ---

function renderizarCabecera(partido, data) {
    const nombreLocal = getNombreEquipoPorParticipacion(data, partido.id_local_participacion);
    const nombreVisit = getNombreEquipoPorParticipacion(data, partido.id_visitante_participacion);
    const partLocal = getParticipacion(data, partido.id_local_participacion);

    // 1. Título del Enfrentamiento
    const txtTitulo = document.getElementById('txtTituloEnfrentamiento');
    if (txtTitulo) {
        txtTitulo.textContent = `${nombreLocal} VS ${nombreVisit}`;
    }

    // 2. Subtítulo (Categoría / Rama)
    const txtSubtitulo = document.getElementById('txtSubtituloTorneo');
    if (txtSubtitulo) {
        const categoria = partLocal ? getNombreCategoriaTorneo(data, partLocal.id_categoria_torneo) : "-";
        const rama = partLocal ? getNombreRama(data, partLocal.id_rama) : "-";
        txtSubtitulo.textContent = `${categoria} · ${rama} · Grupo ${partLocal?.grupo || "-"}`;
    }

    // 3. Marcador - Nombre Local (Línea crítica propensa a fallar)
    const marcLocal = document.getElementById('marcadorNombreLocal');
    if (marcLocal) {
        marcLocal.textContent = nombreLocal;
    }

    // 4. Marcador - Nombre Visitante (Línea crítica propensa a fallar)
    const marcVisit = document.getElementById('marcadorNombreVisit');
    if (marcVisit) {
        marcVisit.textContent = nombreVisit;
    }

    // 5. Pill de estado en el header
    const pill = document.getElementById('contenedorPillHeader');
    if (pill) {
        const estadoNorm = normalizarEstado(partido.estado);
        const estadoInfo = {
            PROGRAMADO: { emoji: "🗓️", texto: "Programado", color: "text-gray-500" },
            EN_PROGRESO: { emoji: "🔴", texto: "En Progreso", color: "text-red-500" },
            FINALIZADO: { emoji: "✅", texto: "Finalizado", color: "text-green-600" }
        }[estadoNorm] || { emoji: "❔", texto: partido.estado, color: "text-gray-500" };
        const woBadge = partido.wo
            ? `<span class="text-gray-200">|</span><span class="text-amber-600 font-black">🏳️ W.O.</span>`
            : '';
        pill.innerHTML = `
            <span>${partido.fecha} · ${partido.hora}</span>
            <span class="text-gray-200">|</span>
            <span class="${estadoInfo.color}">${estadoInfo.emoji} ${estadoInfo.texto}</span>
            ${woBadge}
        `;
    }
}
function renderizarMarcador(partido) {
    let setsLocal = 0, setsVisit = 0;
    const sets = partido.sets || [];

    // Recorremos los 3 slots de sets del partido
    for (let i = 0; i < 3; i++) {
        const set = sets[i] || { local: 0, visitante: 0 };

        if (set.local > set.visitante) setsLocal++;
        else if (set.visitante > set.local) setsVisit++;

        const elLocal = document.getElementById(`s${i + 1}Local`);
        const elVisit = document.getElementById(`s${i + 1}Visit`);
        if (elLocal) elLocal.value = set.local;
        if (elVisit) elVisit.value = set.visitante;
    }

    const mSetsLocal = document.getElementById('marcadorSetsLocal');
    const mSetsVisit = document.getElementById('marcadorSetsVisit');
    if (mSetsLocal) mSetsLocal.textContent = setsLocal;
    if (mSetsVisit) mSetsVisit.textContent = setsVisit;
}

// Lee los inputs de set actuales del DOM y recalcula el marcador de sets ganados (Local/Visitante)
function recalcularMarcadorDesdeInputs() {
    let setsLocal = 0, setsVisit = 0;

    for (let i = 1; i <= 3; i++) {
        const elLocal = document.getElementById(`s${i}Local`);
        const elVisit = document.getElementById(`s${i}Visit`);
        if (!elLocal || !elVisit) continue;

        const valLocal = parseInt(elLocal.value) || 0;
        const valVisit = parseInt(elVisit.value) || 0;

        if (valLocal > valVisit) setsLocal++;
        else if (valVisit > valLocal) setsVisit++;
    }

    document.getElementById('marcadorSetsLocal').textContent = setsLocal;
    document.getElementById('marcadorSetsVisit').textContent = setsVisit;
}

function renderizarAside(partido, data) {
    const partLocal = getParticipacion(data, partido.id_local_participacion);
    document.getElementById('asideCancha').textContent = partido.ubicacion || "-";
    document.getElementById('asideCategoria').textContent = partLocal ? getNombreCategoriaTorneo(data, partLocal.id_categoria_torneo) : "-";
    document.getElementById('asideRama').textContent = partLocal ? getNombreRama(data, partLocal.id_rama) : "-";
}

function renderizarBotonEstado(partido) {
    const btn = document.getElementById('btnCambiarEstado');
    const btnAtras = document.getElementById('btnRetrocederEstado');
    const estadoNorm = normalizarEstado(partido.estado);

    if (estadoNorm === "PROGRAMADO") {
        btn.textContent = "▶️ Iniciar Partido";
        btn.className = "btn flex-1 bg-blue-600 hover:bg-blue-700 border-none text-white font-bold text-xs tracking-wider uppercase";
        btn.disabled = false;
        btnAtras.classList.add('hidden');
    } else if (estadoNorm === "EN_PROGRESO") {
        btn.textContent = "✔️ Finalizar Partido";
        btn.className = "btn btn-outline border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-600 flex-1 text-gray-700 font-bold text-xs tracking-wider uppercase";
        btn.disabled = false;
        btnAtras.classList.remove('hidden');
        btnAtras.title = "Regresar a Programado";
    } else {
        btn.textContent = "🔒 Encuentro Finalizado";
        btn.className = "btn flex-1 bg-gray-100 border-none text-gray-400 font-bold text-xs tracking-wider uppercase";
        btn.disabled = true;
        btnAtras.classList.remove('hidden');
        btnAtras.title = "Regresar a En Progreso";
    }

    // Botón W.O.: solo visible si el partido no está finalizado
    const btnWO = document.getElementById('btnWO');
    if (btnWO) {
        btnWO.classList.toggle('hidden', normalizarEstado(partido.estado) === 'FINALIZADO');
    }
}

// --- Render: tablas de jugadores ---

function renderizarTablaJugadores(idParticipacion, idPartido, tbodyId, data) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return; // FIX: si el id no existe en el HTML actual, evitamos el TypeError

    // Roster real del equipo para este partido (mismo equipo + rama + categoría)
    const rosterEquipo = data.inscripciones.filter(ins => ins.id_participacion === idParticipacion);

    // Solo mostramos en la tabla los jugadores que YA fueron agregados a este partido
    // (es decir, que tienen un registro en estadisticasJugador para este idPartido).
    // Los demás del roster quedan disponibles para agregarse vía el modal "+ Agregar Jugador".
    const statsDelPartido = data.estadisticasJugador.filter(e => e.id_partido === idPartido);
    const idsInscripcionEnPartido = statsDelPartido.map(e => e.id_inscripcion);

    const jugadoresEnPartido = rosterEquipo.filter(ins => idsInscripcionEnPartido.includes(ins.id));

    if (jugadoresEnPartido.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="py-4 text-center text-gray-400 font-semibold">Aún no se han agregado jugadores a este partido.</td></tr>`;
        return;
    }

    tbody.innerHTML = jugadoresEnPartido.map(ins => {
        const jugador = data.jugadores.find(j => j.id === ins.id_jugador);
        const stats = data.estadisticasJugador.find(e => e.id_partido === idPartido && e.id_inscripcion === ins.id) ||
                      { puntos: 0, saque: 0, ataque: 0, bloqueo: 0, defensa: 0, colocacion: 0 };

        const pts = (stats.saque || 0) + (stats.ataque || 0) + (stats.bloqueo || 0) + (stats.defensa || 0) + (stats.colocacion || 0);

        // Tarjetas acumuladas de este jugador (histórico completo, no solo este partido)
        const sancionesJugador = (data.sancionesJugador || []).filter(s => s.id_inscripcion === ins.id);
        const nAmarillas = sancionesJugador.filter(s => s.tipo === 'AMARILLA').length;
        const nRojas = sancionesJugador.filter(s => s.tipo === 'ROJA').length;
        const badgesSancion = `${nAmarillas ? `<span title="${nAmarillas} amarilla(s)">🟨${nAmarillas > 1 ? `×${nAmarillas}` : ''}</span>` : ''}${nRojas ? `<span title="${nRojas} roja(s)">🟥${nRojas > 1 ? `×${nRojas}` : ''}</span>` : ''}`;

        return `
            <tr class="hover:bg-gray-50/50">
                <td class="py-3 px-2 font-bold text-gray-400">#${ins.numero_camiseta}</td>
                <td class="py-3 px-2 font-black text-gray-800">${jugador?.nombre || 'Desconocido'} <span class="ml-1">${badgesSancion}</span></td>
                <td class="py-3 px-2 text-center font-black text-blue-600" id="pts-${ins.id}">${pts}</td>
                <td class="py-3 px-1 text-center"><input type="number" class="input-stat" value="${stats.saque   || 0}" data-ins="${ins.id}" data-cat="saque"      onchange="recalcularPtsFila(${ins.id})"></td>
                <td class="py-3 px-1 text-center"><input type="number" class="input-stat" value="${stats.ataque  || 0}" data-ins="${ins.id}" data-cat="ataque"     onchange="recalcularPtsFila(${ins.id})"></td>
                <td class="py-3 px-1 text-center"><input type="number" class="input-stat" value="${stats.bloqueo || 0}" data-ins="${ins.id}" data-cat="bloqueo"    onchange="recalcularPtsFila(${ins.id})"></td>
                <td class="py-3 px-1 text-center"><input type="number" class="input-stat" value="${stats.defensa || 0}" data-ins="${ins.id}" data-cat="defensa"    onchange="recalcularPtsFila(${ins.id})"></td>
                <td class="py-3 px-1 text-center"><input type="number" class="input-stat" value="${stats.colocacion || 0}" data-ins="${ins.id}" data-cat="colocacion" onchange="recalcularPtsFila(${ins.id})"></td>
                <td class="py-3 px-2 text-center">
                    <button class="btn-sancionar-jugador text-amber-500 hover:text-amber-600" data-ins="${ins.id}" title="Registrar tarjeta / multa">🟨</button>
                </td>
                <td class="py-3 px-2 text-center">
                    <button class="btn-eliminar-jugador text-red-400 hover:text-red-600" data-ins="${ins.id}" title="Eliminar jugador del partido">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function recalcularPtsFila(idInscripcion) {
    const cats = ['saque', 'ataque', 'bloqueo', 'defensa', 'colocacion'];
    let total = 0;
    cats.forEach(cat => {
        const input = document.querySelector(`.input-stat[data-ins="${idInscripcion}"][data-cat="${cat}"]`);
        total += parseInt(input?.value) || 0;
    });
    const elPts = document.getElementById(`pts-${idInscripcion}`);
    if (elPts) elPts.textContent = total;
}

// --- Eventos ---

function inicializarEventos() {
    // 1. Botón unificado para agregar jugador
    const btnAgregarDinamico = document.getElementById('btnAgregarJugadorDinamico');
    if (btnAgregarDinamico) {
        btnAgregarDinamico.addEventListener('click', () => {
            abrirModalAgregarJugador(equipoSeleccionadoVisualizacion);
        });
    }

    // 2. Botón cancelar del modal
    const btnCancelarM = document.getElementById('btnCancelarModal');
    if (btnCancelarM) {
        btnCancelarM.addEventListener('click', cerrarModalAgregarJugador);
    }
    
    // 3. Confirmaciones de modales
    const btnConfAgregar = document.getElementById('btnConfirmarAgregar');
    if (btnConfAgregar) {
        btnConfAgregar.addEventListener('click', confirmarAgregarJugadorDinamico);
    }

    const btnConfEliminar = document.getElementById('btnConfirmarEliminar');
    if (btnConfEliminar) {
        btnConfEliminar.addEventListener('click', confirmarEliminarJugadorDinamico);
    }

    // 4. Control de estado del partido
    const btnCambiarEst = document.getElementById('btnCambiarEstado');
    if (btnCambiarEst) {
        btnCambiarEst.addEventListener('click', () => {
            const data    = getAppData();
            const partido = data.partidos.find(p => p.id === partidoId);
            if (!partido) return;
            if (normalizarEstado(partido.estado) === 'PROGRAMADO') {
                const nL = getNombreEquipoPorParticipacion(data, partido.id_local_participacion);
                const nV = getNombreEquipoPorParticipacion(data, partido.id_visitante_participacion);
                document.getElementById('selSaqueLocal').textContent  = nL;
                document.getElementById('selSaqueVisit').textContent  = nV;
                document.getElementById('selectSaquePrimero').innerHTML =
                    `<option value="">— Seleccionar —</option><option value="local">${nL}</option><option value="visitante">${nV}</option>`;
                iniciarPartidoConSaque();
            } else {
                avanzarEstadoPartido();
            }
        });
    }

    const btnRetrocederEst = document.getElementById('btnRetrocederEstado');
    if (btnRetrocederEst) {
        btnRetrocederEst.addEventListener('click', retrocederEstadoPartido);
    }

    const btnConfRetroceso = document.getElementById('btnAceptarRetroceso');
    if (btnConfRetroceso) {
        btnConfRetroceso.addEventListener('click', confirmarRetrocesoEstado);
    }
    
    const btnCancelRetroceso = document.getElementById('btnCancelarRetroceso');
    if (btnCancelRetroceso) {
        btnCancelRetroceso.addEventListener('click', () => {
            idxEstadoDestino = null;
            document.getElementById('modalConfirmarRetroceso').close();
        });
    }
    
    const btnCancelEliminar = document.getElementById('btnCancelarEliminar');
    if (btnCancelEliminar) {
        btnCancelEliminar.addEventListener('click', () => {
            idInscripcionAEliminar = null;
            document.getElementById('modalConfirmarEliminar').close();
        });
    }

    // 5. Inputs de los Sets
    document.querySelectorAll('.input-set').forEach(input => {
        input.addEventListener('input', recalcularMarcadorDesdeInputs);
    });

    // 6. Delegación de eventos sobre la tabla única dinámica
    const tbodyDinamico = document.getElementById('tbodyDinamico');
    if (tbodyDinamico) {
        tbodyDinamico.addEventListener('click', manejarClickEliminarJugador);
        tbodyDinamico.addEventListener('click', manejarClickSancionarJugador);
    }

    // 7. Sanciones (tarjetas por jugador y multa al equipo completo)
    const btnMultarEquipo = document.getElementById('btnMultarEquipo');
    if (btnMultarEquipo) {
        btnMultarEquipo.addEventListener('click', abrirModalMultaEquipo);
    }

    const btnConfSancion = document.getElementById('btnConfirmarSancion');
    if (btnConfSancion) {
        btnConfSancion.addEventListener('click', confirmarSancionJugador);
    }

    const btnConfMultaEquipo = document.getElementById('btnConfirmarMultaEquipo');
    if (btnConfMultaEquipo) {
        btnConfMultaEquipo.addEventListener('click', confirmarMultaEquipo);
    }
}
function manejarClickSancionarJugador(evento) {
    const btn = evento.target.closest('.btn-sancionar-jugador');
    if (!btn) return;

    const idInscripcion = parseInt(btn.dataset.ins);
    abrirModalSancionJugador(idInscripcion);
}
function manejarClickEliminarJugador(evento) {
    const btn = evento.target.closest('.btn-eliminar-jugador');
    if (!btn) return;

    const idInscripcion = parseInt(btn.dataset.ins);
    eliminarJugadorDelPartido(idInscripcion);
}

// --- Modal: Agregar jugador existente del equipo ---

function abrirModalAgregarJugador(lado) {
    ladoModalActivo = lado;
    const data = getAppData();
    const partido = data.partidos.find(p => p.id === partidoId);

    const idParticipacion = lado === 'local' ? partido.id_local_participacion : partido.id_visitante_participacion;
    const nombreEquipo = getNombreEquipoPorParticipacion(data, idParticipacion);

    document.getElementById('modalEquipoNombre').textContent = `Equipo: ${nombreEquipo}`;

    // Roster del equipo para este partido: todas las inscripciones que pertenecen
    // a esta participación específica (mismo equipo + rama + categoría que juega el partido).
    const rosterEquipo = data.inscripciones.filter(ins => ins.id_participacion === idParticipacion);

    // Jugadores ya agregados a este partido (tienen registro en estadisticasJugador)
    const idsYaEnPartido = data.estadisticasJugador
        .filter(e => e.id_partido === partidoId)
        .map(e => e.id_inscripcion);

    // Disponibles = inscritos en el roster del equipo que aún no se agregaron a este partido
    const disponiblesReales = rosterEquipo.filter(ins => !idsYaEnPartido.includes(ins.id));

    const select = document.getElementById('selectJugadorDisponible');
    const msjVacio = document.getElementById('msjSinJugadores');

    select.innerHTML = '<option value="">-- Selecciona un jugador --</option>' +
        disponiblesReales.map(ins => {
            const jugador = data.jugadores.find(j => j.id === ins.id_jugador);
            return `<option value="${ins.id}">#${ins.numero_camiseta} - ${jugador?.nombre || 'Desconocido'}</option>`;
        }).join('');

    if (disponiblesReales.length === 0) {
        select.classList.add('hidden');
        msjVacio.classList.remove('hidden');
    } else {
        select.classList.remove('hidden');
        msjVacio.classList.add('hidden');
    }

    document.getElementById('modalAgregarJugador').showModal();
}

function cerrarModalAgregarJugador() {
    document.getElementById('modalAgregarJugador').close();
    ladoModalActivo = null;
}

/**
 * FIX: esta función intentaba refrescar 'tbodyLocal'/'tbodyVisitante', dos <tbody>
 * que ya NO existen en estadisticas-admin.html (la vista ahora usa una única tabla
 * dinámica: 'tbodyDinamico'). Como `document.getElementById(tbodyId)` devolvía null,
 * la siguiente línea (`tbody.innerHTML = ...` dentro de renderizarTablaJugadores)
 * tiraba un TypeError y cortaba la ejecución antes de que
 * confirmarAgregarJugadorDinamico() pudiera refrescar la tabla real.
 * Ahora esta función solo persiste el dato; el refresco visual lo hace
 * renderizarTablaUnicaDinamica(), llamado justo después desde
 * confirmarAgregarJugadorDinamico().
 */
function confirmarAgregarJugador() {
    const select = document.getElementById('selectJugadorDisponible');
    const idInscripcion = parseInt(select.value);

    if (!idInscripcion) {
        alert("Selecciona un jugador para agregar.");
        return;
    }

    const data = getAppData();
    const yaExiste = data.estadisticasJugador.find(e => e.id_partido === partidoId && e.id_inscripcion === idInscripcion);

    if (!yaExiste) {
        data.estadisticasJugador.push({
            id_partido: partidoId,
            id_inscripcion: idInscripcion,
            puntos: 0,
            saque: 0,
            ataque: 0,
            bloqueo: 0,
            defensa: 0,
            colocacion: 0
        });
        guardarAppData(data);
    }

    cerrarModalAgregarJugador();
}

function eliminarJugadorDelPartido(idInscripcion) {
    const data = getAppData();
    const inscripcion = data.inscripciones.find(i => i.id === idInscripcion);
    const jugador = inscripcion ? data.jugadores.find(j => j.id === inscripcion.id_jugador) : null;

    idInscripcionAEliminar = idInscripcion;
    document.getElementById('msjConfirmarEliminar').textContent =
        `¿Seguro que quieres eliminar a ${jugador?.nombre || 'este jugador'} del partido? Se borrarán sus estadísticas registradas.`;
    document.getElementById('modalConfirmarEliminar').showModal();
}

// --- Cambiar estado del partido (un solo botón que avanza) ---

function avanzarEstadoPartido() {
    const data = getAppData();
    const partido = data.partidos.find(p => p.id === partidoId);
    if (!partido) return;

    const idxActual = FLUJO_ESTADOS.indexOf(normalizarEstado(partido.estado));
    if (idxActual === -1 || idxActual >= FLUJO_ESTADOS.length - 1) return; // ya finalizado o estado desconocido

    partido.estado = FLUJO_ESTADOS[idxActual + 1];
    guardarAppData(data);

    if (typeof registrarActividad === 'function') {
        const nombreLocal = getNombreEquipoPorParticipacion(data, partido.id_local_participacion);
        const nombreVisit = getNombreEquipoPorParticipacion(data, partido.id_visitante_participacion);
        registrarActividad('ESTADO_CAMBIADO', `${nombreLocal} vs ${nombreVisit} cambió a estado "${partido.estado}"`);
    }

    renderizarCabecera(partido, data);
    renderizarBotonEstado(partido);
}

// Guardamos el índice destino calculado al abrir el modal, para aplicarlo si el usuario confirma
let idxEstadoDestino = null;

function retrocederEstadoPartido() {
    const data = getAppData();
    const partido = data.partidos.find(p => p.id === partidoId);
    if (!partido) return;

    const idxActual = FLUJO_ESTADOS.indexOf(normalizarEstado(partido.estado));
    if (idxActual <= 0) return; // ya está en Programado, o estado desconocido

    idxEstadoDestino = idxActual - 1;
    document.getElementById('msjConfirmarRetroceso').textContent =
        `¿Seguro que quieres regresar el partido a "${FLUJO_ESTADOS[idxEstadoDestino]}"? Esto es útil si hubo un error al avanzar el estado.`;
    document.getElementById('modalConfirmarRetroceso').showModal();
}

function confirmarRetrocesoEstado() {
    if (idxEstadoDestino === null) return;

    const data = getAppData();
    const partido = data.partidos.find(p => p.id === partidoId);
    if (!partido) return;

    partido.estado = FLUJO_ESTADOS[idxEstadoDestino];

    // Si volvemos de FINALIZADO, limpiar flags de WO para que se pueda
    // re-registrar o continuar el partido normalmente
    if (idxEstadoDestino < FLUJO_ESTADOS.length - 1) {
        partido.wo = false;
        partido.wo_equipo = null;
    }

    guardarAppData(data);

    if (typeof registrarActividad === 'function') {
        const nombreLocal = getNombreEquipoPorParticipacion(data, partido.id_local_participacion);
        const nombreVisit = getNombreEquipoPorParticipacion(data, partido.id_visitante_participacion);
        registrarActividad('ESTADO_CAMBIADO', `${nombreLocal} vs ${nombreVisit} regresó a estado "${partido.estado}"`);
    }

    renderizarCabecera(partido, data);
    renderizarBotonEstado(partido);

    idxEstadoDestino = null;
    document.getElementById('modalConfirmarRetroceso').close();
}

// Guardamos qué inscripción se va a eliminar, para aplicarlo si el usuario confirma
let idInscripcionAEliminar = null;

// ─────────────────────────────────────────────────────────────
// CARGAR R5 DEL DELEGADO
// Importa automáticamente los jugadores de la alineación enviada
// por el delegado para este partido. Busca el R5 del equipo
// actualmente visible (local o visitante). Usa el set con más
// jugadores asignados (normalmente Set 1).
// ─────────────────────────────────────────────────────────────
function cargarDesdeR5() {
    const data = getAppData();
    const partido = data.partidos.find(p => p.id === partidoId);
    if (!partido) return;

    const idParticipacion = equipoSeleccionadoVisualizacion === 'local'
        ? partido.id_local_participacion
        : partido.id_visitante_participacion;

    const nombreEquipo = getNombreEquipoPorParticipacion(data, idParticipacion);

    // Buscar todos los R5 para este partido + participación
    const r5s = (data.r5 || []).filter(r =>
        r.id_partido === partidoId && r.id_participacion === idParticipacion
    );

    if (r5s.length === 0) {
        alert(`El delegado de ${nombreEquipo} todavía no envió el R5 para este partido.`);
        return;
    }

    // Usar el set con más jugadores asignados (prioriza Set 1)
    const r5 = r5s
        .sort((a, b) => (a.numero_set || 1) - (b.numero_set || 1))
        .reduce((best, r) => {
            const count = Object.values(r.alineacion || {}).filter(v => v).length;
            const bestCount = Object.values(best.alineacion || {}).filter(v => v).length;
            return count >= bestCount ? r : best;
        });

    const alineacion = r5.alineacion || {};
    const idsInscripcion = Object.values(alineacion).filter(v => v);

    if (idsInscripcion.length === 0) {
        alert(`El R5 del Set ${r5.numero_set || 1} de ${nombreEquipo} no tiene jugadores asignados.`);
        return;
    }

    // Agregar a estadisticasJugador los que no estén ya
    let agregados = 0;
    idsInscripcion.forEach(idIns => {
        const yaExiste = data.estadisticasJugador.some(
            e => e.id_partido === partidoId && e.id_inscripcion === idIns
        );
        if (!yaExiste) {
            // Verificar que la inscripción pertenece a esta participación
            const ins = data.inscripciones.find(i => i.id === idIns && i.id_participacion === idParticipacion);
            if (ins) {
                data.estadisticasJugador.push({
                    id_partido: partidoId,
                    id_inscripcion: idIns,
                    puntos: 0,
                    saque: 0,
                    ataque: 0,
                    bloqueo: 0,
                    defensa: 0,
                    colocacion: 0
                });
                agregados++;
            }
        }
    });

    guardarAppData(data);
    renderizarTablaUnicaDinamica();

    const setLabel = r5.numero_set ? `Set ${r5.numero_set}` : 'Set 1';
    if (agregados > 0) {
        alert(`✅ Se cargaron ${agregados} jugador${agregados !== 1 ? 'es' : ''} del R5 (${setLabel}) de ${nombreEquipo}.`);
    } else {
        alert(`Todos los jugadores del R5 (${setLabel}) ya estaban en la tabla.`);
    }
}

// --- Funciones de vista dinámica (tabla única) ---

function cambiarFiltroEquipo(lado) {
    if (equipoSeleccionadoVisualizacion === lado) return;
    equipoSeleccionadoVisualizacion = lado;

    const btnLocal = document.getElementById('tabEquipoLocal');
    const btnVisit = document.getElementById('tabEquipoVisit');

    // Cambia los estilos de Tailwind dinámicamente según la selección
    if (lado === 'local') {
        btnLocal.className = "flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 bg-purple-600 text-white shadow-sm";
        btnVisit.className = "flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50";
    } else {
        btnLocal.className = "flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50";
        btnVisit.className = "flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 bg-blue-600 text-white shadow-sm";
    }

    renderizarTablaUnicaDinamica();
}

function renderizarTablaUnicaDinamica() {
    const data = getAppData();
    const partido = data.partidos.find(p => p.id === partidoId);
    if (!partido) return;

    const idParticipacion = equipoSeleccionadoVisualizacion === 'local' 
        ? partido.id_local_participacion 
        : partido.id_visitante_participacion;

    const nombreEquipo = getNombreEquipoPorParticipacion(data, idParticipacion);
    
    // Actualiza textos dinámicos de la tarjeta de la tabla
    document.getElementById('lblTablaActiva').textContent = nombreEquipo;
    document.getElementById('lblRolTablaActive').textContent = `Plantilla · ${equipoSeleccionadoVisualizacion === 'local' ? 'Local' : 'Visitante'}`;

    // Reutiliza tu función de renderizado nativa apuntando al nuevo contenedor único
    renderizarTablaJugadores(idParticipacion, partido.id, 'tbodyDinamico', data);
}

function confirmarAgregarJugadorDinamico() {
    confirmarAgregarJugador(); // Ejecuta tu guardado base en localStorage
    renderizarTablaUnicaDinamica(); // Refresca inmediatamente la tabla en pantalla
}

function confirmarEliminarJugadorDinamico() {
    if (idInscripcionAEliminar === null) return;

    let data = getAppData();
    data.estadisticasJugador = data.estadisticasJugador.filter(
        e => !(e.id_partido === partidoId && e.id_inscripcion === idInscripcionAEliminar)
    );
    guardarAppData(data);

    renderizarTablaUnicaDinamica(); // Refresca la tabla dinámica
    idInscripcionAEliminar = null;
    document.getElementById('modalConfirmarEliminar').close();
}

// --- Guardar estadísticas ---

function guardarEstadisticas() {
    let data = getAppData();
    const partido = data.partidos.find(p => p.id === partidoId);
    if (!partido) return;

    // 1. Guardamos los sets editados
    const nuevosSets = [];
    for (let i = 1; i <= 3; i++) {
        const elLocal = document.getElementById(`s${i}Local`);
        const elVisit = document.getElementById(`s${i}Visit`);
        if (!elLocal || !elVisit) continue;

        const valLocal = parseInt(elLocal.value) || 0;
        const valVisit = parseInt(elVisit.value) || 0;

        // Solo guardamos el set si al menos uno de los dos lados tiene puntaje (evita guardar sets "vacíos" 0-0)
        if (valLocal > 0 || valVisit > 0) {
            nuevosSets.push({ local: valLocal, visitante: valVisit });
        }
    }
    partido.sets = nuevosSets;

    // 2. Guardamos las estadísticas de jugadores
    const inputs = document.querySelectorAll('.input-stat');
    inputs.forEach(input => {
        const insId = parseInt(input.dataset.ins);
        const categoria = input.dataset.cat;
        const valor = parseInt(input.value) || 0;

        let stat = data.estadisticasJugador.find(e => e.id_partido === partidoId && e.id_inscripcion === insId);

        if (stat) {
            stat[categoria] = valor;
        } else {
            data.estadisticasJugador.push({
                id_partido: partidoId,
                id_inscripcion: insId,
                puntos: 0,
                saque:     categoria === 'saque'     ? valor : 0,
                ataque:    categoria === 'ataque'    ? valor : 0,
                bloqueo:   categoria === 'bloqueo'   ? valor : 0,
                defensa:   categoria === 'defensa'   ? valor : 0,
                colocacion: categoria === 'colocacion' ? valor : 0
            });
        }
    });

    // Recalculamos puntos totales por jugador (suma de las 5 categorías)
    data.estadisticasJugador.forEach(stat => {
        if (stat.id_partido === partidoId) {
            stat.puntos = (stat.saque || 0) + (stat.ataque || 0) + (stat.bloqueo || 0)
                        + (stat.defensa || 0) + (stat.colocacion || 0);
        }
    });

    guardarAppData(data);

    if (typeof registrarActividad === 'function') {
        const nombreLocal = getNombreEquipoPorParticipacion(data, partido.id_local_participacion);
        const nombreVisit = getNombreEquipoPorParticipacion(data, partido.id_visitante_participacion);
        registrarActividad('STATS_GUARDADAS', `Se guardaron estadísticas y marcador de ${nombreLocal} vs ${nombreVisit}`);
    }

    // Re-render para reflejar sets y puntos recalculados
    renderizarMarcador(partido);
    renderizarTablaUnicaDinamica();

    alert("¡Estadísticas y sets guardados exitosamente!");
}

// ==========================================
// 🟨🟥 SANCIONES: tarjetas por jugador y multas al equipo
// ==========================================

let idInscripcionSancion = null;

function abrirModalSancionJugador(idInscripcion) {
    idInscripcionSancion = idInscripcion;

    const data = getAppData();
    const inscripcion = data.inscripciones.find(i => i.id === idInscripcion);
    const jugador = inscripcion ? data.jugadores.find(j => j.id === inscripcion.id_jugador) : null;

    document.getElementById('modalSancionJugadorNombre').textContent = jugador?.nombre || 'Jugador';
    document.getElementById('selectTipoSancion').value = 'AMARILLA';
    document.getElementById('inputMotivoSancion').value = '';
    document.getElementById('modalSancionJugador').showModal();
}

function confirmarSancionJugador() {
    if (idInscripcionSancion === null) return;

    const tipo = document.getElementById('selectTipoSancion').value; // 'AMARILLA' | 'ROJA'
    const motivo = document.getElementById('inputMotivoSancion').value.trim();
    const partidos_suspension = tipo === 'ROJA'
        ? (parseInt(document.getElementById('inputPartidosSuspension')?.value) || 1)
        : 0;

    if (!motivo) {
        alert('Ingresa el motivo de la tarjeta.');
        return;
    }

    const data = getAppData();
    if (!data.sancionesJugador) data.sancionesJugador = [];

    data.sancionesJugador.push({
        id: window.genId ? window.genId() : Date.now(),
        id_inscripcion: idInscripcionSancion,
        id_partido: partidoId,
        tipo,
        motivo,
        fecha: new Date().toISOString(),
        pagada: false,
        partidos_suspension
    });

    guardarAppData(data);

    if (typeof registrarActividad === 'function') {
        const inscripcion = data.inscripciones.find(i => i.id === idInscripcionSancion);
        const jugador = inscripcion ? data.jugadores.find(j => j.id === inscripcion.id_jugador) : null;
        const emoji = tipo === 'ROJA' ? '🟥' : '🟨';
        const suspLabel = tipo === 'ROJA' ? ` [${partidos_suspension}P susp.]` : '';
        registrarActividad('SANCION_JUGADOR', `${emoji} a ${jugador?.nombre || 'jugador'}: ${motivo}${suspLabel}`);
    }

    idInscripcionSancion = null;
    document.getElementById('modalSancionJugador').close();
    renderizarTablaUnicaDinamica();
}

function abrirModalMultaEquipo() {
    const data = getAppData();
    const partido = data.partidos.find(p => p.id === partidoId);
    const idParticipacion = equipoSeleccionadoVisualizacion === 'local' ? partido.id_local_participacion : partido.id_visitante_participacion;
    const nombreEquipo = getNombreEquipoPorParticipacion(data, idParticipacion);

    document.getElementById('modalMultaEquipoNombre').textContent = `Equipo: ${nombreEquipo}`;
    document.getElementById('inputMotivoMultaEquipo').value = '';
    document.getElementById('modalMultaEquipo').showModal();
}

function confirmarMultaEquipo() {
    const data = getAppData();
    const partido = data.partidos.find(p => p.id === partidoId);
    const idParticipacion = equipoSeleccionadoVisualizacion === 'local' ? partido.id_local_participacion : partido.id_visitante_participacion;
    const participacion = data.participaciones.find(p => p.id === idParticipacion);

    const motivo = document.getElementById('inputMotivoMultaEquipo').value.trim();
    if (!motivo) { alert('Ingresa el motivo.'); return; }

    if (!data.multasEquipo) data.multasEquipo = [];
    data.multasEquipo.push({
        id: window.genId ? window.genId() : Date.now(),
        id_equipo: participacion.id_equipo,
        id_participacion: idParticipacion,
        id_partido: partidoId,
        motivo,
        monto: 0,
        fecha: new Date().toISOString(),
        pagada: false
    });

    // Inhabilitar solo esta participación (equipo+rama+categoría)
    const partAFallar = data.participaciones.find(p => p.id === idParticipacion);
    if (partAFallar) partAFallar.aprobado = false;

    guardarAppData(data);

    if (typeof registrarActividad === 'function') {
        const nombreEquipo = getNombreEquipoPorParticipacion(data, idParticipacion);
        registrarActividad('INHABILITACION', `${nombreEquipo} inhabilitado: ${motivo}`);
    }

    document.getElementById('modalMultaEquipo').close();
}

// ================================================================
// W.O. — WALKOVER / NO SE PRESENTÓ
// ================================================================

let woEquipoSeleccionado = null; // 'local' | 'visitante'

function abrirModalWO() {
    const data = getAppData();
    const partido = data.partidos.find(p => p.id === partidoId);
    if (!partido) return;

    woEquipoSeleccionado = null;

    const nombreLocal = getNombreEquipoPorParticipacion(data, partido.id_local_participacion);
    const nombreVisit = getNombreEquipoPorParticipacion(data, partido.id_visitante_participacion);
    document.getElementById('lblWOLocal').textContent = nombreLocal;
    document.getElementById('lblWOVisit').textContent = nombreVisit;

    // Si uno de los dos equipos está inhabilitado, pre-seleccionarlo
    const partLocal = data.participaciones.find(p => p.id === partido.id_local_participacion);
    const partVisit = data.participaciones.find(p => p.id === partido.id_visitante_participacion);
    if (partLocal && !partLocal.aprobado) {
        seleccionarWO('local');
    } else if (partVisit && !partVisit.aprobado) {
        seleccionarWO('visitante');
    } else {
        seleccionarWO(null);
    }

    document.getElementById('modalWO').showModal();
}

function seleccionarWO(lado) {
    woEquipoSeleccionado = lado;

    const btnL = document.getElementById('btnWOLocal');
    const btnV = document.getElementById('btnWOVisit');
    const btnConfirmar = document.getElementById('btnConfirmarWO');

    if (lado === 'local') {
        btnL.className = 'flex-1 py-2 rounded-lg border-2 border-amber-400 bg-amber-100 text-amber-800 font-black text-xs uppercase tracking-wider transition-all';
        btnV.className = 'flex-1 py-2 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-400 font-black text-xs uppercase tracking-wider transition-all';
    } else if (lado === 'visitante') {
        btnL.className = 'flex-1 py-2 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-400 font-black text-xs uppercase tracking-wider transition-all';
        btnV.className = 'flex-1 py-2 rounded-lg border-2 border-amber-400 bg-amber-100 text-amber-800 font-black text-xs uppercase tracking-wider transition-all';
    } else {
        btnL.className = 'flex-1 py-2 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-500 font-black text-xs uppercase tracking-wider transition-all';
        btnV.className = 'flex-1 py-2 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-500 font-black text-xs uppercase tracking-wider transition-all';
    }

    if (btnConfirmar) btnConfirmar.disabled = !lado;
}

function confirmarWO() {
    if (!woEquipoSeleccionado) return;

    const data = getAppData();
    const partido = data.partidos.find(p => p.id === partidoId);
    if (!partido) return;

    // El equipo que NO se presentó pierde 0–2
    // Sets: el ganador gana 25-0 en cada set (claro que fue por WO)
    if (woEquipoSeleccionado === 'local') {
        // Local no se presentó → visitante gana 2-0
        partido.sets = [
            { local: 0, visitante: 25 },
            { local: 0, visitante: 25 }
        ];
    } else {
        // Visitante no se presentó → local gana 2-0
        partido.sets = [
            { local: 25, visitante: 0 },
            { local: 25, visitante: 0 }
        ];
    }

    partido.estado  = 'FINALIZADO';
    partido.wo      = true;         // marca para poder identificarlo
    partido.wo_equipo = woEquipoSeleccionado; // quién no llegó

    guardarAppData(data);

    if (typeof registrarActividad === 'function') {
        const nombreEq = getNombreEquipoPorParticipacion(
            data,
            woEquipoSeleccionado === 'local'
                ? partido.id_local_participacion
                : partido.id_visitante_participacion
        );
        registrarActividad('WO', `W.O.: ${nombreEq} no se presentó — partido ${partidoId} cerrado por defecto`);
    }

    document.getElementById('modalWO').close();

    // Refrescar UI
    renderizarCabecera(partido, data);
    renderizarMarcador(partido);
    renderizarBotonEstado(partido);
}

// logout: window.logout() — js/shared/data-bridge.js

// ================================================================
// 🔴 MARCADOR EN VIVO
// ================================================================

let _modalSaquePrimero = null;

/**
 * Cuando el admin pulsa "Iniciar Partido", antes de cambiar el estado
 * pregunta quién saca primero, luego inicializa el modo vivo.
 */
function iniciarPartidoConSaque() {
    document.getElementById('modalSaquePrimero').showModal();
}

window.confirmarSaquePrimero = function() {
    const sel = document.getElementById('selectSaquePrimero');
    if (!sel.value) { alert('Selecciona quién saca primero.'); return; }

    document.getElementById('modalSaquePrimero').close();

    const data    = getAppData();
    const partido = data.partidos.find(p => p.id === partidoId);
    window.iniciarVivo(data, partidoId, sel.value);

    // Avanzar estado a EN_PROGRESO
    partido.estado = 'EN_PROGRESO';
    guardarAppData(data);

    if (typeof registrarActividad === 'function') {
        const nL = getNombreEquipoPorParticipacion(data, partido.id_local_participacion);
        const nV = getNombreEquipoPorParticipacion(data, partido.id_visitante_participacion);
        registrarActividad('PARTIDO_INICIADO', `${nL} vs ${nV} — saca primero: ${sel.value === 'local' ? nL : nV}`);
    }

    const dataFresh = getAppData();
    const partidoFresh = dataFresh.partidos.find(p => p.id === partidoId);
    renderizarCabecera(partidoFresh, dataFresh);
    renderizarBotonEstado(partidoFresh);
    renderizarMarcadorVivo(dataFresh, partidoFresh);
    renderizarCancharVivo(dataFresh, partidoFresh);
};

function renderizarMarcadorVivo(data, partido) {
    const sec = document.getElementById('seccionViva');
    if (!sec) return;

    const vivo = partido.vivo;
    if (!vivo) { sec.classList.add('hidden'); return; }
    sec.classList.remove('hidden');

    const nL = getNombreEquipoPorParticipacion(data, partido.id_local_participacion);
    const nV = getNombreEquipoPorParticipacion(data, partido.id_visitante_participacion);
    const saqueL = vivo.saqueActual === 'local';

    document.getElementById('vivoNombreLocal').textContent   = nL;
    document.getElementById('vivoNombreVisit').textContent   = nV;
    document.getElementById('vivoPuntosLocal').textContent   = vivo.local.puntos;
    document.getElementById('vivoPuntosVisit').textContent   = vivo.visitante.puntos;
    document.getElementById('vivoSetActual').textContent     = `Set ${vivo.setActual}`;
    document.getElementById('vivoSaqueIndicador').textContent =
        `🏐 Saca: ${saqueL ? nL : nV}`;

    // Resultados de sets anteriores
    const setsEl = document.getElementById('vivoSetsAnteriores');
    if (setsEl) {
        setsEl.innerHTML = (partido.sets || []).map((s, i) =>
            `<span class="text-xs font-bold text-gray-500">Set ${i+1}: ${s.local}–${s.visitante}</span>`
        ).join('<span class="text-gray-300 mx-1">·</span>');
    }

    // TM y sust restantes
    const tmL  = MAX_TM  - (vivo.local.tiemposMuertosUsados    || 0);
    const tmV  = MAX_TM  - (vivo.visitante.tiemposMuertosUsados || 0);
    const sL   = MAX_SUST - (vivo.local.sustitucionesAplicadas?.length    || 0);
    const sV   = MAX_SUST - (vivo.visitante.sustitucionesAplicadas?.length || 0);

    document.getElementById('vivoTmLocal').textContent  = `TM: ${vivo.local.tiemposMuertosUsados    || 0}/${MAX_TM}`;
    document.getElementById('vivoTmVisit').textContent  = `TM: ${vivo.visitante.tiemposMuertosUsados || 0}/${MAX_TM}`;
    document.getElementById('vivoSustLocal').textContent = `Sust: ${vivo.local.sustitucionesAplicadas?.length    || 0}/${MAX_SUST}`;
    document.getElementById('vivoSustVisit').textContent = `Sust: ${vivo.visitante.sustitucionesAplicadas?.length || 0}/${MAX_SUST}`;
}

function renderizarCancharVivo(data, partido) {
    const sec = document.getElementById('seccionCanchaViva');
    if (!sec || !partido.vivo) { if(sec) sec.classList.add('hidden'); return; }
    sec.classList.remove('hidden');

    const renderMiCancha = (lado) => {
        const idPart = lado === 'local' ? partido.id_local_participacion : partido.id_visitante_participacion;
        const r5s = (data.r5 || []).filter(r =>
            r.id_partido === partidoId &&
            r.id_participacion === idPart &&
            r.numero_set === partido.vivo.setActual
        );
        const r5 = r5s[0];
        if (!r5) return `<p class="text-xs text-gray-400 italic text-center py-4">Sin R5 para Set ${partido.vivo.setActual}</p>`;

        const vivoEq = partido.vivo[lado];
        const enCancha = window.calcularEnCancha(r5, vivoEq);
        if (!enCancha) return '';

        const nombre = (idIns) => {
            if (!idIns) return '—';
            const ins = data.inscripciones.find(i => i.id === idIns);
            const j   = data.jugadores.find(x => x.id === ins?.id_jugador);
            const rol = Object.entries(r5.roles || {}).find(([k,v]) => v === idIns);
            const rolLabel = rol ? { armador:'ARM', opuesto:'OPU', punta1:'PUN', punta2:'PUN', central1:'CEN', central2:'CEN', libero:'LÍB' }[rol[0]] || '' : '';
            return `<span class="block">#${ins?.numero_camiseta||'?'} ${j?.nombre?.split(' ')[0]||'?'}</span>${rolLabel ? `<span class="text-[8px] opacity-70">${rolLabel}</span>` : ''}`;
        };

        const isSaque = partido.vivo.saqueActual === lado;
        const color   = lado === 'local' ? '#7c3aed' : '#2563EB';

        return `
        <div>
            <p class="text-[10px] font-black uppercase tracking-wider mb-2 ${lado==='local'?'text-purple-600':'text-blue-600'}">
                ${getNombreEquipoPorParticipacion(data, idPart)}
                ${isSaque ? '<span class="ml-1 text-amber-500">🏐 saque</span>' : ''}
            </p>
            <div style="background:#16a34a;border-radius:.5rem;padding:.5rem">
                <div style="background:#bbf7d0;height:.4rem;border-radius:.25rem;margin-bottom:.3rem;display:flex;align-items:center;justify-content:center">
                    <span style="font-size:.5rem;font-weight:900;color:#15803d;background:#bbf7d0;padding:0 .3rem;border-radius:.2rem">RED</span>
                </div>
                <div style="background:#15803d;border:2px solid #bbf7d0;border-radius:.4rem;padding:.4rem;display:grid;grid-template-rows:1fr 1fr;gap:.3rem;aspect-ratio:1.6/1">
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.3rem">
                        ${['pos4','pos3','pos2'].map(p => `
                        <div style="background:rgba(255,255,255,.25);border:1px solid rgba(255,255,255,.3);border-radius:.3rem;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:.2rem;min-height:2.8rem">
                            <span style="font-size:.5rem;font-weight:900;color:#bbf7d0">${{pos4:'IV',pos3:'III',pos2:'II'}[p]}</span>
                            <span style="font-size:.5rem;font-weight:700;color:white;text-align:center;line-height:1.1">${nombre(enCancha[p])}</span>
                        </div>`).join('')}
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.3rem">
                        ${['pos5','pos6','pos1'].map(p => `
                        <div style="background:rgba(255,255,255,${p==='pos1'&&isSaque?'.45':'.2'});border:${p==='pos1'&&isSaque?'2px solid #fcd34d':'1px solid rgba(255,255,255,.3)'};border-radius:.3rem;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:.2rem;min-height:2.8rem">
                            <span style="font-size:.5rem;font-weight:900;color:#bbf7d0">${{pos5:'V',pos6:'VI',pos1:'I'}[p]}</span>
                            <span style="font-size:.5rem;font-weight:700;color:white;text-align:center;line-height:1.1">${nombre(enCancha[p])}</span>
                        </div>`).join('')}
                    </div>
                </div>
            </div>
        </div>`;
    };

    document.getElementById('canchaVivaLocal').innerHTML = renderMiCancha('local');
    document.getElementById('canchaVivaVisit').innerHTML = renderMiCancha('visitante');
}

// ── Botones +1 punto ──────────────────────────────────────────
window.sumarPunto = function(quien) {
    let data    = getAppData();
    const { setCerrado, partidoCerrado } = window.registrarPunto(data, partidoId, quien);

    data = getAppData();
    const partido = data.partidos.find(p => p.id === partidoId);

    renderizarMarcadorVivo(data, partido);
    renderizarCancharVivo(data, partido);
    renderizarCabecera(partido, data);

    if (setCerrado && !partidoCerrado) {
        const ant = partido.sets[partido.sets.length - 1];
        alert(`✅ Set ${partido.sets.length} cerrado: ${ant.local}–${ant.visitante}\nAhora comienza el Set ${partido.vivo.setActual}`);
    }
    if (partidoCerrado) {
        renderizarBotonEstado(partido);
        alert('🏆 ¡Partido finalizado!');
    }
};

window.deshacerUltimoPunto = function() {
    if (!confirm('¿Deshacer el último punto registrado?')) return;
    const data = getAppData();
    window.deshacerPunto(data, partidoId);
    const dataFresh   = getAppData();
    const partidoFresh = dataFresh.partidos.find(p => p.id === partidoId);
    renderizarMarcadorVivo(dataFresh, partidoFresh);
    renderizarCancharVivo(dataFresh, partidoFresh);
};

// ── Sustituciones en vivo (admin) ─────────────────────────────
let _sustEquipo = null;

window.abrirModalSustVivo = function(equipo) {
    _sustEquipo = equipo;
    const data    = getAppData();
    const partido = data.partidos.find(p => p.id === partidoId);
    const idPart  = equipo === 'local' ? partido.id_local_participacion : partido.id_visitante_participacion;
    const nombre  = getNombreEquipoPorParticipacion(data, idPart);
    const vivo    = partido.vivo[equipo];

    document.getElementById('modalSustVivoEquipo').textContent = nombre;

    // Jugadores actualmente en cancha (después de rotaciones y sust ya hechas)
    const r5 = (data.r5 || []).find(r =>
        r.id_partido === partidoId &&
        r.id_participacion === idPart &&
        r.numero_set === partido.vivo.setActual
    );
    const enCancha = r5 ? window.calcularEnCancha(r5, vivo) : null;
    const idsEnCancha = enCancha ? Object.values(enCancha).filter(Boolean) : [];

    // Roster completo del equipo en este partido
    const convocatoria = (data.convocatorias || []).find(c =>
        c.id_partido === partidoId && c.id_participacion === idPart
    );
    const roster = convocatoria?.convocados || [];

    const optsCancha = roster
        .filter(id => idsEnCancha.includes(id))
        .map(id => { const ins = data.inscripciones.find(i => i.id === id); const j = data.jugadores.find(x => x.id === ins?.id_jugador); return `<option value="${id}">#${ins?.numero_camiseta} ${j?.nombre||'?'}</option>`; })
        .join('');

    const optsBanca = roster
        .filter(id => !idsEnCancha.includes(id))
        .map(id => { const ins = data.inscripciones.find(i => i.id === id); const j = data.jugadores.find(x => x.id === ins?.id_jugador); return `<option value="${id}">#${ins?.numero_camiseta} ${j?.nombre||'?'}</option>`; })
        .join('');

    document.getElementById('selectSustSale').innerHTML  = `<option value="">— Sale —</option>${optsCancha}`;
    document.getElementById('selectSustEntra').innerHTML = `<option value="">— Entra —</option>${optsBanca}`;

    const restantes = MAX_SUST - (vivo.sustitucionesAplicadas?.length || 0);
    document.getElementById('vivoSustRestantes').textContent = `${restantes} sustitución${restantes !== 1 ? 'es' : ''} disponible${restantes !== 1 ? 's' : ''}`;

    document.getElementById('modalSustVivo').showModal();
};

window.confirmarSustVivo = function() {
    const sale  = parseInt(document.getElementById('selectSustSale').value);
    const entra = parseInt(document.getElementById('selectSustEntra').value);
    if (!sale || !entra) { alert('Selecciona los dos jugadores.'); return; }

    const data = getAppData();
    const res  = window.registrarSustitucionVivo(data, partidoId, _sustEquipo, sale, entra);

    if (!res.ok) { alert(res.msg); return; }

    document.getElementById('modalSustVivo').close();
    const dataFresh   = getAppData();
    const partidoFresh = dataFresh.partidos.find(p => p.id === partidoId);
    renderizarMarcadorVivo(dataFresh, partidoFresh);
    renderizarCancharVivo(dataFresh, partidoFresh);
};

// ── Tiempos muertos en vivo (admin) ───────────────────────────
window.registrarTMVivo = function(equipo) {
    const data = getAppData();
    const res  = window.registrarTiempoMuertoVivo(data, partidoId, equipo);
    if (!res.ok) { alert(res.msg); return; }

    const dataFresh   = getAppData();
    const partidoFresh = dataFresh.partidos.find(p => p.id === partidoId);
    renderizarMarcadorVivo(dataFresh, partidoFresh);
    if (typeof registrarActividad === 'function') {
        const nombre = getNombreEquipoPorParticipacion(dataFresh, equipo === 'local' ? partidoFresh.id_local_participacion : partidoFresh.id_visitante_participacion);
        registrarActividad('TIEMPO_MUERTO', `⏱ Tiempo muerto — ${nombre}`);
    }
};

