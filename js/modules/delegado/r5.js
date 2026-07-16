/**
 * r5.js — Alineación titular por set.
 * Media cancha: 2 filas × 3 columnas
 *   Delantera: IV (pos4) · III (pos3) · II (pos2)
 *   Zaguera:    V (pos5) · VI (pos6) ·  I (pos1)
 * Líbero: fuera de la cuadrícula, posición libre.
 * Schema: data.r5 = [{ id, id_partido, id_participacion, numero_set, alineacion }]
 */

const POSICIONES = [
    { key: 'pos4',   label: 'IV · Delantero Izq.',       roman: 'IV'  },
    { key: 'pos3',   label: 'III · Central',              roman: 'III' },
    { key: 'pos2',   label: 'II · Delantero Der.',        roman: 'II'  },
    { key: 'pos5',   label: 'V · Zaguero Izq.',           roman: 'V'   },
    { key: 'pos6',   label: 'VI · Zaguero Centro',        roman: 'VI'  },
    { key: 'pos1',   label: 'I · Saque / Zaguero Der.',   roman: 'I'   },
    { key: 'libero', label: 'Líbero (opcional)',           roman: 'LÍB' },
];

let setActivo = 1;

document.addEventListener('DOMContentLoaded', () => {
    verificarSesionDelegado();
    inicializarSelectorPartidos();
    document.getElementById('selectPartidoR5')?.addEventListener('change', () => {
        setActivo = 1;
        renderSetTabs();
        renderFormulario();
    });
});

/* ── Selector de partidos ── */
function inicializarSelectorPartidos() {
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
        const part  = data.participaciones.find(x => x.id === idRival);
        const rival = data.equipos.find(e => e.id === part?.id_equipo)?.nombre || '-';
        return `<option value="${p.id}">${p.fecha} ${p.hora || ''} vs ${rival}</option>`;
    }).join('');

    setActivo = 1;
    renderSetTabs();
    renderFormulario();
}

/* ── Tabs set 1/2/3 ── */
function renderSetTabs() {
    const tabs = document.getElementById('setTabs');
    if (!tabs) return;
    tabs.innerHTML = [1, 2, 3].map(n => `
        <button class="set-tab ${n === setActivo ? 'active' : ''}" onclick="cambiarSet(${n})">
            Set ${n}${n === 3 ? ' (si aplica)' : ''}
        </button>`).join('');
    const label = document.getElementById('setTabLabel');
    if (label) label.textContent = `Set ${setActivo}`;
}

window.cambiarSet = function(n) {
    setActivo = n;
    renderSetTabs();
    renderFormulario();
};

/* ── Helpers ── */
function getMiParticipacion(data, partido) {
    const ids = getParticipacionesDeMiEquipo(data).map(p => p.id);
    const idMia = ids.includes(partido.id_local_participacion)
        ? partido.id_local_participacion
        : partido.id_visitante_participacion;
    return data.participaciones.find(p => p.id === idMia);
}

function getConvocatoria(data, idPartido, participacion) {
    return (data.convocatorias || []).find(
        c => c.id_partido === idPartido && c.id_participacion === participacion.id
    );
}

