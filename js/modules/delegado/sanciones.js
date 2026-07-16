document.addEventListener('DOMContentLoaded', () => {
    verificarSesionDelegado();
    renderSanciones();
});

function nombreRival(data, partido, idsMios) {
    if (!partido) return null;
    const idRival = idsMios.includes(partido.id_local_participacion) ? partido.id_visitante_participacion : partido.id_local_participacion;
    const part = data.participaciones.find(x => x.id === idRival);
    return data.equipos.find(e => e.id === part?.id_equipo)?.nombre || null;
}

function renderSanciones() {
    const data = window.AppDB.get();
    const equipo = getMiEquipo(data);

    if (!equipo) {
        document.getElementById('avisoSinEquipoSanciones').classList.remove('hidden');
        document.getElementById('contenidoSanciones').classList.add('hidden');
        return;
    }
    document.getElementById('avisoSinEquipoSanciones').classList.add('hidden');
    document.getElementById('contenidoSanciones').classList.remove('hidden');

    const participaciones = getParticipacionesDeMiEquipo(data);
    const idsParticipaciones = participaciones.map(p => p.id);
    const idsInscripciones = data.inscripciones
        .filter(i => idsParticipaciones.includes(i.id_participacion))
        .map(i => i.id);

    const tarjetas = (data.sancionesJugador || []).filter(s => idsInscripciones.includes(s.id_inscripcion));

    // --- Resumen de totales ---
    const nAmarillas = tarjetas.filter(s => s.tipo === 'AMARILLA').length;
    const nRojas = tarjetas.filter(s => s.tipo === 'ROJA').length;

    document.getElementById('statAmarillas').textContent = nAmarillas;
    document.getElementById('statRojas').textContent = nRojas;

    // --- Tabla de tarjetas por jugador ---
    const tbodyTarjetas = document.getElementById('tablaTarjetas');
    if (tarjetas.length === 0) {
        tbodyTarjetas.innerHTML = `<tr><td colspan="5" class="text-center text-gray-400 py-6 font-semibold">Sin tarjetas registradas. 🎉</td></tr>`;
    } else {
        tbodyTarjetas.innerHTML = tarjetas
            .slice()
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .map(s => {
                const ins = data.inscripciones.find(i => i.id === s.id_inscripcion);
                const jug = data.jugadores.find(j => j.id === ins?.id_jugador);
                const partido = data.partidos.find(p => p.id === s.id_partido);
                const rival = nombreRival(data, partido, idsParticipaciones);
                const emoji = s.tipo === 'ROJA' ? '🟥' : '🟨';

                return `
                <tr class="hover:bg-gray-50">
                    <td class="font-bold text-gray-800">#${ins?.numero_camiseta ?? '-'} ${jug?.nombre || 'Desconocido'}</td>
                    <td class="text-center text-lg">${emoji}</td>
                    <td class="text-gray-600">${s.motivo}</td>
                    <td class="text-xs text-gray-400">${partido ? `vs ${rival || '-'} · ${partido.fecha}` : new Date(s.fecha).toLocaleDateString('es-EC')}</td>
                </tr>`;
            }).join('');
    }