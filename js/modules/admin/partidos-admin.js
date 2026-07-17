/**
 * partidos-admin.js
 *
 * FIX: el menú de "Editar / Eliminar" se recortaba en los partidos recién
 * creados porque siempre se agregan al FINAL de la tabla, y el contenedor
 * tenía `overflow-hidden` + el menú se abría hacia abajo (se salía del
 * contenedor visible, dejando solo "Editar" visible/clicable).
 * Ahora: las últimas filas abren el menú hacia arriba (`dropdown-top`).
 */

const getAppData = () => window.AppDB.get();
const guardarDatos = (data) => window.AppDB.save(data);
const normalizarEstado = (e) => window.normalizarEstado(e);

// Variable global para saber si estamos editando
let partidoEditandoId = null;

document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    const data = getAppData();
    const selCat = document.getElementById('selectCategoria');
    const selRama = document.getElementById('selectRama');

    // 1. Cargar Categorías
    if (selCat) {
        selCat.innerHTML = '<option disabled selected>Seleccione Categoría</option>' + 
            data.categoriasTorneo.map(cat => `<option value="${cat.id}">${cat.nombre}</option>`).join('');
        selCat.addEventListener('change', actualizarRamas);
    }

    // 2. Cargar Ramas (se habilitan tras elegir categoría)
    if (selRama) {
        selRama.addEventListener('change', actualizarEquipos);
    }
    
    // Populate filter category dropdown
    const filtroCat = document.getElementById('filtroCategoria');
    if (filtroCat) {
        data.categoriasTorneo.forEach(cat => {
            filtroCat.innerHTML += `<option value="${cat.id}">${cat.nombre}</option>`;
        });
    }

    // Cargar partidos iniciales
    renderizarListaPartidos();
});

// Global alias so the HTML can call renderPartidos() from filter inputs
window.renderPartidos = renderizarListaPartidos;

// Normaliza el estado para comparaciones seguras, sin importar cómo haya quedado guardado
// (mayúsculas/minúsculas, espacios extra, etc.)

function renderizarTarjetasResumen(data) {
    const totalEl = document.getElementById('cardTotalPartidos');
    const hoyEl = document.getElementById('cardHoy');
    const pendientesEl = document.getElementById('cardPendientes');
    const finalizadosEl = document.getElementById('cardFinalizados');
    if (!totalEl) return; // si esta página no tiene las tarjetas, no hacemos nada

    const partidos = data.partidos || [];

    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    const fechaHoyStr = `${yyyy}-${mm}-${dd}`;

    const total = partidos.length;
    const partidosHoy = partidos.filter(p => p.fecha === fechaHoyStr).length;
    const pendientes = partidos.filter(p => normalizarEstado(p.estado) === 'PROGRAMADO').length;
    const finalizados = partidos.filter(p => normalizarEstado(p.estado) === 'FINALIZADO').length;

    if (totalEl)      totalEl.textContent      = total;
    if (hoyEl)        hoyEl.textContent        = partidosHoy;
    if (pendientesEl) pendientesEl.textContent = pendientes;
    if (finalizadosEl)finalizadosEl.textContent= finalizados;
}

