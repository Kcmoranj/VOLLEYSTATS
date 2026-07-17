const normalizarEstado = (e) => window.normalizarEstado(e);
document.addEventListener('DOMContentLoaded', () => {
    const data = window.AppDB.get();
    if (!data) return;

    const selectCategoria = document.getElementById('selectCategoriaPosiciones');
    const contenedorTablas = document.getElementById('contenedorTablasPosiciones');

    // ─── 1. POBLAR SELECT ───────────────────────────────────────────────────────
    function inicializarCategorias() {
        if (!selectCategoria) return;
        selectCategoria.innerHTML = '';

        // Solo combinaciones cat/rama que tienen al menos una participación aprobada
        const combinaciones = [];
        data.categoriasTorneo.forEach(cat => {
            data.ramas.forEach(rama => {
                const tieneParticipaciones = data.participaciones.some(
                    p => p.id_categoria_torneo === cat.id && p.id_rama === rama.id && p.aprobado
                );
                if (tieneParticipaciones) {
                    combinaciones.push({ catId: cat.id, ramaId: rama.id, label: `${cat.nombre.toUpperCase()} · ${rama.nombre.toUpperCase()}` });
                }
            });
        });

        if (combinaciones.length === 0) {
            selectCategoria.innerHTML = '<option disabled selected>Sin categorías disponibles</option>';
            return;
        }

        combinaciones.forEach(c => {
            selectCategoria.innerHTML += `<option value="${c.catId}-${c.ramaId}">${c.label}</option>`;
        });
    }

    // ─── 2. CALCULAR ESTADÍSTICAS REALES DE UN EQUIPO ───────────────────────────
    // idParticipacion: la participación específica del equipo en esta cat/rama
    function calcularEstadisticasParticipacion(idParticipacion) {
        // Solo partidos FINALIZADOS donde participó este equipo
        const partidosJugados = data.partidos.filter(p =>
            normalizarEstado(p.estado) === 'FINALIZADO' &&
            (p.id_local_participacion === idParticipacion || p.id_visitante_participacion === idParticipacion)
        );

        let pj = 0, pg = 0, pp = 0, pts = 0, pf = 0, pc = 0;

        partidosJugados.forEach(p => {
            const esLocal = p.id_local_participacion === idParticipacion;
            const idRival = esLocal ? p.id_visitante_participacion : p.id_local_participacion;
            const sets = p.sets || [];

            // Contar sets ganados y perdidos — nos detenemos cuando alguien llega a 2
            // (evita que sets "extra" guardados en el array rompan el cálculo)
            let setsGanados = 0, setsPerdidos = 0;
            for (const s of sets) {
                const mio  = esLocal ? s.local : s.visitante;
                const suyo = esLocal ? s.visitante : s.local;
                if (mio > suyo) setsGanados++;
                else if (suyo > mio) setsPerdidos++;
                if (setsGanados === 2 || setsPerdidos === 2) break; // partido terminado
            }

            pj++;

            // Sistema de puntos:
            // Gana 2-0 → 3 pts  |  Gana 2-1 → 2 pts
            // Pierde 1-2 → 1 pt |  Pierde 0-2 → 0 pts
            if      (setsGanados === 2 && setsPerdidos === 0) { pg++; pts += 3; }
            else if (setsGanados === 2 && setsPerdidos === 1) { pg++; pts += 2; }
            else if (setsGanados === 1 && setsPerdidos === 2) { pp++; pts += 1; }
            else if (setsGanados === 0 && setsPerdidos === 2) { pp++;           }

            // Puntos a favor = suma de puntos de todos los jugadores de ESTE equipo en este partido
            // Puntos en contra = suma de puntos de todos los jugadores del RIVAL en este partido
            const inscripcionesMias   = data.inscripciones.filter(i => i.id_participacion === idParticipacion).map(i => i.id);
            const inscripcionesRival  = data.inscripciones.filter(i => i.id_participacion === idRival).map(i => i.id);

            pf += data.estadisticasJugador
                .filter(e => e.id_partido === p.id && inscripcionesMias.includes(e.id_inscripcion))
                .reduce((acc, e) => acc + (e.puntos || 0), 0);

            pc += data.estadisticasJugador
                .filter(e => e.id_partido === p.id && inscripcionesRival.includes(e.id_inscripcion))
                .reduce((acc, e) => acc + (e.puntos || 0), 0);
        });

        return { pj, pg, pp, pts, pf, pc, pd: pf - pc };
    }

    // ─── 3. RENDER ───────────────────────────────────────────────────────────────
    function renderTablas() {
        if (!contenedorTablas || !selectCategoria.value) return;
        contenedorTablas.innerHTML = '';

        const [idCat, idRama] = selectCategoria.value.split('-').map(Number);

        // Participaciones aprobadas de esta cat/rama, agrupadas por grupo
        const participaciones = data.participaciones.filter(p =>
            p.id_categoria_torneo === idCat && p.id_rama === idRama && p.aprobado
        );

        if (participaciones.length === 0) {
            contenedorTablas.innerHTML = `
                <div class="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 font-semibold">
                    No hay equipos inscritos en esta categoría.
                </div>`;
            return;
        }

        // Agrupar por campo "grupo"
        const grupos = participaciones.reduce((acc, p) => {
            const key = p.grupo || 'A';
            if (!acc[key]) acc[key] = [];
            acc[key].push(p);
            return acc;
        }, {});

        Object.keys(grupos).sort().forEach(grupoKey => {
            const participacionesGrupo = grupos[grupoKey];

            // Calcular fila por cada participación y ordenar
            const filas = participacionesGrupo.map(p => {
                const equipo = data.equipos.find(e => e.id === p.id_equipo);
                const stats  = calcularEstadisticasParticipacion(p.id);
                return { nombre: equipo?.nombre || '—', ...stats };
            }).sort((a, b) =>
                b.pts - a.pts ||      // 1. puntos
                b.pg - a.pg   ||      // 2. partidos ganados
                b.pd - a.pd           // 3. diferencia de puntos
            );

            // Posición con medalla para los 3 primeros
            const medallas = ['🥇', '🥈', '🥉'];

            const filasHtml = filas.map((f, i) => {
                const esLider  = i === 0 && f.pj > 0;
                const posicion = i < 3 && f.pj > 0
                    ? `<span title="Puesto ${i+1}">${medallas[i]}</span>`
                    : `<span class="text-gray-400 font-bold text-xs">${i + 1}</span>`;

                return `
                <tr class="hover:bg-slate-50/70 transition-colors ${esLider ? 'bg-blue-50/30' : ''}">
                    <td class="py-3 pl-4 pr-2 text-center w-8">${posicion}</td>
                    <td class="py-3 px-3 font-black text-gray-900 uppercase tracking-wide">${f.nombre}</td>
                    <td class="py-3 px-3 text-center">
                        <span class="inline-block bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded-lg min-w-[2rem]">
                            ${f.pts}
                        </span>
                    </td>
                    <td class="py-3 px-3 text-center text-gray-600 font-semibold">${f.pj}</td>
                    <td class="py-3 px-3 text-center text-emerald-600 font-bold">${f.pg}</td>
                    <td class="py-3 px-3 text-center text-rose-500 font-bold">${f.pp}</td>
                    <td class="py-3 px-3 text-center text-gray-600">${f.pf}</td>
                    <td class="py-3 px-3 text-center text-gray-600">${f.pc}</td>
                    <td class="py-3 pr-4 pl-3 text-center font-bold ${f.pd >= 0 ? 'text-emerald-600' : 'text-rose-500'}">
                        ${f.pd > 0 ? '+' : ''}${f.pd}
                    </td>
                </tr>`;
            }).join('');

            contenedorTablas.innerHTML += `
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
                    <h3 class="text-xs font-black text-gray-700 uppercase tracking-widest">Grupo ${grupoKey}</h3>
                    <span class="text-[10px] font-bold text-gray-400 uppercase">${filas.length} equipos</span>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                <th class="py-3 pl-4 pr-2 w-8"></th>
                                <th class="py-3 px-3 text-left">Equipo</th>
                                <th class="py-3 px-3 text-center" title="Puntos">Pts</th>
                                <th class="py-3 px-3 text-center" title="Partidos Jugados">PJ</th>
                                <th class="py-3 px-3 text-center" title="Partidos Ganados">PG</th>
                                <th class="py-3 px-3 text-center" title="Partidos Perdidos">PP</th>
                                <th class="py-3 px-3 text-center" title="Puntos a Favor">PF</th>
                                <th class="py-3 px-3 text-center" title="Puntos en Contra">PC</th>
                                <th class="py-3 pr-4 pl-3 text-center" title="Diferencia de Puntos">PD</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50">${filasHtml}</tbody>
                    </table>
                </div>
                <div class="px-5 py-2.5 bg-gray-50/50 border-t border-gray-100 flex flex-wrap gap-4 text-[10px] text-gray-400 font-semibold">
                    <span>🏆 2-0 = 3pts</span>
                    <span>✅ 2-1 = 2pts</span>
                    <span>⚠️ 1-2 = 1pt</span>
                    <span>❌ 0-2 = 0pts</span>
                </div>
            </div>`;
        });
    }

    selectCategoria?.addEventListener('change', renderTablas);
    inicializarCategorias();
    renderTablas();
});

// logout: window.logout() — js/shared/data-bridge.js