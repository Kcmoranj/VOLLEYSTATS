document.addEventListener('DOMContentLoaded', () => {
    // 1. FUSIÓN Y CARGA DE DATOS DESDE LOCALSTORAGE Y MOCK DATA
    let data = null;
    const localData = localStorage.getItem('volleyData');
    
    data = localData ? JSON.parse(localData) : window.VolleyAppData;

    const jugadoresGuardados = JSON.parse(localStorage.getItem('volley_jugadores'));
    if (jugadoresGuardados && data) {
        data.jugadores = jugadoresGuardados;
    }

    const listaPartidos = document.getElementById('listaPartidos');
    if (!data || !listaPartidos) return;

    window.verDetallePartido = (id) => {
        window.location.href = `estadisticas-partido.html?id=${id}`;
    };

    // 2. RENDERIZADO PRINCIPAL DE PARTIDOS
    const renderPartidos = () => {
        const partidosOrdenados = [...data.partidos].sort((a, b) => 
            new Date(a.fecha) - new Date(b.fecha) || a.ubicacion.localeCompare(b.ubicacion)
        );

        listaPartidos.innerHTML = partidosOrdenados.map(p => {
            const localPart = data.participaciones.find(part => part.id === p.id_local_participacion);
            const visitPart = data.participaciones.find(part => part.id === p.id_visitante_participacion);
            
            const eqLocal = data.equipos.find(e => e.id === localPart?.id_equipo);
            const eqVisit = data.equipos.find(e => e.id === visitPart?.id_equipo);
            
            const catObj = data.categoriasTorneo.find(c => c.id === localPart?.id_categoria_torneo);
            const ramaObj = data.ramas.find(r => r.id === localPart?.id_rama);
            
            const claseCancha = p.ubicacion?.includes('2') ? 'border-l-indigo-500' : 'border-l-emerald-500';

            // Mapeo dinámico de estados del partido
            const estadoActual = p.estado?.toUpperCase() || 'PROGRAMADO';
            let clasesEstado = 'bg-amber-50 text-amber-700 border-amber-200';
            
            if (estadoActual === 'EN CURSO' || estadoActual === 'JUGANDO') {
                clasesEstado = 'bg-red-50 text-red-600 border-red-200 animate-pulse font-bold';
            } else if (estadoActual === 'FINALIZADO' || estadoActual === 'TERMINADO') {
                clasesEstado = 'bg-slate-100 text-slate-600 border-slate-200';
            }

            // Parciales de sets estilizados
            const stringSets = (p.sets && Array.isArray(p.sets) && p.sets.length > 0)
                ? p.sets.map(s => `<span class="bg-slate-50 text-slate-500 px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-150">${s.local}-${s.visitante}</span>`).join('')
                : '<span class="text-slate-400 italic text-[11px]">Por jugar</span>';

            let setsLocal = 0;
            let setsVisitante = 0;

            if (p.sets && Array.isArray(p.sets)) {
                p.sets.forEach(set => {
                    if (set.local > set.visitante) setsLocal++;
                    else if (set.visitante > set.local) setsVisitante++;
                });
            }

            const elLocalGano = setsLocal > setsVisitante;
            const elVisitGano = setsVisitante > setsLocal;
            const esEmpateOPorJugar = setsLocal === setsVisitante;

            return `
            <div class="group border-l-4 ${claseCancha} bg-white rounded-xl shadow-sm hover:shadow-md border border-slate-200 transition-all duration-200 p-4 cursor-pointer mb-3" onclick="verDetallePartido(${p.id})">
                
                <!-- Encabezado superior -->
                <div class="flex justify-between items-start border-b border-slate-100 pb-2 mb-3 text-xs text-slate-500 font-medium">
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2">
                            <span>📅 ${p.fecha || '--/--'}</span>
                            <span class="text-slate-300">•</span>
                            <span>🕒 ${p.hora || '--:--'}</span>
                        </div>
                        <div class="flex items-center gap-1 mt-0.5 text-[11px]">
                            <span>📍 ${p.ubicacion || 'Sin asignar'}</span>
                        </div>
                    </div>
                    
                    <!-- Estado Badge -->
                    <span class="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded border ${clasesEstado}">
                        ${estadoActual}
                    </span>
                </div>
                
                <!-- Categoría Badge -->
                <div class="mb-3">
                    <span class="bg-blue-50 text-blue-700 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border border-blue-100">
                        🏆 ${catObj?.nombre || 'General'} • ${ramaObj?.nombre || 'Abierta'}
                    </span>
                </div>

                <!-- Scoreboard Central -->
                <div class="grid grid-cols-7 items-center gap-2">
                    
                    <!-- Equipo Local -->
                    <div class="col-span-2 flex flex-col items-center text-center transition-opacity ${!esEmpateOPorJugar && !elLocalGano ? 'opacity-40' : 'opacity-100'}">
                        <div class="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-lg shadow-sm mb-1 group-hover:scale-105 transition-transform">🛡️</div>
                        <span class="text-xs font-bold text-slate-800 line-clamp-2 leading-tight">${eqLocal?.nombre || 'Local'}</span>
                    </div>

                    <!-- Marcador -->
                    <div class="col-span-3 flex flex-col items-center justify-center">
                        <div class="flex items-center gap-4 text-2xl font-black tracking-tight text-slate-800 py-1">
                            <span class="${elLocalGano ? 'text-blue-600' : 'text-slate-700'}">${setsLocal}</span>
                            <span class="text-slate-300 font-light text-xl">-</span>
                            <span class="${elVisitGano ? 'text-blue-600' : 'text-slate-700'}">${setsVisitante}</span>
                        </div>
                        <div class="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-1">
                            SETS GANADOS
                        </div>
                    </div>

                    <!-- Equipo Visitante -->
                    <div class="col-span-2 flex flex-col items-center text-center transition-opacity ${!esEmpateOPorJugar && !elVisitGano ? 'opacity-40' : 'opacity-100'}">
                        <div class="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-lg shadow-sm mb-1 group-hover:scale-105 transition-transform">🛡️</div>
                        <span class="text-xs font-bold text-slate-800 line-clamp-2 leading-tight">${eqVisit?.nombre || 'Visitante'}</span>
                    </div>

                </div>

                <!-- Desglose de parciales -->
                <div class="flex justify-center gap-1.5 mt-4 border-t border-slate-50 pt-2.5">
                    ${stringSets}
                </div>

            </div>`;
        }).join('');
    };

    renderPartidos();
});

function logout() {
    localStorage.removeItem("session_admin");
    localStorage.removeItem("session_delegado_id");
    localStorage.removeItem("session_equipo_id");
    window.location.href = "../index.html";
}