function renderizarListaPartidos() {
    const data = getAppData();
    const contenedor = document.getElementById('listaPartidos');
    if (!contenedor) return;

    renderizarTarjetasResumen(data);

    // Apply filters from window._filtros
    const f = window._filtros || {};
    const qBuscar     = f.getBuscar     ? f.getBuscar()     : '';
    const qEstado     = f.getEstado     ? f.getEstado()     : '';
    const qFechaDesde = f.getFechaDesde ? f.getFechaDesde() : '';
    const qFechaHasta = f.getFechaHasta ? f.getFechaHasta() : '';
    const qCategoria  = f.getCategoria  ? f.getCategoria()  : '';

    let partidos = data.partidos;

    if (qBuscar) {
        partidos = partidos.filter(p => {
            const pL = data.participaciones.find(x => x.id === p.id_local_participacion);
            const pV = data.participaciones.find(x => x.id === p.id_visitante_participacion);
            const nL = (data.equipos.find(e => e.id === pL?.id_equipo)?.nombre || '').toLowerCase();
            const nV = (data.equipos.find(e => e.id === pV?.id_equipo)?.nombre || '').toLowerCase();
            return nL.includes(qBuscar) || nV.includes(qBuscar);
        });
    }
    if (qEstado)     partidos = partidos.filter(p => normalizarEstado(p.estado) === qEstado);
    if (qFechaDesde) partidos = partidos.filter(p => p.fecha >= qFechaDesde);
    if (qFechaHasta) partidos = partidos.filter(p => p.fecha <= qFechaHasta);
    if (qCategoria)  partidos = partidos.filter(p => {
        const part = data.participaciones.find(x => x.id === p.id_local_participacion);
        return String(part?.id_categoria_torneo) === String(qCategoria);
    });

    // Counter
    const contEl = document.getElementById('contadorPartidos');
    if (contEl) contEl.textContent = partidos.length === data.partidos.length
        ? `${data.partidos.length} partidos`
        : `${partidos.length} de ${data.partidos.length}`;

    // sinPartidosFiltro
    const sinEl = document.getElementById('sinPartidosFiltro');
    if (sinEl) sinEl.classList.toggle('hidden', partidos.length > 0);

    // Update stat cards
    const enVivoEl = document.getElementById('cardEnVivo');
    if (enVivoEl) enVivoEl.textContent = data.partidos.filter(p => normalizarEstado(p.estado) === 'EN_PROGRESO').length;

    const total = partidos.length;
    if (!total) { contenedor.innerHTML = ''; return; }

    contenedor.innerHTML = partidos.map((p, idx) => {
        const partLocal = data.participaciones.find(x => x.id === p.id_local_participacion);
        const partVisit = data.participaciones.find(x => x.id === p.id_visitante_participacion);
        
        const nombreLocal = data.equipos.find(e => e.id === partLocal?.id_equipo)?.nombre || "-";
        const nombreVisit = data.equipos.find(e => e.id === partVisit?.id_equipo)?.nombre || "-";
        
        const cat = data.categoriasTorneo.find(c => c.id === partLocal?.id_categoria_torneo)?.nombre || "-";
        const rama = data.ramas.find(r => r.id === partLocal?.id_rama)?.nombre || "-";

        const estadoEstilos = obtenerEstilosEstado(p.estado);

        // FIX: si la fila está entre las últimas 3 de la tabla, el menú se abre
        // hacia ARRIBA para que no se recorte contra el borde inferior del contenedor.
        const esFilaCercaDelFinal = idx >= total - 3;
        const claseDropdown = esFilaCercaDelFinal ? 'dropdown dropdown-left dropdown-top' : 'dropdown dropdown-left';

return `
            <tr onclick="window.location.href='estadisticas-admin.html?partidoId=${p.id}'" class="text-sm border-b border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer group">
                <td class="py-4 pl-6 pr-3 font-bold text-gray-700">${p.fecha}</td>
                <td class="py-4 px-3 text-gray-500">${p.hora}</td>
                <td class="py-4 px-3 font-black group-hover:text-blue-600 transition-colors">${nombreLocal}</td>
                <td class="py-4 px-1 text-gray-300 font-bold text-center">VS</td>
                <td class="py-4 px-3 font-black text-center group-hover:text-blue-600 transition-colors">${nombreVisit}</td>
                <td class="py-4 px-3 text-center leading-tight">
                    <span class="block font-bold text-gray-800">${cat}</span>
                    <span class="text-[10px] text-gray-400 uppercase font-bold">${rama}</span>
                </td>
                <td class="py-4 px-3 text-center text-gray-600">${p.ubicacion}</td>
                <td class="py-4 px-3 text-center">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${estadoEstilos}">
                        ${String(p.estado).replace('_', ' ')}
                    </span>
                </td>
                
                <td class="py-4 pl-3 pr-6 text-center" onclick="event.stopPropagation()">
                    <div class="${claseDropdown} inline-block">
                        <div tabindex="0" role="button" class="btn btn-ghost btn-sm text-gray-400 hover:text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                            </svg>
                        </div>
                        <ul tabindex="0" class="dropdown-content z-50 menu p-2 shadow-lg bg-white rounded-box w-36 border border-gray-100 text-left">
                            <li>
                                <button onclick="editarPartido(${p.id})" class="text-gray-700 font-bold">
                                    ✏️ Editar
                                </button>
                            </li>
                            <li>
                                <button onclick="eliminarPartido(${p.id})" class="text-red-600 font-bold">
                                    🗑️ Eliminar
                                </button>
                            </li>
                        </ul>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Paso 1: Al cambiar categoría, habilitamos y filtramos las ramas disponibles
function actualizarRamas() {
    const data = getAppData();
    const categoriaId = parseInt(document.getElementById('selectCategoria').value);
    const selRama = document.getElementById('selectRama');
    const selLocal = document.getElementById('selectLocal');
    const selVisitante = document.getElementById('selectVisitante');

    selRama.innerHTML = '<option disabled selected>Seleccione una rama</option>';
    selLocal.innerHTML = '<option disabled selected>Seleccione Local</option>';
    selVisitante.innerHTML = '<option disabled selected>Seleccione Visitante</option>';
    selLocal.disabled = true;
    selVisitante.disabled = true;

    const participacionesCategoria = data.participaciones.filter(
        p => p.id_categoria_torneo === categoriaId && p.aprobado
    );
    const idsRamasDisponibles = [...new Set(participacionesCategoria.map(p => p.id_rama))];
    const ramasDisponibles = data.ramas.filter(r => idsRamasDisponibles.includes(r.id));

    if (ramasDisponibles.length === 0) {
        selRama.innerHTML = '<option disabled selected>Sin ramas disponibles</option>';
        selRama.disabled = true;
        return;
    }

    selRama.innerHTML = '<option disabled selected>Seleccione una rama</option>' +
        ramasDisponibles.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('');
    selRama.disabled = false;
}

// Paso 2: Al cambiar rama, filtramos los equipos por categoría + rama
function actualizarEquipos() {
    const data = getAppData();
    const categoriaId = parseInt(document.getElementById('selectCategoria').value);
    const ramaId = parseInt(document.getElementById('selectRama').value);
    const selLocal = document.getElementById('selectLocal');
    const selVisitante = document.getElementById('selectVisitante');

    if (isNaN(categoriaId) || isNaN(ramaId)) return;

    selLocal.disabled = false;
    selVisitante.disabled = false;

    const equiposFiltrados = data.participaciones.filter(p =>
        p.id_categoria_torneo === categoriaId &&
        p.id_rama === ramaId &&
        p.aprobado
    );

    const optionsHtml = equiposFiltrados.map(p => {
        const equipo = data.equipos.find(e => e.id === p.id_equipo);
        return `<option value="${p.id}">${equipo ? equipo.nombre : 'Equipo desconocido'}</option>`;
    }).join('');

    selLocal.innerHTML = '<option disabled selected>Seleccione Local</option>' + optionsHtml;
    selVisitante.innerHTML = '<option disabled selected>Seleccione Visitante</option>' + optionsHtml;
} 

function obtenerNombresEnfrentamiento(data, idLocalParticipacion, idVisitParticipacion) {
    const partLocal = data.participaciones.find(x => x.id === idLocalParticipacion);
    const partVisit = data.participaciones.find(x => x.id === idVisitParticipacion);
    const nombreLocal = data.equipos.find(e => e.id === partLocal?.id_equipo)?.nombre || "Equipo desconocido";
    const nombreVisit = data.equipos.find(e => e.id === partVisit?.id_equipo)?.nombre || "Equipo desconocido";
    return `${nombreLocal} vs ${nombreVisit}`;
}

document.getElementById('btnGuardar')?.addEventListener('click', () => {
    const data = getAppData();
    const idLocal = parseInt(document.getElementById('selectLocal').value);
    const idVisitante = parseInt(document.getElementById('selectVisitante').value);
    
    if (isNaN(idLocal) || isNaN(idVisitante)) return alert("Por favor seleccione ambos equipos");
    if (idLocal === idVisitante) return alert("Los equipos no pueden ser iguales");

    const fecha = document.getElementById('inputFecha').value;
    if (!fecha) return alert("Por favor selecciona una fecha para el partido");

    const partidoData = {
        id: partidoEditandoId ? partidoEditandoId : Date.now(),
        fecha: fecha,
        hora: document.getElementById('inputHora').value,
        ubicacion: document.getElementById('inputCancha').value,
        id_local_participacion: idLocal,
        id_visitante_participacion: idVisitante,
        estado: 'PROGRAMADO',
        sets: []
    };

    const esEdicion = !!partidoEditandoId;

    if (partidoEditandoId) {
        const index = data.partidos.findIndex(p => p.id === partidoEditandoId);
        if (index !== -1) {
            partidoData.estado = data.partidos[index].estado;
            partidoData.sets = data.partidos[index].sets;
            data.partidos[index] = partidoData;
        }
        partidoEditandoId = null;
        document.getElementById('btnGuardar').textContent = "Registrar Partido";
    } else {
        data.partidos.push(partidoData);
    }

    guardarDatos(data);

    const nombresEnfrentamiento = obtenerNombresEnfrentamiento(data, idLocal, idVisitante);
    if (typeof registrarActividad === 'function') {
        if (esEdicion) {
            registrarActividad('PARTIDO_EDITADO', `Se editó el partido ${nombresEnfrentamiento} (${partidoData.fecha} ${partidoData.hora})`);
        } else {
            registrarActividad('PARTIDO_CREADO', `Se programó el partido ${nombresEnfrentamiento} (${partidoData.fecha} ${partidoData.hora})`);
        }
    }
    
    limpiarFormulario();
    renderizarListaPartidos();
});

function limpiarFormulario() {
    document.getElementById('selectCategoria').selectedIndex = 0;
    document.getElementById('selectRama').innerHTML = '<option disabled selected>Seleccione una rama</option>';
    document.getElementById('selectRama').disabled = true;
    document.getElementById('selectLocal').innerHTML = '<option disabled selected>Seleccione Local</option>';
    document.getElementById('selectVisitante').innerHTML = '<option disabled selected>Seleccione Visitante</option>';
    document.getElementById('selectLocal').disabled = true;
    document.getElementById('selectVisitante').disabled = true;
    document.getElementById('inputFecha').value = '';
    document.getElementById('inputHora').value = '';
    document.getElementById('inputCancha').selectedIndex = 0;
}

function obtenerEstilosEstado(estado) {
    const estNormalizado = normalizarEstado(estado);
    const estilos = {
        'FINALIZADO': 'bg-green-100 text-green-700',
        'EN_PROGRESO': 'bg-yellow-100 text-yellow-800 animate-pulse',
        'PROGRAMADO': 'bg-blue-100 text-blue-700'
    };
    return estilos[estNormalizado] || 'bg-gray-100 text-gray-500';
}

function editarPartido(id) {
    const data = getAppData();
    const partido = data.partidos.find(p => p.id === id);
    if (!partido) return;

    partidoEditandoId = id;

    const partLocal = data.participaciones.find(x => x.id === partido.id_local_participacion);
    if (partLocal) {
        document.getElementById('selectCategoria').value = partLocal.id_categoria_torneo;
        actualizarRamas();
        document.getElementById('selectRama').value = partLocal.id_rama;
        actualizarEquipos();
    }
    
    document.getElementById('selectLocal').value = partido.id_local_participacion;
    document.getElementById('selectVisitante').value = partido.id_visitante_participacion;
    document.getElementById('inputFecha').value = partido.fecha;
    document.getElementById('inputHora').value = partido.hora;
    document.getElementById('inputCancha').value = partido.ubicacion;

    document.getElementById('btnGuardar').textContent = "Actualizar Partido";
}

function eliminarPartido(id) {
    if (!confirm("¿Estás seguro de eliminar este partido?")) return;
    
    let data = getAppData();
    const partido = data.partidos.find(p => p.id === id);
    const nombresEnfrentamiento = partido
        ? obtenerNombresEnfrentamiento(data, partido.id_local_participacion, partido.id_visitante_participacion)
        : `partido #${id}`;

    data.partidos = data.partidos.filter(p => p.id !== id);
    guardarDatos(data);

    if (typeof registrarActividad === 'function') {
        registrarActividad('PARTIDO_ELIMINADO', `Se eliminó el partido ${nombresEnfrentamiento}`);
    }

    renderizarListaPartidos();
}