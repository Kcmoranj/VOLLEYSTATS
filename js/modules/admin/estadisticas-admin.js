/**
 * estadisticas-admin.js - Lógica completa
 */

const getAppData = () => window.AppDB
    ? window.AppDB.get()
    : (JSON.parse(localStorage.getItem('volleyData')) || window.VolleyAppData);

const guardarAppData = (data) => window.AppDB
    ? window.AppDB.save(data)
    : localStorage.setItem('volleyData', JSON.stringify(data));

// Capturamos ID de la URL
const params = new URLSearchParams(window.location.search);
const partidoId = parseInt(params.get('partidoId'));
let ladoModalActivo = null; //
const FLUJO_ESTADOS = ["PROGRAMADO", "EN_PROGRESO", "FINALIZADO"]; //
let equipoSeleccionadoVisualizacion = 'local'; 

// Normaliza el estado para comparaciones seguras, sin importar cómo haya quedado guardado
// (mayúsculas/minúsculas, espacios extra, etc.)
function normalizarEstado(estado) {
    return String(estado || '').toUpperCase().trim();
}

document.addEventListener('DOMContentLoaded', () => {
    if (!partidoId) {
        alert("Error: No se seleccionó un partido");
        window.location.href = "partidos-admin.html";
        return;
    }
    inicializarPagina();
    inicializarEventos();
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
        btn.className = "btn flex-1 bg-green-600 hover:bg-green-700 border-none text-white font-bold text-xs tracking-wider uppercase";
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
        btnCambiarEst.addEventListener('click', avanzarEstadoPartido);
    }

    const btnRetrocederEst = document.getElementById('btnRetrocederEstado');
    if (btnRetrocederEst) {
        btnRetrocederEst.addEventListener('click', retrocederEstadoPartido);
    }

    const btnConfRetroceso = document.getElementById('btnConfirmarRetroceso');
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
        id: Date.now(),
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
        id: Date.now(),
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