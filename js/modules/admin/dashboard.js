/**
 * dashboard.js - Lógica para estructura relacional
 */

const getAppData = () => JSON.parse(localStorage.getItem('volleyData')) || window.VolleyAppData;

document.addEventListener('DOMContentLoaded', () => {
    const data = getAppData();
    if (!data) return;

    // 1. Widgets
    const partidos = data.partidos || [];
    document.getElementById('stat-equipos').innerText = data.equipos?.length || 0;
    document.getElementById('stat-jugados').innerText = partidos.filter(p => p.estado === 'FINALIZADO').length;
    document.getElementById('stat-pendientes').innerText = partidos.filter(p => p.estado === 'PROGRAMADO').length;
    document.getElementById('stat-jugadores').innerText = data.jugadores?.length || 0;

    // 2. Lógica Próximo Partido
    const proxContainer = document.getElementById('proximo-partido');
    const proximo = partidos
        .filter(p => p.estado === 'PROGRAMADO')
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))[0];

    if (proximo) {
        // Función auxiliar para obtener nombre de equipo desde participacion
        const getNombreEquipo = (idParticipacion) => {
            const part = data.participaciones.find(p => p.id === idParticipacion);
            const eq = data.equipos.find(e => e.id === part?.id_equipo);
            return eq ? eq.nombre : "Equipo Desconocido";
        };

        proxContainer.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="bg-blue-100 p-3 rounded-lg text-blue-700 font-black text-center">
                    ${proximo.fecha.split('-')[2]}<br>
                    <span class="text-xs">${proximo.fecha.split('-')[1]}</span>
                </div>
                <div>
                    <p class="text-lg font-bold">${getNombreEquipo(proximo.id_local_participacion)} vs ${getNombreEquipo(proximo.id_visitante_participacion)}</p>
                    <p class="text-sm text-gray-500"> ${proximo.hora} | ${proximo.ubicacion}</p>
                </div>
            </div>
        `;
    } else {
        proxContainer.innerText = "No hay partidos programados";
    }
});

window.logout = () => {
    localStorage.clear();
    window.location.href = "../../index.html";
};