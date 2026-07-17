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

    function eliminarTarjeta(idSancion) {
        const data = getData();
        asegurarArrays(data);
        data.sancionesJugador = data.sancionesJugador.filter(s => s.id !== idSancion);
        saveData(data);
    }

    function eliminarMulta(idMulta) {
        const data = getData();
        asegurarArrays(data);
        data.multasEquipo = data.multasEquipo.filter(m => m.id !== idMulta);
        saveData(data);
    }

    function registrarMulta({ id_equipo, id_partido = null, id_participacion = null, monto, motivo = '', fecha = null }) {
        const data = getData();
        asegurarArrays(data);
        const fechaFinal = fecha || (id_partido
            ? (data.partidos.find(p => p.id === id_partido)?.fecha || new Date().toISOString().slice(0, 10))
            : new Date().toISOString().slice(0, 10));
        data.multasEquipo.push({
            id: window.genId ? window.genId() : Date.now() * 1000,
            id_equipo, id_partido, id_participacion,
            monto: parseFloat(monto) || 0,
            motivo: motivo.trim(),
            fecha: fechaFinal,
            pagada: false
        });

        // Inhabilitar solo la participación específica (equipo + rama + categoría) multada
        const idPart = id_participacion || (id_partido
            ? (() => {
                const partido = data.partidos.find(p => p.id === id_partido);
                if (!partido) return null;
                const partsEq = data.participaciones.filter(p => p.id_equipo === id_equipo).map(p => p.id);
                return partsEq.includes(partido.id_local_participacion)
                    ? partido.id_local_participacion
                    : partido.id_visitante_participacion;
              })()
            : null);
        if (idPart) {
            const p = data.participaciones.find(x => x.id === idPart);
            if (p) p.aprobado = false;
        }

        saveData(data);
    }

    return {
        PARTIDOS_SUSPENSION_ROJA,
        verificarSuspension,
        historialPartidosJugador,
        eliminarTarjeta,
        eliminarMulta,
        registrarMulta
    };
})();
