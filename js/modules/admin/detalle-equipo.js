/** Escapa HTML para prevenir XSS al insertar datos de usuario en innerHTML */
function escHTML(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const getAppData = () => {
    const localData = localStorage.getItem('volleyData');
    return localData ? JSON.parse(localData) : window.VolleyAppData;
};

const guardarAppData = (data) => window.AppDB
    ? window.AppDB.save(data)
    : localStorage.setItem('volleyData', JSON.stringify(data));

document.addEventListener('DOMContentLoaded', () => {
    initDetalle();
    
    // Eventos del buscador de jugadores
    document.getElementById('inputBuscarJugador')?.addEventListener('input', manejarBusquedaJugador);
    document.getElementById('listaSugerenciasJugador')?.addEventListener('click', manejarClickSugerencia);
    document.getElementById('btnAgregarConfirmado')?.addEventListener('click', agregarJugadorConfirmado);

    const btnGuardar = document.getElementById('btnGuardarModal');
    if (btnGuardar) {
        btnGuardar.onclick = () => {
            guardarCambios(window.currentParticipacionId);
        };
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

    data.participaciones.filter(p => p.id_equipo === idEquipo).forEach(p => {
        const cat = data.categoriasTorneo.find(c => c.id === p.id_categoria_torneo)?.nombre || 'N/A';
        const rama = data.ramas.find(r => r.id === p.id_rama)?.nombre || 'N/A';
        const insc = data.inscripciones.filter(i => i.id_participacion === p.id);
        const listaNombres = insc.map(i => {
            const j = data.jugadores.find(jug => jug.id === i.id_jugador);
            return j ? `<li class="truncate">${escHTML(j.nombre)} (#${i.numero_camiseta})</li>` : '';
        }).join('');

        container.innerHTML += `
            <div class="card-admin border-l-4 bg-white hover:shadow-lg transition-all ${p.aprobado ? 'border-l-green-500' : 'border-l-red-500'}">
                <div class="flex justify-between items-center mb-2">
                    <h3 onclick="abrirEditor(${p.id})" class="font-black text-blue-600 uppercase cursor-pointer">${cat} - ${rama} <span class="text-gray-400 font-normal">| G:${p.grupo || '-'}</span></h3>
                    <div class="flex items-center gap-2">
                        <button onclick="toggleEstado(${p.id})" class="badge ${p.aprobado ? 'badge-success' : 'badge-error'} text-white font-bold text-[10px]">${p.aprobado ? 'APROBADO' : 'INHABILITADO'}</button>
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

// --- GESTIÓN DE MODAL PARTICIPACIÓN ---
window.prepararYAbrirModal = () => {
    const data = getAppData();
    const catSelect = document.getElementById('selectNuevaCat');
    const ramaSelect = document.getElementById('selectNuevaRama');

    if (catSelect) {
        catSelect.innerHTML = data.categoriasTorneo.map(c => 
            `<option value="${c.id}">${c.nombre}</option>`
        ).join('');
    }
    
    if (ramaSelect) {
        ramaSelect.innerHTML = data.ramas.map(r => 
            `<option value="${r.id}">${r.nombre}</option>`
        ).join('');
    }

    document.getElementById('modalNuevaPart').showModal();
};

window.confirmarNuevaParticipacion = () => {
    const data = getAppData();
    const idEquipo = parseInt(new URLSearchParams(window.location.search).get('id'));
    
    const catId = parseInt(document.getElementById('selectNuevaCat').value);
    const ramaId = parseInt(document.getElementById('selectNuevaRama').value);
    const grupo = document.getElementById('inputNuevoGrupo').value.trim().toUpperCase();

    if (!grupo) return alert("Ingresa un grupo (ej: A)");

    const existe = data.participaciones.some(p => 
        p.id_equipo === idEquipo && 
        p.id_categoria_torneo === catId && 
        p.id_rama === ramaId
    );

    if (existe) {
        alert("Ya existe una participación para esta categoría y rama en este equipo.");
        return;
    }

    const nuevaParticipacion = {
        id: window.genId ? window.genId() : Date.now(),
        id_equipo: idEquipo,
        id_categoria_torneo: catId,
        id_rama: ramaId,
        grupo: grupo,
        tecnico: document.getElementById('inputNuevoTecnico').value,
        asistente: document.getElementById('inputNuevoAsistente').value,
        aprobado: false,
        id_capitan: null
    };

    data.participaciones.push(nuevaParticipacion);
    guardarAppData(data);
    
    document.getElementById('modalNuevaPart').close();
    initDetalle();
    abrirEditor(nuevaParticipacion.id);
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
        if (j) select.innerHTML += `<option value="${j.id}" ${data.participaciones.find(p=>p.id===id).id_capitan === j.id ? 'selected' : ''}>${escHTML(j.nombre)}</option>`;
    });
}

function renderizarListaJugadoresModal(partId, data) {
    document.getElementById('listaJugadoresEditar').innerHTML = data.inscripciones.filter(i => i.id_participacion === partId).map(ins => {
        const j = data.jugadores.find(jug => jug.id === ins.id_jugador);
        return `<div class="flex justify-between items-center bg-gray-50 p-2 rounded text-xs font-bold border">
                    <span>#${ins.numero_camiseta} - ${j?.nombre || 'Desconocido'}</span>
                    <button onclick="window.eliminarjugador(${ins.id})" class="text-red-500 font-black px-1 hover:text-red-700">✕</button>
                </div>`;
    }).join('');
}

window.toggleEstado = (id) => {
    event.stopPropagation();
    let data = getAppData();
    let p = data.participaciones.find(x => x.id === id);
    if(p) { p.aprobado = !p.aprobado; guardarAppData(data); initDetalle(); }
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
// FIX: antes esto calculaba la elegibilidad "a mano" llamando a funciones
// (obtenerNombreCategoria / obtenerNombreTorneo) que no existían. Ahora se
// delega por completo en window.Elegibilidad, la misma fuente que usa el
// portal de delegados, para que ambos lados apliquen exactamente las mismas
// reglas (Toddler -> todas | C-/C+ -> Cantera+ | B-/B+ -> Semi Pro+ | A-/A+ -> Pro).
window.manejarBusquedaJugador = (e) => {
    const texto = e.target.value.toLowerCase().trim();
    const lista = document.getElementById('listaSugerenciasJugador');
    const data = getAppData();
    
    if (texto.length < 2) { lista.classList.add('hidden'); return; }

    // Obtenemos la participación actual para saber la categoría del torneo
    const participacionActual = data.participaciones.find(p => p.id === window.currentParticipacionId);
    if (!participacionActual) return;

    const idCatTorneo = participacionActual.id_categoria_torneo; // ID de la categoría de esta mesa/participación

    const coincidencias = data.jugadores.filter(j => {
        const coincideNombre = j.nombre.toLowerCase().includes(texto);

        // Elegibilidad real, centralizada en window.Elegibilidad (js/shared/elegibilidad.js)
        const esAptoPorCategoria = window.Elegibilidad
            ? window.Elegibilidad.jugadorEsElegible(data, j, idCatTorneo)
            : false;

        // Que no esté ya inscrito en esta misma participación
        const yaInscrito = data.inscripciones.some(ins => ins.id_participacion === window.currentParticipacionId && ins.id_jugador === j.id);

        return coincideNombre && esAptoPorCategoria && !yaInscrito;
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

    // Validar duplicado de número de camiseta en la misma plantilla
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
    
    // Resetear el buscador
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
    if(!confirm("¿Estás seguro de borrar esta participación?")) return;
    
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