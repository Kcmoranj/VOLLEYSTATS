/** Escapa HTML para prevenir XSS al insertar datos de usuario en innerHTML */
function escHTML(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
document.addEventListener('DOMContentLoaded', () => {
    const data = window.AppDB ? window.AppDB.get() : (JSON.parse(localStorage.getItem('volleyData')) || window.VolleyAppData);

    if (!data) {
        console.error("No se pudieron cargar los datos.");
        return;
    }

    const grid = document.getElementById('gridJugadores');
    const inputBuscar = document.getElementById('inputBuscarJugador');
    const pNombre = document.getElementById('perfil_nombre');
    const pCategoria = document.getElementById('perfil_categoria');
    const pInscripciones = document.getElementById('perfil_inscripciones');

    window.renderJugadores = (filtro = "") => {
        if (!grid) return;
        grid.innerHTML = "";

        const jugadoresFiltrados = data.jugadores
            .filter(j => j.estado === 'APROBADO') // los pendientes de aprobación no se muestran al público
            .filter(j => j.nombre.toLowerCase().includes(filtro.toLowerCase()));

        jugadoresFiltrados.forEach(j => {
            const catJugador = data.categoriasJugador.find(c => c.id === j.id_categoria_jugador);

            grid.innerHTML += `
            <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="avatar placeholder">
                        <div class="bg-slate-100 text-slate-400 rounded-full w-12 flex items-center justify-center">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"></path></svg>
                        </div>
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-800 text-sm leading-tight">${escHTML(j.nombre)}</h4>
                        <span class="badge badge-ghost badge-sm font-bold text-blue-600 mt-1">${catJugador?.nombre || 'Sin categoría'}</span>
                    </div>
                </div>
                <label for="modal_perfil" onclick="verPerfilJugador(${j.id})" class="btn btn-primary btn-sm rounded-lg text-white font-bold cursor-pointer">
                    Ver Perfil
                </label>
            </div>`;
        });
    };

    window.verPerfilJugador = (id) => {
        const jugador = data.jugadores.find(j => j.id === id);
        if (!jugador) return;

        const catJugador = data.categoriasJugador.find(c => c.id === jugador.id_categoria_jugador);

        if (pNombre) pNombre.innerText = jugador.nombre;
        if (pCategoria) pCategoria.innerText = `Categoría del Jugador: ${catJugador?.nombre || '-'}`;

        const inscripciones = data.inscripciones.filter(i => i.id_jugador === id);
        if (!pInscripciones) return;
        pInscripciones.innerHTML = "";

        if (inscripciones.length === 0) {
            pInscripciones.innerHTML = `<p class="text-gray-400 text-center text-sm italic">Sin inscripciones activas.</p>`;
        } else {
            inscripciones.forEach(ins => {
                const participacion = data.participaciones.find(p => p.id === ins.id_participacion);

                const eq = data.equipos.find(e => e.id === participacion?.id_equipo);
                const rama = data.ramas.find(r => r.id === participacion?.id_rama);
                const catTorneo = data.categoriasTorneo.find(ct => ct.id === participacion?.id_categoria_torneo);

                pInscripciones.innerHTML += `
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center mb-2">
                    <div>
                        <p class="font-bold text-gray-800 text-sm">${eq?.nombre || 'Sin equipo'}</p>
                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">
                            ${catTorneo?.nombre || '-'} • ${rama?.nombre || '-'}
                        </p>
                    </div>
                    <div class="text-center">
                        <p class="text-[10px] text-gray-400 font-bold uppercase">Camiseta</p>
                        <p class="text-xl font-black text-blue-600 leading-none mt-1">#${ins.numero_camiseta}</p>
                    </div>
                </div>`;
            });
        }

        // Historial de partidos jugados
        const elHistorial = document.getElementById('perfil_historial');
        if (!elHistorial) return;

        const historial = window.Sanciones ? window.Sanciones.historialPartidosJugador(id) : [];

        if (historial.length === 0) {
            elHistorial.innerHTML = `<p class="text-gray-400 text-center text-sm italic">Sin partidos registrados.</p>`;
        } else {
            const totales = historial.reduce((acc, h) => ({
                puntos: acc.puntos + h.stats.puntos,
                victorias: acc.victorias + (h.gano ? 1 : 0),
                amarillas: acc.amarillas + h.tarjetas.filter(t => t.tipo === 'AMARILLA').length,
                rojas: acc.rojas + h.tarjetas.filter(t => t.tipo === 'ROJA').length
            }), { puntos: 0, victorias: 0, amarillas: 0, rojas: 0 });

            elHistorial.innerHTML = `
                <div class="grid grid-cols-3 gap-2 mb-4">
                    <div class="bg-blue-50 rounded-xl p-3 text-center">
                        <p class="text-2xl font-black text-blue-600">${historial.length}</p>
                        <p class="text-[10px] text-gray-400 font-bold uppercase">Partidos</p>
                    </div>
                    <div class="bg-green-50 rounded-xl p-3 text-center">
                        <p class="text-2xl font-black text-green-600">${totales.victorias}</p>
                        <p class="text-[10px] text-gray-400 font-bold uppercase">Victorias</p>
                    </div>
                    <div class="bg-purple-50 rounded-xl p-3 text-center">
                        <p class="text-2xl font-black text-purple-600">${totales.puntos}</p>
                        <p class="text-[10px] text-gray-400 font-bold uppercase">Pts Total</p>
                    </div>
                </div>
                ${(totales.amarillas > 0 || totales.rojas > 0) ? `
                <div class="flex gap-2 mb-4">
                    ${totales.amarillas > 0 ? `<span class="badge badge-warning text-white font-bold text-xs">🟨 ${totales.amarillas} amarilla${totales.amarillas > 1 ? 's' : ''}</span>` : ''}
                    ${totales.rojas > 0 ? `<span class="badge badge-error text-white font-bold text-xs">🟥 ${totales.rojas} roja${totales.rojas > 1 ? 's' : ''}</span>` : ''}
                </div>` : ''}
                <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
                ${historial.map(h => {
                    const resBadge = h.gano
                        ? `<span class="badge badge-success badge-xs text-white font-bold">W</span>`
                        : `<span class="badge badge-error badge-xs text-white font-bold">L</span>`;
                    const tarjetasBadges = [
                        ...h.tarjetas.filter(t => t.tipo === 'AMARILLA').map(() => '🟨'),
                        ...h.tarjetas.filter(t => t.tipo === 'ROJA').map(() => '🟥')
                    ].join('');
                    return `
                    <div class="bg-gray-50 rounded-lg px-3 py-2 text-xs border border-gray-100">
                        <div class="flex justify-between items-center">
                            <div>
                                <span class="font-black text-gray-700">vs ${h.rival}</span>
                                <span class="text-gray-400 ml-1">(${h.esLocal ? 'Local' : 'Visita'})</span>
                                ${tarjetasBadges ? `<span class="ml-1">${tarjetasBadges}</span>` : ''}
                            </div>
                            <div class="flex items-center gap-2">
                                ${resBadge}
                                <span class="font-black text-gray-500 text-[10px]">${h.resultado}</span>
                            </div>
                        </div>
                        <div class="flex gap-3 mt-1 text-[10px] text-gray-400 font-bold">
                            <span>${h.partido.fecha}</span>
                            <span>${h.categoria} · ${h.rama}</span>
                            <span class="text-blue-600">${h.stats.puntos}pts</span>
                        </div>
                    </div>`;
                }).join('')}
                </div>`;
        }
    };

    inputBuscar?.addEventListener('input', (e) => renderJugadores(e.target.value));
    renderJugadores();
});