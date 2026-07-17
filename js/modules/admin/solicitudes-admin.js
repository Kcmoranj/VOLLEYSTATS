document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    renderSolicitudesEquipos();
    renderSolicitudesJugadores();
});

function nombreEquipoDeParticipacion(data, p) {
    return data.equipos.find(e => e.id === p.id_equipo)?.nombre || '-';
}

// --- 1. Participaciones (equipos/categorías) pendientes de aprobación ---
function renderSolicitudesEquipos() {
    const data = window.AppDB.get();
    const cont = document.getElementById('listaSolicitudesEquipos');
    const pendientes = data.participaciones.filter(p => !p.aprobado);

    if (pendientes.length === 0) {
        cont.innerHTML = `<p class="text-center text-gray-400 font-semibold py-6">No hay equipos pendientes de aprobación.</p>`;
        return;
    }

    cont.innerHTML = pendientes.map(p => {
        const cat = data.categoriasTorneo.find(c => c.id === p.id_categoria_torneo)?.nombre || '-';
        const rama = data.ramas.find(r => r.id === p.id_rama)?.nombre || '-';
        const roster = data.inscripciones.filter(i => i.id_participacion === p.id);

        return `
        <div class="card-admin flex justify-between items-center">
            <div>
                <p class="font-black text-gray-900">${nombreEquipoDeParticipacion(data, p)}</p>
                <p class="text-xs text-gray-400 font-bold uppercase">${cat} · ${rama} · ${roster.length} jugadores en plantel</p>
            </div>
            <button onclick="aprobarParticipacion(${p.id})" class="btn btn-sm btn-success text-white font-bold">✅ Aprobar equipo</button>
        </div>`;
    }).join('');
}

function aprobarParticipacion(idParticipacion) {
    const data = window.AppDB.get();
    const p = data.participaciones.find(x => x.id === idParticipacion);
    if (!p) return;
    p.aprobado = true;
    window.AppDB.save(data);

    if (typeof registrarActividad === 'function') {
        registrarActividad('EQUIPO_APROBADO', `Se aprobó al equipo ${nombreEquipoDeParticipacion(data, p)}`);
    }

    renderSolicitudesEquipos();
}

// --- 2. Jugadores propuestos pendientes: el admin les asigna categoría y los aprueba ---
function renderSolicitudesJugadores() {
    const data = window.AppDB.get();
    const cont = document.getElementById('listaSolicitudesJugadores');
    const pendientes = data.jugadores.filter(j => j.estado === 'PENDIENTE');

    if (pendientes.length === 0) {
        cont.innerHTML = `<p class="text-center text-gray-400 font-semibold py-6">No hay jugadores pendientes de aprobación.</p>`;
        return;
    }

    cont.innerHTML = pendientes.map(j => {
        const ins = data.inscripciones.find(i => i.id_jugador === j.id);
        const part = ins ? data.participaciones.find(p => p.id === ins.id_participacion) : null;
        const equipo = part ? nombreEquipoDeParticipacion(data, part) : '-';

        return `
        <div class="card-admin flex justify-between items-center gap-4">
            <div>
                <p class="font-black text-gray-900">${j.nombre}</p>
                <p class="text-xs text-gray-400 font-bold uppercase">Propuesto por: ${equipo}</p>
            </div>
            <div class="flex items-center gap-2">
                <select id="cat-${j.id}" class="select select-bordered select-sm font-bold">
                    ${data.categoriasJugador.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                </select>
                <button onclick="aprobarJugador(${j.id})" class="btn btn-sm btn-success text-white font-bold">✅ Aprobar</button>
                <button onclick="rechazarJugador(${j.id})" class="btn btn-sm btn-outline text-red-500 font-bold">✕ Rechazar</button>
            </div>
        </div>`;
    }).join('');
}

function aprobarJugador(idJugador) {
    const data = window.AppDB.get();
    const j = data.jugadores.find(x => x.id === idJugador);
    if (!j) return;

    const idCategoria = parseInt(document.getElementById(`cat-${idJugador}`).value);
    j.id_categoria_jugador = idCategoria;
    j.estado = 'APROBADO';

    window.AppDB.save(data);

    if (typeof registrarActividad === 'function') {
        registrarActividad('JUGADOR_APROBADO', `Se aprobó al jugador ${j.nombre}`);
    }

    renderSolicitudesJugadores();
}

function rechazarJugador(idJugador) {
    if (!confirm('¿Rechazar y eliminar a este jugador propuesto? También se quitará de la plantilla del equipo.')) return;
    const data = window.AppDB.get();
    data.inscripciones = data.inscripciones.filter(i => i.id_jugador !== idJugador);
    data.jugadores = data.jugadores.filter(j => j.id !== idJugador);
    window.AppDB.save(data);
    renderSolicitudesJugadores();
}
