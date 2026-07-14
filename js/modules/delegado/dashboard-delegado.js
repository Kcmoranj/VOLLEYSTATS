document.addEventListener('DOMContentLoaded', () => {
    verificarSesionDelegado();

    const delegado = getDelegadoActual();
    if (!delegado) return;

    const data = window.AppDB.get();
    const equipo = getMiEquipo(data);
    const participaciones = getParticipacionesDeMiEquipo(data);

    document.getElementById('nombreDelegado').textContent = delegado.nombreDelegado;
    document.getElementById('nombreEquipo').textContent = equipo?.nombre || '—';

    if (!equipo) {
        document.getElementById('avisoSinEquipo').classList.remove('hidden');
        document.getElementById('resumenConEquipo').classList.add('hidden');
        return;
    }
    document.getElementById('avisoSinEquipo').classList.add('hidden');
    document.getElementById('resumenConEquipo').classList.remove('hidden');

    const aprobadas = participaciones.filter(p => p.aprobado).length;
    const pendientes = participaciones.filter(p => !p.aprobado).length;

    document.getElementById('statAprobadas').textContent = aprobadas;
    document.getElementById('statPendientes').textContent = pendientes;

    // Jugadores propuestos por este equipo aún pendientes de que el admin les asigne categoría
    const idsParticipaciones = participaciones.map(p => p.id);
    const inscripcionesEquipo = data.inscripciones.filter(i => idsParticipaciones.includes(i.id_participacion));
    const jugadoresPendientes = inscripcionesEquipo
        .map(i => data.jugadores.find(j => j.id === i.id_jugador))
        .filter(j => j && j.estado === 'PENDIENTE');

    document.getElementById('statJugadoresPendientes').textContent = jugadoresPendientes.length;

    // Próximo partido de cualquiera de las participaciones del equipo
    const proximo = data.partidos
        .filter(p => idsParticipaciones.includes(p.id_local_participacion) || idsParticipaciones.includes(p.id_visitante_participacion))
        .filter(p => String(p.estado).toUpperCase() !== 'FINALIZADO')
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))[0];

    const cont = document.getElementById('proximoPartido');
    if (proximo) {
        const nombreEquipo = (idParticipacion) => {
            const part = data.participaciones.find(p => p.id === idParticipacion);
            return data.equipos.find(e => e.id === part?.id_equipo)?.nombre || '—';
        };
        cont.innerHTML = `
            <p class="text-lg font-bold">${nombreEquipo(proximo.id_local_participacion)} vs ${nombreEquipo(proximo.id_visitante_participacion)}</p>
            <p class="text-sm text-gray-500">📅 ${proximo.fecha} · 🕒 ${proximo.hora} · 📍 ${proximo.ubicacion}</p>
        `;
    } else {
        cont.innerHTML = `<p class="text-gray-400 font-semibold">No tienes partidos próximos.</p>`;
    }
});