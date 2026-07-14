/**
 * admin.js - Módulo de Administración de VolleyStats
 * Permite gestionar partidos y estados de forma persistente.
 */

// 1. Cargar datos: intenta leer localStorage primero, si no, usa el mock original
let appData = JSON.parse(localStorage.getItem('volleyData')) || window.VolleyAppData;

// 2. Control de pestañas
window.switchTab = function(tabId) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
};

// 3. Renderizar Partidos
function renderPartidos() {
    const contenedor = document.getElementById('gridPartidos');
    if (!contenedor) return;

    contenedor.innerHTML = appData.partidos.map(p => `
        <div class="card-admin">
            <div class="flex justify-between items-start mb-6">
                <div>
                    <span class="text-[10px] font-black text-blue-600 uppercase block">Partido #${p.id}</span>
                    <span class="font-bold text-gray-800 text-lg">${p.fecha} • ${p.hora}</span>
                </div>
                <select class="select select-bordered select-sm font-black text-[10px] uppercase" 
                        onchange="updateEstado(${p.id}, this.value)">
                    <option value="pendiente" ${p.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="en_curso" ${p.estado === 'en_curso' ? 'selected' : ''}>En Curso</option>
                    <option value="finalizado" ${p.estado === 'finalizado' ? 'selected' : ''}>Finalizado</option>
                </select>
            </div>

            <div class="space-y-3">
                ${p.sets.map((set, idx) => `
                    <div class="grid grid-cols-2 gap-4">
                        <input type="number" class="input-custom" placeholder="Local S${idx+1}" 
                               value="${set.local ?? ''}" onchange="updateScore(${p.id}, ${idx}, 'local', this.value)">
                        <input type="number" class="input-custom" placeholder="Visita S${idx+1}" 
                               value="${set.visitante ?? ''}" onchange="updateScore(${p.id}, ${idx}, 'visitante', this.value)">
                    </div>
                `).join('')}
            </div>
            
            <button class="w-full mt-6 btn bg-blue-600 text-white hover:bg-blue-700 border-none rounded-xl font-bold" 
                    onclick="abrirEstadisticasJugador(${p.id})">
                Digitar Estadísticas
            </button>
        </div>
    `).join('');
}

// 4. Funciones de actualización
window.updateScore = (partidoId, setIndex, equipo, valor) => {
    const partido = appData.partidos.find(p => p.id === partidoId);
    if (partido) {
        partido.sets[setIndex][equipo] = parseInt(valor) || 0;
        guardarDatos();
    }
};

window.updateEstado = (partidoId, nuevoEstado) => {
    const partido = appData.partidos.find(p => p.id === partidoId);
    if (partido) {
        partido.estado = nuevoEstado;
        guardarDatos();
    }
};

function guardarDatos() {
    localStorage.setItem('volleyData', JSON.stringify(appData));
    console.log("✅ Cambios guardados en LocalStorage");
}

// 5. Modal y Estadísticas (Preparación)
window.abrirEstadisticasJugador = (partidoId) => {
    const modal = document.getElementById('modalEstadisticas');
    const container = document.getElementById('formEstadisticasIndividuales');
    
    // Aquí filtrarías los jugadores del partido y los inyectarías en el contenedor
    container.innerHTML = `<p class="text-gray-500">Cargando jugadores para el partido ${partidoId}...</p>`;
    
    modal.showModal();
};

// Ejecución inicial
document.addEventListener('DOMContentLoaded', () => {
    renderPartidos();
    // Renderizar lista de jugadores en la pestaña correspondiente si es necesario
    const listaJugadores = document.getElementById('listaJugadores');
    if (listaJugadores) {
        listaJugadores.innerHTML = appData.jugadores.map(j => `
            <tr class="border-b border-gray-100">
                <td class="font-bold">${j.id}</td>
                <td class="uppercase">${j.nombre}</td>
                <td><button class="btn btn-xs btn-ghost">Editar</button></td>
            </tr>
        `).join('');
    }
});