/**
 * equipos.js — Vista pública de equipos.
 * El estado "habilitado/inhabilitado" vive en participacion.aprobado,
 * no en equipo.pago_estado (campo que nunca existió en el schema).
 * Un equipo se considera habilitado si TODAS sus participaciones están aprobadas.
 * Usa window.AppDB para heredar sembrarDatosPorDefecto().
 */

document.addEventListener('DOMContentLoaded', () => {
    renderEquipos();
});

function escHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function equipoHabilitado(data, idEquipo) {
    const parts = data.participaciones.filter(p => p.id_equipo === idEquipo);
    return parts.length > 0 && parts.every(p => p.aprobado);
}

function renderEquipos() {
    const data = window.AppDB ? window.AppDB.get() : (JSON.parse(localStorage.getItem('volleyData')) || window.VolleyAppData);
    const tbody = document.getElementById('tablaEquipos');
    if (!tbody) return;

    tbody.innerHTML = data.equipos.map(e => {
        const habilitado = equipoHabilitado(data, e.id);
        return `
        <tr class="hover:bg-gray-50 cursor-pointer" onclick="abrirDetalle(${e.id})">
            <td class="font-bold">${escHTML(e.nombre)}</td>
            <td>${habilitado ? '✅ Habilitado' : '❌ Inhabilitado'}</td>
            <td><button class="btn btn-xs btn-outline">Ver</button></td>
        </tr>`;
    }).join('');
}

window.abrirDetalle = (id) => {
    const data = window.AppDB ? window.AppDB.get() : (JSON.parse(localStorage.getItem('volleyData')) || window.VolleyAppData);
    const e = data.equipos.find(x => x.id === id);
    if (!e) return;

    document.getElementById('nombreEquipo').textContent = e.nombre;
    const btn = document.getElementById('btnPago');
    const habilitado = equipoHabilitado(data, id);
    btn.className = `btn btn-sm w-full mb-6 text-white ${habilitado ? 'btn-success' : 'btn-error'}`;
    btn.textContent = habilitado ? 'Habilitado' : 'Inhabilitado';
    btn.dataset.id = e.id;

    const idsParticipaciones = data.participaciones.filter(p => p.id_equipo === e.id).map(p => p.id);
    const jugadores = data.inscripciones
        .filter(ins => idsParticipaciones.includes(ins.id_participacion))
        .map(ins => escHTML(data.jugadores.find(j => j.id === ins.id_jugador)?.nombre || 'Desconocido'));

    document.getElementById('listaJugadoresEquipo').innerHTML = jugadores
        .map(n => `<li class="p-2 bg-gray-50 rounded text-sm font-medium">${n}</li>`).join('');

    document.getElementById('modalDetalle').showModal();
};

window.togglePago = () => {
    const id = parseInt(document.getElementById('btnPago').dataset.id);
    const data = window.AppDB ? window.AppDB.get() : (JSON.parse(localStorage.getItem('volleyData')) || window.VolleyAppData);
    // Togglear todas las participaciones del equipo
    data.participaciones.filter(p => p.id_equipo === id).forEach(p => {
        p.aprobado = !equipoHabilitado(data, id);
    });
    if (window.AppDB) window.AppDB.save(data);
    else localStorage.setItem('volleyData', JSON.stringify(data));
    renderEquipos();
    abrirDetalle(id);
};

function logout() {
    localStorage.removeItem('session_admin');
    localStorage.removeItem('session_delegado_id');
    localStorage.removeItem('session_equipo_id');
    window.location.href = '../index.html';
}