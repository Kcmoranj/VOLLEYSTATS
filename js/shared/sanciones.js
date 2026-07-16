/**
 * sanciones.js  (js/shared/sanciones.js)
 * Módulo compartido de sanciones.  Expone window.Sanciones.
 *
 * Schema de datos (compatible con v4):
 *   sancionesJugador[]  – tarjeta por jugador, identificada por id_inscripcion
 *     { id, id_inscripcion, id_partido, tipo, motivo, multa, fecha, pagada,
 *       partidos_suspension }
 *   multasEquipo[]      – multa al equipo completo
 *     { id, id_equipo, id_partido, motivo, monto, fecha, pagada }
 *
 * Usado por:
 *   estadisticas-admin.js  – emitir tarjetas y multas en un partido (usa su propio modal)
 *   convocatoria.js        – bloquear jugadores suspendidos
 *   sanciones-admin.html   – reporte y exportación admin
 *   delegado/sanciones.js  – vista de solo lectura para el delegado
 *   jugadores.js           – historial de partidos con tarjetas
 */

window.Sanciones = (() => {

    const PARTIDOS_SUSPENSION_ROJA = 1;

    function getData() {
        return window.AppDB ? window.AppDB.get() : (JSON.parse(localStorage.getItem('volleyData')) || window.VolleyAppData);
    }
    function saveData(data) {
        if (window.AppDB) window.AppDB.save(data);
        else localStorage.setItem('volleyData', JSON.stringify(data));
    }
    function asegurarArrays(data) {
        if (!Array.isArray(data.sancionesJugador)) data.sancionesJugador = [];
        if (!Array.isArray(data.multasEquipo)) data.multasEquipo = [];
        return data;
    }

    // ----------------------------------------------------------------
    // TARJETAS (sancionesJugador)
    // ----------------------------------------------------------------

    /**
     * Busca el id_equipo de una inscripción.
     */
    function idEquipoDeInscripcion(data, idInscripcion) {
        const ins = data.inscripciones.find(i => i.id === idInscripcion);
        if (!ins) return null;
        return data.participaciones.find(p => p.id === ins.id_participacion)?.id_equipo || null;
    }

    /**
     * Devuelve verdadero si un jugador (por id_inscripcion) está suspendido
     * para el partido objetivo.
     *
     * Lógica: para cada tarjeta ROJA con partidos_suspension > 0 en esa inscripción,
     * cuenta los N partidos del equipo posteriores a la fecha de la sanción;
     * si idPartidoObjetivo cae dentro, el jugador está suspendido.
     */
    function verificarSuspension(idInscripcion, idPartidoObjetivo) {
        const data = getData();
        asegurarArrays(data);

        const ins = data.inscripciones.find(i => i.id === idInscripcion);
        if (!ins) return { suspendido: false, motivo: '' };

        const idEquipo = data.participaciones.find(p => p.id === ins.id_participacion)?.id_equipo;
        if (!idEquipo) return { suspendido: false, motivo: '' };

        const partidoObj = data.partidos.find(p => p.id === idPartidoObjetivo);
        if (!partidoObj) return { suspendido: false, motivo: '' };

        const participacionesEquipo = data.participaciones.filter(p => p.id_equipo === idEquipo).map(p => p.id);

        const rojasConSuspension = data.sancionesJugador.filter(s =>
            s.id_inscripcion === idInscripcion &&
            s.tipo === 'ROJA' &&
            (s.partidos_suspension || 0) > 0
        );

        for (const sancion of rojasConSuspension) {
            const fechaSancion = sancion.fecha
                ? String(sancion.fecha).slice(0, 10)
                : '';

            const siguientes = data.partidos
                .filter(p =>
                    p.id !== sancion.id_partido &&
                    (participacionesEquipo.includes(p.id_local_participacion) ||
                     participacionesEquipo.includes(p.id_visitante_participacion)) &&
                    (!fechaSancion || p.fecha >= fechaSancion)
                )
                .sort((a, b) => {
                    const d = a.fecha.localeCompare(b.fecha);
                    return d !== 0 ? d : (a.hora || '').localeCompare(b.hora || '');
                })
                .slice(0, sancion.partidos_suspension)
                .map(p => p.id);

            if (siguientes.includes(idPartidoObjetivo)) {
                return {
                    suspendido: true,
                    motivo: `Suspendido por tarjeta roja${sancion.motivo ? ': ' + sancion.motivo : ''} (${fechaSancion})`
                };
            }
        }

        return { suspendido: false, motivo: '' };
    }

    /**
     * Devuelve el historial de partidos de un jugador (por id_jugador).
     * Cada entrada incluye stats y tarjetas de ese partido.
     */
    function historialPartidosJugador(idJugador) {
        const data = getData();
        asegurarArrays(data);

        const inscripciones = data.inscripciones.filter(i => i.id_jugador === idJugador);
        const resultado = [];

        for (const ins of inscripciones) {
            const statsEnPartidos = (data.estadisticasJugador || []).filter(e => e.id_inscripcion === ins.id);

            for (const stat of statsEnPartidos) {
                const partido = data.partidos.find(p => p.id === stat.id_partido);
                if (!partido) continue;

                const participacion = data.participaciones.find(p => p.id === ins.id_participacion);
                const equipo = data.equipos.find(e => e.id === participacion?.id_equipo);
                const catTorneo = data.categoriasTorneo.find(c => c.id === participacion?.id_categoria_torneo);
                const rama = data.ramas.find(r => r.id === participacion?.id_rama);

                const esLocal = partido.id_local_participacion === ins.id_participacion;
                const idPartRival = esLocal ? partido.id_visitante_participacion : partido.id_local_participacion;
                const partRival = data.participaciones.find(p => p.id === idPartRival);
                const equipoRival = data.equipos.find(e => e.id === partRival?.id_equipo);

                let setsLocal = 0, setsVisit = 0;
                (partido.sets || []).forEach(s => {
                    if (s.local > s.visitante) setsLocal++;
                    else setsVisit++;
                });
                const gano = esLocal ? setsLocal > setsVisit : setsVisit > setsLocal;

                const tarjetasEnPartido = data.sancionesJugador.filter(
                    s => s.id_partido === partido.id && s.id_inscripcion === ins.id
                );

                resultado.push({
                    partido,
                    equipo: equipo?.nombre || '-',
                    rival: equipoRival?.nombre || '-',
                    esLocal,
                    resultado: `${setsLocal}-${setsVisit}`,
                    gano,
                    categoria: catTorneo?.nombre || '-',
                    rama: rama?.nombre || '-',
                    stats: {
                        puntos: stat.puntos || 0,
                        saque: stat.saque || 0,
                        ataque: stat.ataque || 0,
                        bloqueo: stat.bloqueo || 0,
                        defensa: stat.defensa || 0,
                        colocacion: stat.colocacion || 0
                    },
                    tarjetas: tarjetasEnPartido
                });
            }
        }

        resultado.sort((a, b) => b.partido.fecha.localeCompare(a.partido.fecha));
        return resultado;
    }

    // ----------------------------------------------------------------
    // REPORTE CONSOLIDADO POR EQUIPO (para sanciones-admin)
    // ----------------------------------------------------------------

    function reporteEquipo(idEquipo) {
        const data = getData();
        asegurarArrays(data);

        const equipo = data.equipos.find(e => e.id === idEquipo);

        // Inscripciones del equipo
        const partEquipo = data.participaciones.filter(p => p.id_equipo === idEquipo).map(p => p.id);
        const idsIns = data.inscripciones.filter(i => partEquipo.includes(i.id_participacion)).map(i => i.id);

        const tarjetas = data.sancionesJugador
            .filter(s => idsIns.includes(s.id_inscripcion))
            .map(s => {
                const ins = data.inscripciones.find(i => i.id === s.id_inscripcion);
                const jugador = data.jugadores.find(j => j.id === ins?.id_jugador);
                const partido = data.partidos.find(p => p.id === s.id_partido);
                const esLocal = partido ? partEquipo.includes(partido.id_local_participacion) : false;
                const idRival = partido ? (esLocal ? partido.id_visitante_participacion : partido.id_local_participacion) : null;
                const partRival = idRival ? data.participaciones.find(p => p.id === idRival) : null;
                const rival = partRival ? (data.equipos.find(e => e.id === partRival.id_equipo)?.nombre || '-') : '-';
                const fecha = s.fecha ? String(s.fecha).slice(0, 10) : '-';
                return {
                    fecha,
                    jugador: jugador?.nombre || '-',
                    tipo: s.tipo,
                    motivo: s.motivo || '-',
                    partido: partido ? `vs ${rival} (${fecha})` : '-',
                    partidos_suspension: s.partidos_suspension || 0,
                    multa: s.multa || 0,
                    id: s.id,
                    id_inscripcion: s.id_inscripcion
                };
            })
            .sort((a, b) => b.fecha.localeCompare(a.fecha));

        const multasEquipo = data.multasEquipo
            .filter(m => m.id_equipo === idEquipo)
            .map(m => ({
                fecha: m.fecha ? String(m.fecha).slice(0, 10) : '-',
                monto: m.monto || 0,
                motivo: m.motivo || '-',
                pagada: m.pagada || false,
                id: m.id
            }))
            .sort((a, b) => b.fecha.localeCompare(a.fecha));

        const totalMultasTarjetas = tarjetas.reduce((acc, t) => acc + (t.multa || 0), 0);
        const totalMultasEquipo = multasEquipo.reduce((acc, m) => acc + m.monto, 0);
        const pendientesEquipo = multasEquipo.filter(m => !m.pagada).reduce((acc, m) => acc + m.monto, 0);

        return {
            equipo: equipo?.nombre || '-',
            tarjetas,
            amarillas: tarjetas.filter(t => t.tipo === 'AMARILLA').length,
            rojas: tarjetas.filter(t => t.tipo === 'ROJA').length,
            multas: multasEquipo,
            totalMultasTarjetas,
            totalMultasEquipo,
            multasPendientes: pendientesEquipo
        };
    }

    function eliminarTarjeta(idSancion) {
        const data = getData();
        asegurarArrays(data);
        data.sancionesJugador = data.sancionesJugador.filter(s => s.id !== idSancion);
        saveData(data);
    }

    function togglePagadaMulta(idMulta) {
        const data = getData();
        asegurarArrays(data);
        const m = data.multasEquipo.find(m => m.id === idMulta);
        if (m) m.pagada = !m.pagada;
        saveData(data);
    }

    function eliminarMulta(idMulta) {
        const data = getData();
        asegurarArrays(data);
        data.multasEquipo = data.multasEquipo.filter(m => m.id !== idMulta);
        saveData(data);
    }

    function registrarMulta({ id_equipo, id_partido = null, monto, motivo = '', fecha = null }) {
        const data = getData();
        asegurarArrays(data);
        const fechaFinal = fecha || (id_partido
            ? (data.partidos.find(p => p.id === id_partido)?.fecha || new Date().toISOString().slice(0, 10))
            : new Date().toISOString().slice(0, 10));
        data.multasEquipo.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            id_equipo, id_partido,
            monto: parseFloat(monto) || 0,
            motivo: motivo.trim(),
            fecha: fechaFinal,
            pagada: false
        });

        // Inhabilitar todas las participaciones del equipo multado
        data.participaciones
            .filter(p => p.id_equipo === id_equipo)
            .forEach(p => { p.aprobado = false; });

        saveData(data);
    }

    return {
        PARTIDOS_SUSPENSION_ROJA,
        verificarSuspension,
        historialPartidosJugador,
        reporteEquipo,
        eliminarTarjeta,
        eliminarMulta,
        togglePagadaMulta,
        registrarMulta
    };
})();
