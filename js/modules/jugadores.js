

document.addEventListener('DOMContentLoaded', () => {
    const data = window.AppDB.get();
    if (!data) return;

    // Populate nivel filter
    const selNivel = document.getElementById('selectNivel');
    if (selNivel && data.categoriasJugador) {
        data.categoriasJugador.forEach(cat => {
            selNivel.innerHTML += `<option value="${cat.id}">${escHTML(cat.nombre)}</option>`;
        });
    }

    const render = () => {
        const texto   = document.getElementById('inputBuscarJugador')?.value.toLowerCase().trim() || '';
        const nivelId = parseInt(document.getElementById('selectNivel')?.value) || 0;

        const jugadores = data.jugadores
            .filter(j => j.estado === 'APROBADO')
            .filter(j => !texto || j.nombre.toLowerCase().includes(texto))
            .filter(j => !nivelId || j.id_categoria_jugador === nivelId);

        const contador = document.getElementById('contadorJugadores');
        if (contador) contador.textContent = `${jugadores.length} jugador${jugadores.length !== 1 ? 'es' : ''}`;

        const grid = document.getElementById('gridJugadores');
        if (!grid) return;

        if (jugadores.length === 0) {
            grid.innerHTML = `<div class="col-span-3 text-center py-16 text-gray-400 font-semibold">
                <p class="text-4xl mb-3">👤</p><p>No hay jugadores con ese filtro.</p></div>`;
            return;
        }

        grid.innerHTML = jugadores.map(j => {
            const cat = data.categoriasJugador.find(c => c.id === j.id_categoria_jugador);
            const levelColor = getLevelColor(cat?.nombre || '');
            return `
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-4 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs shrink-0">
                        ${escHTML(j.nombre.charAt(0))}
                    </div>
                    <div class="min-w-0">
                        <p class="font-bold text-gray-800 text-sm truncate">${escHTML(j.nombre)}</p>
                        <span class="inline-block text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full mt-0.5 ${levelColor}">
                            ${escHTML(cat?.nombre || 'Sin nivel')}
                        </span>
                    </div>
                </div>
                <label for="modal_perfil" onclick="verPerfilJugador(${j.id})"
                       class="btn btn-primary btn-sm bg-blue-600 border-none text-white font-bold shrink-0 cursor-pointer">
                    Ver
                </label>
            </div>`;
        }).join('');
    };

    document.getElementById('inputBuscarJugador')?.addEventListener('input', render);
    document.getElementById('selectNivel')?.addEventListener('change', render);
    render();

    // ── Perfil modal ──────────────────────────────────────────
    window.verPerfilJugador = (id) => {
        const j = data.jugadores.find(x => x.id === id);
        if (!j) return;

        const cat = data.categoriasJugador.find(c => c.id === j.id_categoria_jugador);
        document.getElementById('perfil_nombre').textContent    = j.nombre;
        document.getElementById('perfil_categoria').textContent = `Nivel: ${cat?.nombre || '—'}`;

        // Inscripciones
        const inscripciones = data.inscripciones.filter(i => i.id_jugador === id);
        const elIns = document.getElementById('perfil_inscripciones');
        if (elIns) {
            if (!inscripciones.length) {
                elIns.innerHTML = `<p class="text-gray-400 text-center text-sm italic">Sin inscripciones activas.</p>`;
            } else {
                elIns.innerHTML = inscripciones.map(ins => {
                    const part    = data.participaciones.find(p => p.id === ins.id_participacion);
                    const eq      = data.equipos.find(e => e.id === part?.id_equipo);
                    const rama    = data.ramas.find(r => r.id === part?.id_rama);
                    const catTorn = data.categoriasTorneo.find(c => c.id === part?.id_categoria_torneo);
                    return `
                    <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                        <div>
                            <p class="font-bold text-gray-800 text-sm">${escHTML(eq?.nombre || '—')}</p>
                            <p class="text-[10px] text-gray-400 font-bold uppercase mt-0.5">${escHTML(catTorn?.nombre || '—')} · ${escHTML(rama?.nombre || '—')}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-[10px] text-gray-400 font-bold uppercase">Camiseta</p>
                            <p class="text-xl font-black text-blue-600 leading-none mt-0.5">#${ins.numero_camiseta}</p>
                        </div>
                    </div>`;
                }).join('');
            }
        }

        // Historial
        const elHist = document.getElementById('perfil_historial');
        if (!elHist) return;
        const historial = window.Sanciones ? window.Sanciones.historialPartidosJugador(id) : [];
        if (!historial.length) {
            elHist.innerHTML = `<p class="text-gray-400 text-center text-sm italic">Sin partidos registrados.</p>`;
            return;
        }

        const totales = historial.reduce((acc, h) => ({
            victorias: acc.victorias + (h.gano ? 1 : 0),
            puntos:    acc.puntos    + (h.stats?.puntos || 0),
            amarillas: acc.amarillas + h.tarjetas.filter(t => t.tipo === 'AMARILLA').length,
            rojas:     acc.rojas     + h.tarjetas.filter(t => t.tipo === 'ROJA').length,
        }), { victorias:0, puntos:0, amarillas:0, rojas:0 });

        elHist.innerHTML = `
        <div class="grid grid-cols-3 gap-2 mb-3">
            <div class="bg-blue-50 rounded-xl p-3 text-center">
                <p class="text-2xl font-black text-blue-600">${historial.length}</p>
                <p class="text-[10px] text-gray-400 font-bold uppercase">Partidos</p>
            </div>
            <div class="bg-green-50 rounded-xl p-3 text-center">
                <p class="text-2xl font-black text-green-600">${totales.victorias}</p>
                <p class="text-[10px] text-gray-400 font-bold uppercase">Victorias</p>
            </div>
            <div class="bg-blue-50 rounded-xl p-3 text-center">
                <p class="text-2xl font-black text-blue-600">${totales.puntos}</p>
                <p class="text-[10px] text-gray-400 font-bold uppercase">Pts total</p>
            </div>
        </div>
        ${(totales.amarillas || totales.rojas) ? `<div class="flex gap-2 mb-3">
            ${totales.amarillas ? `<span class="badge badge-warning text-white font-bold text-xs">🟨 ${totales.amarillas}</span>` : ''}
            ${totales.rojas     ? `<span class="badge badge-error text-white font-bold text-xs">🟥 ${totales.rojas}</span>` : ''}
        </div>` : ''}
        <div class="space-y-2 max-h-52 overflow-y-auto pr-1">
        ${historial.map(h => {
            const win = h.gano;
            const tBadges = [...h.tarjetas.filter(t=>t.tipo==='AMARILLA').map(()=>'🟨'),
                             ...h.tarjetas.filter(t=>t.tipo==='ROJA').map(()=>'🟥')].join('');
            return `<div class="bg-gray-50 rounded-lg px-3 py-2 text-xs border border-gray-100">
                <div class="flex justify-between items-center">
                    <div><span class="font-black text-gray-700">vs ${escHTML(h.rival)}</span>
                        <span class="text-gray-400 ml-1">(${h.esLocal ? 'Local' : 'Visita'})</span>
                        ${tBadges ? `<span class="ml-1">${tBadges}</span>` : ''}
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="badge ${win ? 'badge-success' : 'badge-error'} badge-xs text-white font-bold">${win ? 'W' : 'L'}</span>
                        <span class="font-black text-gray-500 text-[10px]">${h.resultado}</span>
                    </div>
                </div>
                <div class="flex gap-3 mt-1 text-[10px] text-gray-400 font-bold">
                    <span>${h.partido.fecha}</span>
                    <span>${escHTML(h.categoria)} · ${escHTML(h.rama)}</span>
                    <span class="text-blue-600">${h.stats?.puntos || 0}pts</span>
                </div>
            </div>`;
        }).join('')}
        </div>`;
    };
});

function getLevelColor(nombre) {
    const n = (nombre || '').toUpperCase();
    if (n.includes('A+') || n === 'PRO')    return 'bg-purple-100 text-purple-700';
    if (n.includes('A-'))                   return 'bg-indigo-100 text-indigo-700';
    if (n.includes('B+'))                   return 'bg-blue-100 text-blue-700';
    if (n.includes('B-'))                   return 'bg-cyan-100 text-cyan-700';
    if (n.includes('C+'))                   return 'bg-green-100 text-green-700';
    if (n.includes('C-') || n === 'SEMI')   return 'bg-lime-100 text-lime-700';
    if (n === 'TODDLER' || n === 'CANTERA') return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-600';
}
