document.addEventListener('DOMContentLoaded', () => {
    verificarSesionDelegado();

    const delegado = getDelegadoActual();
    if (!delegado) return;

    const data = window.AppDB.get();
    const equipo = getMiEquipo(data);
    const participaciones = getParticipacionesDeMiEquipo(data);

    const elNombreDelegado = document.getElementById('nombreDelegado');
    const elNombreEquipo   = document.getElementById('nombreEquipo');
    if (elNombreDelegado) elNombreDelegado.textContent = delegado.nombreDelegado || delegado.usuario;
    if (elNombreEquipo)   elNombreEquipo.textContent   = equipo?.nombre || '—';

    if (!equipo) {
        document.getElementById('avisoSinEquipo').classList.remove('hidden');
        document.getElementById('resumenConEquipo').classList.add('hidden');
        return;
    }
    document.getElementById('avisoSinEquipo').classList.add('hidden');
    document.getElementById('resumenConEquipo').classList.remove('hidden');

    const aprobadas  = participaciones.filter(p => p.aprobado).length;
    const pendientes = participaciones.filter(p => !p.aprobado).length;
    document.getElementById('statAprobadas').textContent  = aprobadas;
    document.getElementById('statPendientes').textContent = pendientes;

    const idsParticipaciones = participaciones.map(p => p.id);
    const inscripcionesEquipo = data.inscripciones.filter(i => idsParticipaciones.includes(i.id_participacion));
    const jugadoresPendientes = inscripcionesEquipo
        .map(i => data.jugadores.find(j => j.id === i.id_jugador))
        .filter(j => j && j.estado === 'PENDIENTE');
    document.getElementById('statJugadoresPendientes').textContent = jugadoresPendientes.length;

    // Próximo partido
    const proximo = data.partidos
        .filter(p =>
            idsParticipaciones.includes(p.id_local_participacion) ||
            idsParticipaciones.includes(p.id_visitante_participacion)
        )
        .filter(p => String(p.estado).toUpperCase().trim() !== 'FINALIZADO')
        .sort((a, b) => new Date(a.fecha + 'T' + (a.hora || '00:00')) - new Date(b.fecha + 'T' + (b.hora || '00:00')))[0];

    const cont = document.getElementById('proximoPartido');
    if (proximo) {
        const getNombre = (idPart) => {
            const part = data.participaciones.find(p => p.id === idPart);
            return data.equipos.find(e => e.id === part?.id_equipo)?.nombre || '—';
        };
        const local = getNombre(proximo.id_local_participacion);
        const visita = getNombre(proximo.id_visitante_participacion);
        const esSuspendido = (() => {
            const localPart = data.participaciones.find(p => p.id === proximo.id_local_participacion);
            const visitPart = data.participaciones.find(p => p.id === proximo.id_visitante_participacion);
            return (localPart && !localPart.aprobado) || (visitPart && !visitPart.aprobado);
        })();
        cont.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center gap-4">
                <div class="flex-1">
                    <p class="text-lg font-black text-gray-900">${local} <span class="text-gray-400 font-normal text-sm">vs</span> ${visita}</p>
                    <p class="text-sm text-gray-500 mt-1">📅 ${proximo.fecha} &nbsp;·&nbsp; 🕒 ${proximo.hora || '—'} &nbsp;·&nbsp; 📍 ${proximo.ubicacion || '—'}</p>
                </div>
                ${esSuspendido
                    ? `<span class="badge badge-error text-white font-bold text-xs px-3">⚠️ Equipo inhabilitado</span>`
                    : `<a href="convocatoria.html" class="btn btn-sm btn-primary bg-blue-600 border-none text-white font-bold shrink-0">Ir a Convocatoria →</a>`
                }
            </div>`;
    } else {
        cont.innerHTML = `<p class="text-gray-400 font-semibold">No tienes partidos próximos.</p>`;
    }
});