/* ── Render formulario ── */
function renderFormulario() {
    const data = window.AppDB.get();
    const idPartido = parseInt(document.getElementById('selectPartidoR5').value);
    const partido = data.partidos.find(p => p.id === idPartido);
    if (!partido) return;

    const participacion = getMiParticipacion(data, partido);
    const convocatoria  = getConvocatoria(data, idPartido, participacion);

    const sinConv  = document.getElementById('sinConvocatoriaR5');
    const contenido = document.getElementById('contenidoR5');

    if (!convocatoria?.convocados?.length) {
        sinConv.classList.remove('hidden');
        contenido.classList.add('hidden');
        document.getElementById('sinPartidosR5').classList.add('hidden');
        return;
    }
    sinConv.classList.add('hidden');
    document.getElementById('sinPartidosR5').classList.add('hidden');
    contenido.classList.remove('hidden');

    // Opciones = jugadores convocados
    const opciones = convocatoria.convocados.map(idIns => {
        const ins = data.inscripciones.find(i => i.id === idIns);
        const j   = data.jugadores.find(x => x.id === ins?.id_jugador);
        return { idIns, label: `#${ins?.numero_camiseta} ${j?.nombre || '-'}`, nombre: j?.nombre?.split(' ')[0] || '-' };
    });

    // R5 guardado para este partido + set
    const existente = (data.r5 || []).find(r =>
        r.id_partido === idPartido &&
        r.id_participacion === participacion.id &&
        r.numero_set === setActivo
    );

    // Render selectores
    document.getElementById('formR5').innerHTML =
        POSICIONES.map(pos => {
            const val = existente?.alineacion?.[pos.key] || '';
            const isLibero = pos.key === 'libero';
            return `
            <div class="pos-slot ${isLibero ? 'libero' : ''}">
                <div class="pos-badge">${pos.roman}</div>
                <div class="flex-1 min-w-0">
                    <p class="text-[10px] font-bold text-gray-500 uppercase mb-1">${pos.label}</p>
                    <select data-pos="${pos.key}" onchange="actualizarCancha()"
                            class="select select-bordered select-sm w-full font-semibold text-xs">
                        <option value="">${isLibero ? '— Sin líbero —' : '— Seleccionar —'}</option>
                        ${opciones.map(o =>
                            `<option value="${o.idIns}" ${String(val) === String(o.idIns) ? 'selected' : ''}>${o.label}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>`;
        }).join('') +
        `<button type="button" onclick="guardarR5Set()"
                 class="btn btn-primary bg-blue-600 border-none text-white font-bold w-full mt-3">
             💾 Guardar alineación — Set ${setActivo}
         </button>`;

    actualizarCancha();
}

/* ── Actualizar diagrama de cancha ── */
function actualizarCancha() {
    const data = window.AppDB.get();
    const idPartido = parseInt(document.getElementById('selectPartidoR5')?.value);
    if (!idPartido) return;

    const partido = data.partidos.find(p => p.id === idPartido);
    if (!partido) return;
    const participacion = getMiParticipacion(data, partido);
    const convocatoria  = getConvocatoria(data, idPartido, participacion);
    if (!convocatoria) return;

    // Map idIns → first name
    const nombres = {};
    convocatoria.convocados.forEach(idIns => {
        const ins = data.inscripciones.find(i => i.id === idIns);
        const j   = data.jugadores.find(x => x.id === ins?.id_jugador);
        nombres[idIns] = j?.nombre?.split(' ')[0] || '-';
    });

    POSICIONES.forEach(pos => {
        const sel  = document.querySelector(`#formR5 select[data-pos="${pos.key}"]`);
        // There can be multiple cancha-nombre elements with the same data-cancha
        const cell = document.querySelector(`[data-cancha="${pos.key}"]`);
        if (!sel || !cell) return;

        const val  = sel.value;
        const nameEl = cell.classList.contains('cancha-cell')
            ? cell.querySelector('.cancha-nombre')
            : cell;   // libero slot: the <p> itself has cancha-nombre + data-cancha

        if (nameEl) nameEl.textContent = val ? (nombres[parseInt(val)] || '—') : '—';

        // Visual fill indicator
        if (cell.classList.contains('cancha-cell')) {
            cell.classList.toggle('filled', !!val);
        }
    });
}

/* ── Guardar ── */
function guardarR5Set() {
    const data = window.AppDB.get();
    const idPartido = parseInt(document.getElementById('selectPartidoR5').value);
    const partido   = data.partidos.find(p => p.id === idPartido);
    const participacion = getMiParticipacion(data, partido);

    const alineacion = {};
    const usados = new Set();
    let faltan = false, repetido = false;

    POSICIONES.forEach(pos => {
        const sel = document.querySelector(`#formR5 select[data-pos="${pos.key}"]`);
        const val = sel?.value ? parseInt(sel.value) : null;
        if (pos.key !== 'libero' && !val) faltan = true;
        if (val && usados.has(val)) repetido = true;
        if (val) usados.add(val);
        alineacion[pos.key] = val;
    });

    if (repetido) { alert('No puedes repetir un jugador en más de una posición.'); return; }
    if (faltan)   { alert('Debes completar las 6 posiciones titulares (el líbero es opcional).'); return; }

    if (!data.r5) data.r5 = [];
    const idx = data.r5.findIndex(r =>
        r.id_partido === idPartido &&
        r.id_participacion === participacion.id &&
        r.numero_set === setActivo
    );

    if (idx !== -1) {
        data.r5[idx].alineacion = alineacion;
    } else {
        data.r5.push({
            id: window.genId ? window.genId() : Date.now(),
            id_partido: idPartido,
            id_participacion: participacion.id,
            numero_set: setActivo,
            alineacion
        });
    }

    window.AppDB.save(data);

    if (typeof registrarActividad === 'function') {
        registrarActividad('R5_GUARDADO', `R5 Set ${setActivo} guardado — partido #${idPartido}`);
    }

    alert(`✅ Alineación del Set ${setActivo} guardada.`);
}
