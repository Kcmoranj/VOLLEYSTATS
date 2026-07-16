/**
 * estadisticas-partido.js
 * Módulo para la vista de detalle de un partido específico.
 * Extrae la lógica que antes vivía inline en estadisticas-partido.html.
 */

document.addEventListener('DOMContentLoaded', () => {
    const data = window.AppDB
        ? window.AppDB.get()
        : (JSON.parse(localStorage.getItem('volleyData')) || window.VolleyAppData);

    if (!data) return;

    const urlParams  = new URLSearchParams(window.location.search);
    const idPartido  = parseInt(urlParams.get('id'));
    const partido    = data.partidos?.find(p => p.id === idPartido);
    if (!partido) return;

    const localPart  = data.participaciones?.find(p => p.id === partido.id_local_participacion);
    const visitPart  = data.participaciones?.find(p => p.id === partido.id_visitante_participacion);
    const eqLocal    = data.equipos?.find(e => e.id === localPart?.id_equipo);
    const eqVisit    = data.equipos?.find(e => e.id === visitPart?.id_equipo);

    const escapeHtml = str => String(str || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

    document.getElementById('partidoInfo').innerHTML = `
        <div class="flex justify-center items-center gap-4 w-full">
            <div class="flex items-center gap-3 text-2xl font-black text-gray-900 justify-end flex-1">
                <span class="text-3xl">🛡️</span>
                <span class="truncate">${escapeHtml(eqLocal?.nombre || '---')}</span>
            </div>
            <div class="text-blue-500 font-black text-xl px-6">VS</div>
            <div class="flex items-center gap-3 text-2xl font-black text-gray-900 justify-start flex-1">
                <span class="truncate">${escapeHtml(eqVisit?.nombre || '---')}</span>
                <span class="text-3xl">🛡️</span>
            </div>
        </div>
        <p class="text-gray-500 font-medium mt-6 text-sm">
            📅 ${escapeHtml(partido.fecha || '--/--')} &nbsp;•&nbsp; 📍 ${escapeHtml(partido.ubicacion || 'Sin asignar')}
        </p>`;

    const stats = (data.estadisticasJugador || [])
        .filter(s => s.id_partido === idPartido)
        .sort((a, b) => (b.puntos || 0) - (a.puntos || 0));

    const medallas = ['🥇', '🥈', '🥉'];

    document.getElementById('tablaJugadores').innerHTML = stats.map((s, index) => {
        const ins  = data.inscripciones?.find(i => i.id === s.id_inscripcion);
        const jug  = data.jugadores?.find(j => j.id === ins?.id_jugador);
        const nombre = escapeHtml(jug?.nombre || 'Jugador');
        const puesto = index < 3
            ? `<span class="text-xl">${medallas[index]}</span>`
            : `<span class="text-gray-400 font-black text-sm w-8 text-center block">${index + 1}</span>`;

        return `
        <tr class="border-t border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="py-4 flex items-center gap-4">
                <div class="w-8 flex justify-center">${puesto}</div>
                <div class="bg-blue-50 text-blue-500 w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0">👤</div>
                <span class="font-bold text-gray-800 truncate">${(window.escapeHtml ? window.escapeHtml(nombre) : (nombre || ''))}</span>
            </td>
            <td class="text-center font-semibold text-slate-700 bg-gray-50/30">${s.puntos || 0}</td>
            <td class="text-center text-gray-600">${s.ataque || 0}</td>
            <td class="text-center text-gray-600">${s.bloqueo || 0}</td>
            <td class="text-center text-gray-600">${s.saque || 0}</td>
            <td class="text-center text-gray-600">${s.defensa || 0}</td>
            <td class="text-center text-gray-600">${s.colocacion || 0}</td>
        </tr>`;
    }).join('');
});

function logout() {
    localStorage.removeItem('session_admin');
    localStorage.removeItem('session_delegado_id');
    localStorage.removeItem('session_equipo_id');
    window.location.href = '../index.html';
}
