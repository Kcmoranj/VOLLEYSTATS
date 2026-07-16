const POSICIONES = [
    { key: 'pos1', label: 'Posición I (Saque / Zaguero Der.)' },
    { key: 'pos2', label: 'Posición II (Delantero Der.)' },
    { key: 'pos3', label: 'Posición III (Central)' },
    { key: 'pos4', label: 'Posición IV (Delantero Izq.)' },
    { key: 'pos5', label: 'Posición V (Zaguero Izq.)' },
    { key: 'pos6', label: 'Posición VI (Zaguero Centro)' },
    { key: 'libero', label: 'Líbero (opcional)' }
];

document.addEventListener('DOMContentLoaded', () => {
    verificarSesionDelegado();
    inicializarSelectorPartidosR5();
    document.getElementById('selectPartidoR5')?.addEventListener('change', renderFormularioR5);
    document.getElementById('formR5')?.addEventListener('submit', guardarR5);
});

function inicializarSelectorPartidosR5() {
    const data = window.AppDB.get();
    const ids = getParticipacionesDeMiEquipo(data).map(p => p.id);
    const partidos = data.partidos
        .filter(p => ids.includes(p.id_local_participacion) || ids.includes(p.id_visitante_participacion))
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const select = document.getElementById('selectPartidoR5');
    if (partidos.length === 0) {
        document.getElementById('sinPartidosR5').classList.remove('hidden');
        document.getElementById('contenidoR5').classList.add('hidden');
        return;
    }

    select.innerHTML = partidos.map(p => {
        const idRival = ids.includes(p.id_local_participacion) ? p.id_visitante_participacion : p.id_local_participacion;
        const part = data.participaciones.find(x => x.id === idRival);
        const rival = data.equipos.find(e => e.id === part?.id_equipo)?.nombre || '-';
        return `<option value="${p.id}">${p.fecha} ${p.hora} vs ${rival}</option>`;
    }).join('');

    renderFormularioR5();
}

function miParticipacionDePartidoR5(data, partido) {
    const ids = getParticipacionesDeMiEquipo(data).map(p => p.id);
    const idMia = ids.includes(partido.id_local_participacion) ? partido.id_local_participacion : partido.id_visitante_participacion;
    return data.participaciones.find(p => p.id === idMia);
}

function renderFormularioR5() {
    const data = window.AppDB.get();
    const idPartido = parseInt(document.getElementById('selectPartidoR5').value);
    const partido = data.partidos.find(p => p.id === idPartido);
    if (!partido) return;

    const participacion = miParticipacionDePartidoR5(data, partido);
    const convocatoria = data.convocatorias.find(c => c.id_partido === idPartido && c.id_participacion === participacion.id);

    const contenedor = document.getElementById('contenidoR5');
    const aviso = document.getElementById('sinConvocatoriaR5');

    if (!convocatoria || convocatoria.convocados.length === 0) {
        aviso.classList.remove('hidden');
        contenedor.classList.add('hidden');
        document.getElementById('sinPartidosR5').classList.add('hidden');
        return;
    }
    aviso.classList.add('hidden');
    document.getElementById('sinPartidosR5').classList.add('hidden');
    contenedor.classList.remove('hidden');

    const opciones = convocatoria.convocados.map(idIns => {
        const ins = data.inscripciones.find(i => i.id === idIns);
        const j = data.jugadores.find(x => x.id === ins?.id_jugador);
        return { idIns, label: `#${ins?.numero_camiseta} ${j?.nombre || '-'}` };
    });

    const existente = data.r5.find(r => r.id_partido === idPartido && r.id_participacion === participacion.id);

    document.getElementById('formR5').innerHTML = POSICIONES.map(pos => `
        <div class="mb-3">
            <label class="text-[10px] font-bold text-gray-400 uppercase block mb-1">${pos.label}</label>
            <select data-pos="${pos.key}" class="select select-bordered w-full text-sm">
                <option value="">${pos.key === 'libero' ? '— Sin líbero —' : '— Selecciona —'}</option>
                ${opciones.map(o => `<option value="${o.idIns}" ${existente?.alineacion?.[pos.key] === o.idIns ? 'selected' : ''}>${o.label}</option>`).join('')}
            </select>
        </div>
    `).join('') + `<button type="submit" class="btn btn-primary w-full mt-2 font-bold">Guardar R5</button>`;
}

function guardarR5(e) {
    e.preventDefault();
    const data = window.AppDB.get();
    const idPartido = parseInt(document.getElementById('selectPartidoR5').value);
    const partido = data.partidos.find(p => p.id === idPartido);
    const participacion = miParticipacionDePartidoR5(data, partido);

    const alineacion = {};
    const usados = new Set();
    let faltan = false;
    let repetido = false;

    POSICIONES.forEach(pos => {
        const select = document.querySelector(`#formR5 select[data-pos="${pos.key}"]`);
        const val = select.value ? parseInt(select.value) : null;
        if (pos.key !== 'libero' && !val) faltan = true;
        if (val && usados.has(val)) repetido = true;
        if (val) usados.add(val);
        alineacion[pos.key] = val;
    });

    if (repetido) { alert('No puedes repetir un jugador en más de una posición.'); return; }
    if (faltan) { alert('Debes completar las 6 posiciones titulares (el líbero es opcional).'); return; }

    let r5 = data.r5.find(r => r.id_partido === idPartido && r.id_participacion === participacion.id);
    if (r5) {
        r5.alineacion = alineacion;
    } else {
        data.r5.push({ id: window.genId ? window.genId() : Date.now(), id_partido: idPartido, id_participacion: participacion.id, alineacion });
    }

    window.AppDB.save(data);

    if (typeof registrarActividad === 'function') {
        registrarActividad('ESTADO_CAMBIADO', `Se guardó el R5 del partido #${idPartido}`);
    }

    alert('R5 guardado correctamente.');
}
