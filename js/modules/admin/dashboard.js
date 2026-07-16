/**
 * dashboard.js
 * Usa window.AppDB para que sembrarDatosPorDefecto() se ejecute y los
 * contadores reflejen siempre el estado real del torneo.
 */

document.addEventListener('DOMContentLoaded', () => {
    const data = window.AppDB.get();
    if (!data) return;

    const partidos = data.partidos || [];
    document.getElementById('stat-equipos').innerText   = data.equipos?.length || 0;
    document.getElementById('stat-jugados').innerText   = partidos.filter(p => normEstado(p.estado) === 'FINALIZADO').length;
    document.getElementById('stat-pendientes').innerText = partidos.filter(p => normEstado(p.estado) === 'PROGRAMADO').length;
    document.getElementById('stat-jugadores').innerText  = data.jugadores?.length || 0;

    const proxContainer = document.getElementById('proximo-partido');
    const proximo = partidos
        .filter(p => normEstado(p.estado) === 'PROGRAMADO')
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))[0];

    if (proximo) {
        const getNombre = (idPart) => {
            const part = data.participaciones.find(p => p.id === idPart);
            return data.equipos.find(e => e.id === part?.id_equipo)?.nombre || 'Desconocido';
        };
        proxContainer.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="bg-blue-100 p-3 rounded-lg text-blue-700 font-black text-center">
                    ${proximo.fecha.split('-')[2]}<br>
                    <span class="text-xs">${proximo.fecha.split('-')[1]}</span>
                </div>
                <div>
                    <p class="text-lg font-bold">${escHTML(getNombre(proximo.id_local_participacion))} vs ${escHTML(getNombre(proximo.id_visitante_participacion))}</p>
                    <p class="text-sm text-gray-500">${proximo.hora} | ${escHTML(proximo.ubicacion || '')}</p>
                </div>
            </div>`;
    } else {
        proxContainer.innerText = 'No hay partidos programados';
    }
});

function normEstado(e) { return String(e || '').toUpperCase().trim(); }

/** Escapa caracteres HTML para prevenir XSS al insertar datos en innerHTML */
function escHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function logout() {
    localStorage.removeItem('session_admin');
    localStorage.removeItem('session_delegado_id');
    localStorage.removeItem('session_equipo_id');
    window.location.href = '../../index.html';
}
