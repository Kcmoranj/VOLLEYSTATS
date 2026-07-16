
/** Escapa HTML para prevenir XSS al insertar datos de usuario en innerHTML */
function escHTML(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
/**
 * detalle-equipo.js - Versión Corregida (delegado crea, admin solo aprueba/administra)
 *
 * CAMBIOS respecto a la versión anterior:
 *  1. Se eliminó la creación de nuevas participaciones desde el admin
 *     (window.prepararYAbrirModal / window.confirmarNuevaParticipacion).
 *     Esa función ahora vive en pages/delegado/mi-equipo.js.
 *  2. La elegibilidad de jugadores ya NO se calcula aquí con lógica propia rota
 *     (obtenerNombreCategoria/obtenerNombreTorneo no existían). Ahora se usa
 *     window.Elegibilidad.jugadorEsElegible(), que trae las reglas correctas:
 *     Toddler -> todas | C-/C+ -> Cantera+ | B-/B+ -> Semi Pro+ | A-/A+ -> Pro.
 *  3. Solo se sugieren jugadores con estado 'APROBADO' (los propuestos por un
 *     delegado y aún pendientes no aparecen hasta que el admin los apruebe en
 *     solicitudes-admin.html).
 *  4. FIX (doble fuente de verdad): antes se leía/escribía también
 *     'volley_jugadores' además de 'volleyData'. Como Solicitudes (aprobar/
 *     rechazar jugador) solo actualiza 'volleyData', esa segunda copia podía
 *     quedar vieja y revivir jugadores rechazados o revertir aprobaciones.
 *     Ahora 'volleyData' es la única fuente de verdad para jugadores.
 */

const getAppData = () => {
    const localData = localStorage.getItem('volleyData');
    let data;
    if (localData) {
        data = JSON.parse(localData);
    } else if (window.VolleyAppData) {
        data = window.VolleyAppData;
    } else {
        console.error('⚠️ No se encontró window.VolleyAppData (js/mock-data.js no cargó). Usando datos mínimos de emergencia.');
        data = window.datosMinimosDeEmergencia ? window.datosMinimosDeEmergencia() : { equipos: [], participaciones: [], jugadores: [], inscripciones: [] };
    }
    return window.migrarModeloDelegados ? window.migrarModeloDelegados(data) : data;
};

const guardarAppData = (data) => window.AppDB
    ? window.AppDB.save(data)
    : localStorage.setItem('volleyData', JSON.stringify(data));

document.addEventListener('DOMContentLoaded', () => {
    initDetalle();

    document.getElementById('inputBuscarJugador')?.addEventListener('input', manejarBusquedaJugador);
    document.getElementById('listaSugerenciasJugador')?.addEventListener('click', manejarClickSugerencia);
    document.getElementById('btnAgregarConfirmado')?.addEventListener('click', agregarJugadorConfirmado);

    const btnGuardar = document.getElementById('btnGuardarModal');
    if (btnGuardar) {
        btnGuardar.onclick = () => guardarCambios(window.currentParticipacionId);
    }
});

// --- RENDERIZADO PRINCIPAL ---
const initDetalle = () => {
    const data = getAppData();
    if (!data) return;

    const idEquipo = parseInt(new URLSearchParams(window.location.search).get('id'));
    const equipo = data.equipos.find(e => e.id === idEquipo);
    document.getElementById('nombreEquipo').innerText = equipo?.nombre || "Equipo no encontrado";

    const container = document.getElementById('participacionesContainer');
    container.innerHTML = '';

    const participaciones = data.participaciones.filter(p => p.id_equipo === idEquipo);

    if (participaciones.length === 0) {
        container.innerHTML = `<div class="card-admin text-center text-gray-400 font-semibold col-span-2">
            Este equipo todavía no tiene categorías registradas por su delegado.
        </div>`;
        return;
    }

    participaciones.forEach(p => {
        const cat = data.categoriasTorneo.find(c => c.id === p.id_categoria_torneo)?.nombre || 'N/A';
        const rama = data.ramas.find(r => r.id === p.id_rama)?.nombre || 'N/A';
        const insc = data.inscripciones.filter(i => i.id_participacion === p.id);
        const listaNombres = insc.map(i => {
            const j = data.jugadores.find(jug => jug.id === i.id_jugador);
            if (!j) return '';
            const pendiente = j.estado === 'PENDIENTE' ? ' <span class="text-amber-500">(pendiente)</span>' : '';
            return `<li class="truncate">${escHTML(j.nombre)} (#${i.numero_camiseta})${pendiente}</li>`;
        }).join('');

        container.innerHTML += `
            <div class="card-admin border-l-4 bg-white hover:shadow-lg transition-all ${p.aprobado ? 'border-l-green-500' : 'border-l-red-500'}">
                <div class="flex justify-between items-center mb-2">
                    <h3 onclick="abrirEditor(${p.id})" class="font-black text-blue-600 uppercase cursor-pointer">${cat} - ${rama} <span class="text-gray-400 font-normal">| G:${p.grupo || '-'}</span></h3>
                    <div class="flex items-center gap-2">
                        <button onclick="toggleEstado(${p.id})" class="badge ${p.aprobado ? 'badge-success' : 'badge-error'} text-white font-bold text-[10px]">${p.aprobado ? 'APROBADO' : 'PENDIENTE'}</button>
                        <button onclick="eliminarParticipacion(${p.id})" class="text-red-400 hover:text-red-600 font-black text-lg p-1">✕</button>
                    </div>
                </div>
                <div onclick="abrirEditor(${p.id})" class="text-xs text-gray-500 cursor-pointer">
                    <p><b>Técnico:</b> ${p.tecnico || 'N/A'} | <b>Asistente:</b> ${p.asistente || 'N/A'}</p>
                    <p class="font-bold text-gray-700 mt-2">👥 Nómina (${insc.length}):</p>
                    <ul class="text-[10px] text-gray-400 mt-1 list-disc pl-4">${listaNombres || '<li>Sin jugadores</li>'}</ul>
                </div>
            </div>
        `;
    });
};

// --- GESTIÓN DE JUGADORES (EDITAR) ---
window.abrirEditor = (id) => {
    window.currentParticipacionId = id;
    const data = getAppData();
    const p = data.participaciones.find(x => x.id === id);
    document.getElementById('editTecnico').value = p.tecnico || '';
    document.getElementById('editAsistente').value = p.asistente || '';
    actualizarSelectCapitan(id, data);
    renderizarListaJugadoresModal(id, data);
    document.getElementById('modalEditor').showModal();
};

function actualizarSelectCapitan(id, data) {
    const select = document.getElementById('editCapitan');
    select.innerHTML = '<option value="">Sin capitán asignado</option>';
    data.inscripciones.filter(i => i.id_participacion === id).forEach(ins => {
        const j = data.jugadores.find(jug => jug.id === ins.id_jugador);
        if (j) select.innerHTML += `<option value="${j.id}" ${data.participaciones.find(p => p.id === id).id_capitan === j.id ? 'selected' : ''}>${escHTML(j.nombre)}</option>`;
    });
}

function renderizarListaJugadoresModal(partId, data) {
    document.getElementById('listaJugadoresEditar').innerHTML = data.inscripciones.filter(i => i.id_participacion === partId).map(ins => {
        const j = data.jugadores.find(jug => jug.id === ins.id_jugador);
        const pendiente = j?.estado === 'PENDIENTE' ? '<span class="badge badge-warning badge-xs text-white ml-1">Pendiente</span>' : '';
        return `<div class="flex justify-between items-center bg-gray-50 p-2 rounded text-xs font-bold border">
                    <span>#${ins.numero_camiseta} - ${j?.nombre || 'Desconocido'} ${pendiente}</span>
                    <button onclick="window.eliminarjugador(${ins.id})" class="text-red-500 font-black px-1 hover:text-red-700">✕</button>
                </div>`;
    }).join('');
}

window.toggleEstado = (id) => {
    event.stopPropagation();
    let data = getAppData();
    let p = data.participaciones.find(x => x.id === id);
    if (p) { p.aprobado = !p.aprobado; guardarAppData(data); initDetalle(); }
};

window.eliminarjugador = (insId) => {
    if (!confirm("¿Eliminar a este jugador de la participación?")) return;

    let data = getAppData();
    data.inscripciones = data.inscripciones.filter(i => i.id !== insId);
    guardarAppData(data);

    const dataActualizada = getAppData();
    renderizarListaJugadoresModal(window.currentParticipacionId, dataActualizada);
    actualizarSelectCapitan(window.currentParticipacionId, dataActualizada);
    initDetalle();
};

window.guardarCambios = (id) => {
    let data = getAppData();
    const p = data.participaciones.find(x => x.id === id);
    p.tecnico = document.getElementById('editTecnico').value;
    p.asistente = document.getElementById('editAsistente').value;
    p.id_capitan = parseInt(document.getElementById('editCapitan').value) || null;
    guardarAppData(data);
    document.getElementById('modalEditor').close();
    initDetalle();
};

// --- BUSCADOR: agregar jugador YA APROBADO y ELEGIBLE según su categoría ---
window.manejarBusquedaJugador = (e) => {
    const texto = e.target.value.toLowerCase().trim();
    const lista = document.getElementById('listaSugerenciasJugador');
    const data = getAppData();

    if (texto.length < 2) { lista.classList.add('hidden'); return; }

    const participacionActual = data.participaciones.find(p => p.id === window.currentParticipacionId);
    if (!participacionActual) return;

    const coincidencias = data.jugadores.filter(j => {
        const coincideNombre = j.nombre.toLowerCase().includes(texto);
        const esElegible = window.Elegibilidad.jugadorEsElegible(data, j, participacionActual.id_categoria_torneo);
        const yaInscrito = data.inscripciones.some(ins => ins.id_participacion === window.currentParticipacionId && ins.id_jugador === j.id);
        // FIX: que no esté ya jugando esta MISMA categoría/rama con otro equipo.
        const yaEnOtroEquipoMismaCatRama = window.Elegibilidad.jugadorYaEnCategoriaRama(data, j.id, participacionActual.id_categoria_torneo, participacionActual.id_rama, window.currentParticipacionId);
        return coincideNombre && esElegible && !yaInscrito && !yaEnOtroEquipoMismaCatRama;
    }).slice(0, 8);

    lista.innerHTML = coincidencias.length > 0
        ? coincidencias.map(j => {
            const catNombre = data.categoriasJugador.find(c => c.id === j.id_categoria_jugador)?.nombre || 'N/A';
            return `<div class="suggestion-item p-2 text-xs font-bold hover:bg-blue-50 cursor-pointer flex justify-between items-center" data-id="${j.id}" data-nombre="${escHTML(j.nombre)}">
                <span>${escHTML(j.nombre)}</span>
                <span class="badge badge-xs badge-ghost text-[9px]">${catNombre}</span>
            </div>`;
        }).join('')
        : `<div class="p-2 text-xs text-gray-400 italic">Sin jugadores aptos disponibles</div>`;

    lista.classList.remove('hidden');
};

window.manejarClickSugerencia = (evento) => {
    const item = evento.target.closest('.suggestion-item');
    if (!item) return;

    window.jugadorSeleccionadoParaAgregar = parseInt(item.dataset.id);
    document.getElementById('inputBuscarJugador').value = item.dataset.nombre;
    document.getElementById('listaSugerenciasJugador').classList.add('hidden');

    const msj = document.getElementById('msjJugadorSeleccionado');
    if (msj) {
        msj.textContent = `✓ Seleccionado: ${item.dataset.nombre}.`;
        msj.classList.remove('hidden');
    }
};

window.agregarJugadorConfirmado = () => {
    const idParticipacion = window.currentParticipacionId;
    if (!idParticipacion) return;

    if (!window.jugadorSeleccionadoParaAgregar) {
        alert("Busca y selecciona un jugador apto de la lista.");
        return;
    }

    const inputCamiseta = document.getElementById('inputCamisetaNuevo');
    const numeroCamiseta = parseInt(inputCamiseta?.value);

    if (isNaN(numeroCamiseta) || numeroCamiseta < 0) {
        alert("Ingresa un número de camiseta válido.");
        return;
    }

    const data = getAppData();

    const participacionDestino = data.participaciones.find(p => p.id === idParticipacion);
    const conflicto = window.Elegibilidad.equipoConflictoCategoriaRama(data, window.jugadorSeleccionadoParaAgregar, participacionDestino.id_categoria_torneo, participacionDestino.id_rama, idParticipacion);
    if (conflicto) {
        alert(`Este jugador ya está inscrito con "${conflicto}" en esta misma categoría y rama. No puede jugar dos veces el mismo cuadro.`);
        return;
    }

    const numeroOcupado = data.inscripciones.some(i =>
        i.id_participacion === idParticipacion && i.numero_camiseta === numeroCamiseta
    );
    if (numeroOcupado) {
        alert(`El número #${numeroCamiseta} ya está ocupado.`);
        return;
    }

    data.inscripciones.push({
        id: window.genId ? window.genId() : Date.now(),
        id_jugador: window.jugadorSeleccionadoParaAgregar,
        id_participacion: idParticipacion,
        numero_camiseta: numeroCamiseta
    });

    guardarAppData(data);

    window.jugadorSeleccionadoParaAgregar = null;
    document.getElementById('inputBuscarJugador').value = '';
    document.getElementById('inputCamisetaNuevo').value = '';
    document.getElementById('msjJugadorSeleccionado')?.classList.add('hidden');

    renderizarListaJugadoresModal(idParticipacion, data);
    actualizarSelectCapitan(idParticipacion, data);
    initDetalle();
};

window.eliminarParticipacion = (idParticipacion) => {
    event.stopPropagation();
    if (!confirm("¿Estás seguro de borrar esta participación?")) return;

    let data = getAppData();
    data.participaciones = data.participaciones.filter(p => p.id !== idParticipacion);
    data.inscripciones = data.inscripciones.filter(i => i.id_participacion !== idParticipacion);

    guardarAppData(data);
    initDetalle();
};

function logout() {
    localStorage.removeItem("session_admin");
    localStorage.removeItem("session_delegado_id");
    localStorage.removeItem("session_equipo_id");
    window.location.href = "../../index.html";
}