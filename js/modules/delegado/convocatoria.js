document.addEventListener('DOMContentLoaded', () => {
    verificarSesionDelegado();
    inicializarSelectorPartidos();
    document.getElementById('selectPartido')?.addEventListener('change', () => renderConvocatoria());
    document.getElementById('btnGuardarConvocatoria')?.addEventListener('click', guardarConvocatoria);
});

function partidosDeMiEquipo(data) {
    const ids = getParticipacionesDeMiEquipo(data).map(p => p.id);
    return data.partidos.filter(p => ids.includes(p.id_local_participacion) || ids.includes(p.id_visitante_participacion));
}

function inicializarSelectorPartidos() {
    const data = window.AppDB.get();
    const partidos = partidosDeMiEquipo(data).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const select = document.getElementById('selectPartido');

    if (partidos.length === 0) {
        document.getElementById('sinPartidos').classList.remove('hidden');
        document.getElementById('contenidoConvocatoria').classList.add('hidden');
        return;
    }

    select.innerHTML = partidos.map(p => {
        const rival = obtenerNombreRival(data, p);
        return `<option value="${p.id}">${p.fecha} ${p.hora} vs ${rival}</option>`;
    }).join('');

    renderConvocatoria();
}

function obtenerNombreRival(data, partido) {
    const idsMios = getParticipacionesDeMiEquipo(data).map(p => p.id);
    const idRival = idsMios.includes(partido.id_local_participacion) ? partido.id_visitante_participacion : partido.id_local_participacion;
    const part = data.participaciones.find(x => x.id === idRival);
    return data.equipos.find(e => e.id === part?.id_equipo)?.nombre || '-';
}

function miParticipacionEnPartido(data, partido) {
    const idsMios = getParticipacionesDeMiEquipo(data).map(p => p.id);
    const idMia = idsMios.includes(partido.id_local_participacion) ? partido.id_local_participacion : partido.id_visitante_participacion;
    return data.participaciones.find(p => p.id === idMia);
}

function renderConvocatoria() {
    const data = window.AppDB.get();
    const idPartido = parseInt(document.getElementById('selectPartido').value);
    const partido = data.partidos.find(p => p.id === idPartido);
    if (!partido) return;

    document.getElementById('sinPartidos').classList.add('hidden');
    document.getElementById('contenidoConvocatoria').classList.remove('hidden');

    const participacion = miParticipacionEnPartido(data, partido);
    const inscripciones = data.inscripciones.filter(i => i.id_participacion === participacion.id);

    let convocatoria = data.convocatorias.find(c => c.id_partido === idPartido && c.id_participacion === participacion.id);
    const convocados = new Set(convocatoria ? convocatoria.convocados : []);

    const tbody = document.getElementById('tablaConvocatoria');
    if (inscripciones.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-gray-400 py-6 font-semibold">Tu plantel está vacío. Ve a "Mi Equipo".</td></tr>`;
        return;
    }

    tbody.innerHTML = inscripciones.map(ins => {
        const j = data.jugadores.find(x => x.id === ins.id_jugador);
        const elegible = j && j.estado === 'APROBADO';

        // Verificar suspensión por tarjeta roja
        let suspension = { suspendido: false, motivo: '' };
        if (elegible && window.Sanciones) {
            suspension = window.Sanciones.verificarSuspension(ins.id, idPartido);
        }

        const checked = convocados.has(ins.id) ? 'checked' : '';
        const bloqueado = !elegible || suspension.suspendido;

        let badgeEstado = '';
        if (!elegible) {
            badgeEstado = `<span class="badge badge-warning badge-sm text-white">Pendiente de aprobación</span>`;
        } else if (suspension.suspendido) {
            badgeEstado = `<span class="badge badge-error badge-sm text-white" title="${(window.escapeHtml ? window.escapeHtml(suspension.motivo) : (suspension.motivo || ''))}">🟥 Suspendido</span>`;
        }

        return `
        <tr class="${bloqueado ? 'opacity-40' : ''}">
            <td><input type="checkbox" class="checkbox checkbox-sm" data-ins="${ins.id}" ${checked} ${bloqueado ? 'disabled' : ''}></td>
            <td class="font-bold">#${ins.numero_camiseta} ${j?.nombre || '-'}</td>
            <td>${badgeEstado}</td>
        </tr>`;
    }).join('');
}

function guardarConvocatoria() {
    const data = window.AppDB.get();
    const idPartido = parseInt(document.getElementById('selectPartido').value);
    const partido = data.partidos.find(p => p.id === idPartido);
    const participacion = miParticipacionEnPartido(data, partido);

    const convocados = Array.from(document.querySelectorAll('#tablaConvocatoria input[type=checkbox]:checked'))
        .map(el => parseInt(el.dataset.ins));

    if (convocados.length < 6) {
        alert('Debes convocar al menos 6 jugadores.');
        return;
    }

    let convocatoria = data.convocatorias.find(c => c.id_partido === idPartido && c.id_participacion === participacion.id);
    if (convocatoria) {
        convocatoria.convocados = convocados;
    } else {
        data.convocatorias.push({ id: window.genId ? window.genId() : Date.now(), id_partido: idPartido, id_participacion: participacion.id, convocados });
    }

    window.AppDB.save(data);
    alert('Convocatoria guardada. Ahora puedes armar tu R5 en la sección "R5 / Alineación".');
}
