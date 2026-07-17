// 1. VARIABLE GLOBAL DE DATOS UNIFICADOS
let data = null;

const inicializarDatos = () => {
    data = window.AppDB.get();
};

// 2. Funciones Globales (para que el HTML las pueda ejecutar)
window.renderTarjetas = () => {
    // Asegurar que los datos estén cargados/actualizados antes de renderizar
    if (!data) inicializarDatos();

    const grid = document.getElementById('gridCategorias');
    const contenedor = document.getElementById('contenedorEstadisticas');
    
    // Limpiar y restaurar vista
    contenedor.innerHTML = "";
    grid.innerHTML = "";
    grid.classList.remove('hidden');

    if (!data || !data.categoriasTorneo || !data.ramas) {
        grid.innerHTML = `<p class="text-red-500 p-4">Error: Estructura de datos no disponible.</p>`;
        return;
    }

    data.categoriasTorneo.forEach(ct => {
        data.ramas.forEach(r => {
            grid.innerHTML += `
            <div onclick="verRanking(${ct.id}, ${r.id})" class="bg-white p-4 rounded-xl border shadow-sm hover:shadow-md cursor-pointer flex justify-between items-center transition-all">
                <span class="font-bold text-gray-800">${ct.nombre} ${r.nombre.toUpperCase()}</span>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"></path></svg>
            </div>`;
        });
    });
};

window.verRanking = (catId, ramaId) => {
    const grid = document.getElementById('gridCategorias');
    const contenedor = document.getElementById('contenedorEstadisticas');
    
    // 1. Verificación defensiva usando la fuente unificada
    if (!data || !data.estadisticasJugador) {
        console.error("Los datos unificados de VolleyAppData no están cargados.");
        contenedor.innerHTML = `<p class="text-red-500">Error: Datos no cargados.</p>`;
        return;
    }

    grid.classList.add('hidden');

    // 2. Filtro seguro usando el set de datos unificado y encadenamiento opcional
    const statsFiltradas = data.estadisticasJugador.filter(s => {
        const insc = data.inscripciones?.find(i => i.id === s.id_inscripcion);
        const part = data.participaciones?.find(p => p.id === insc?.id_participacion);
        return part && part.id_categoria_torneo === catId && part.id_rama === ramaId;
    });

    // 3. Renderizado de tabla
    contenedor.innerHTML = `
        <button onclick="renderTarjetas()" class="btn btn-sm mb-4">← Volver a categorías</button>
        <div class="bg-white p-4 rounded-xl border shadow-sm">
            <table class="table w-full text-sm">
                <thead>
                    <tr class="text-gray-400 uppercase text-[10px]">
                        <th class="pb-2 text-left">Jugador</th>
                        <th class="pb-2 text-left">Equipo</th>
                        <th class="pb-2 text-center">Puntos</th>
                    </tr>
                </thead>
                <tbody>
                    ${statsFiltradas.length > 0 ? statsFiltradas.map(s => {
                        const insc = data.inscripciones?.find(i => i.id === s.id_inscripcion);
                        const jug = data.jugadores?.find(j => j.id === insc?.id_jugador);
                        const part = data.participaciones?.find(p => p.id === insc?.id_participacion);
                        const eq = data.equipos?.find(e => e.id === part?.id_equipo);
                        return `
                            <tr class="border-t border-gray-50 hover:bg-gray-50/50">
                                <td class="py-2.5 font-bold text-gray-800">${jug?.nombre || '---'}</td>
                                <td class="py-2.5 text-gray-600">${eq?.nombre || '---'}</td>
                                <td class="py-2.5 font-black text-blue-600 text-center">${s.puntos || 0}</td>
                            </tr>
                        `;
                    }).join('') : '<tr><td colspan="3" class="text-center italic py-4 text-gray-400">Sin estadísticas en esta categoría.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
};

// 3. Inicialización controlada
document.addEventListener('DOMContentLoaded', () => {
    inicializarDatos();
    window.renderTarjetas();
});

// logout: window.logout('../index.html') — definido en js/shared/data-bridge.js