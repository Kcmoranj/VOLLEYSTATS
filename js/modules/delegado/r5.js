/**
 * r5.js — Formación R5: posiciones iniciales + roles
 *
 * UX: dos pasos en una sola pantalla sin scroll.
 *   Paso 1 "Posiciones": toca una celda de la cancha → elige quién va ahí.
 *   Paso 2 "Roles": para cada jugador asignado, elige su rol (armador, central…)
 *
 * El sistema calcula rotaciones automáticamente con posiciones + roles.
 */

const POSICIONES = [
    { key: 'pos4', roman: 'IV',  zona: 'delantera', label: 'IV (delantera izq.)' },
    { key: 'pos3', roman: 'III', zona: 'delantera', label: 'III (central delantera)' },
    { key: 'pos2', roman: 'II',  zona: 'delantera', label: 'II (delantera der.)' },
    { key: 'pos5', roman: 'V',   zona: 'zaguera',   label: 'V (zaguera izq.)' },
    { key: 'pos6', roman: 'VI',  zona: 'zaguera',   label: 'VI (central zaguera)' },
    { key: 'pos1', roman: 'I',   zona: 'zaguera',   label: 'I (saque / zaguera der.)' },
];

const ROLES = [
    { key: 'armador',  label: 'Armador',     desc: 'Colocador',         chip: 'ARM', chipColor: 'bg-blue-600'   },
    { key: 'opuesto',  label: 'Opuesto',      desc: 'Punta derecha',     chip: 'OPU', chipColor: 'bg-purple-600' },
    { key: 'punta1',   label: 'Punta 1',      desc: 'Receptor-atacante', chip: 'PTA', chipColor: 'bg-green-600'  },
    { key: 'punta2',   label: 'Punta 2',      desc: 'Receptor-atacante', chip: 'PTA', chipColor: 'bg-green-600'  },
    { key: 'central1', label: 'Central 1',    desc: 'Bloqueador',        chip: 'CEN', chipColor: 'bg-amber-600'  },
    { key: 'central2', label: 'Central 2',    desc: 'Bloqueador',        chip: 'CEN', chipColor: 'bg-amber-600'  },
];

let setActivo    = 1;
let stepActivo   = 'posiciones'; // 'posiciones' | 'roles'
let celdaActiva  = null;         // key de la celda seleccionada en la cancha

/* ── BOOTSTRAP ── */
document.addEventListener('DOMContentLoaded', () => {
    verificarSesionDelegado();
    inicializarSelectorPartidos();
    document.getElementById('selectPartidoR5')?.addEventListener('change', () => {
        setActivo   = 1;
        celdaActiva = null;
        renderTodo();
    });
});

/* ── Selector de partidos ── */
function inicializarSelectorPartidos() {
    const data    = window.AppDB.get();
    const ids     = getParticipacionesDeMiEquipo(data).map(p => p.id);
    const partidos = data.partidos
        .filter(p => ids.includes(p.id_local_participacion) || ids.includes(p.id_visitante_participacion))
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const select = document.getElementById('selectPartidoR5');

    if (!partidos.length) {
        document.getElementById('sinPartidosR5').classList.remove('hidden');
        document.getElementById('contenidoR5').classList.add('hidden');
        return;
    }

    select.innerHTML = partidos.map(p => {
        const idRival = ids.includes(p.id_local_participacion) ? p.id_visitante_participacion : p.id_local_participacion;
        const part    = data.participaciones.find(x => x.id === idRival);
        const rival   = data.equipos.find(e => e.id === part?.id_equipo)?.nombre || '-';
        const estado  = window.normalizarEstado(p.estado);
        const badge   = estado === 'EN_PROGRESO' ? ' 🔴' : estado === 'FINALIZADO' ? ' ✅' : '';
        return `<option value="${p.id}">${p.fecha} vs ${rival}${badge}</option>`;
    }).join('');

    renderTodo();
}

/* ── Helpers ── */
function getMiParticipacion(data, partido) {
    const ids   = getParticipacionesDeMiEquipo(data).map(p => p.id);
    const idMia = ids.includes(partido.id_local_participacion)
        ? partido.id_local_participacion : partido.id_visitante_participacion;
    return data.participaciones.find(p => p.id === idMia);
}
function getConvocatoria(data, idP, part) {
    return (data.convocatorias || []).find(c => c.id_partido === idP && c.id_participacion === part.id);
}
function getR5(data, idP, part) {
    return (data.r5 || []).find(r => r.id_partido === idP && r.id_participacion === part.id && r.numero_set === setActivo) || { alineacion: {}, roles: {} };
}
function getOpciones(data, idP, part) {
    const conv = getConvocatoria(data, idP, part);
    if (!conv?.convocados) return [];
    return conv.convocados.map(idIns => {
        const ins = data.inscripciones.find(i => i.id === idIns);
        const j   = data.jugadores.find(x => x.id === ins?.id_jugador);
        return { idIns, label: `#${ins?.numero_camiseta} ${j?.nombre || '-'}`, nombre: j?.nombre?.split(' ')[0] || '-', num: ins?.numero_camiseta };
    });
}

/* ── Render principal ── */
function renderTodo() {
    const data    = window.AppDB.get();
    const idP     = parseInt(document.getElementById('selectPartidoR5').value);
    const partido = data.partidos.find(p => p.id === idP);
    if (!partido) return;

    const estado = window.normalizarEstado(partido.estado);
    const part   = getMiParticipacion(data, partido);
    const conv   = getConvocatoria(data, idP, part);

    // Avisos
    document.getElementById('sinPartidosR5').classList.add('hidden');
    if (!conv?.convocados?.length) {
        document.getElementById('sinConvocatoriaR5').classList.remove('hidden');
        document.getElementById('contenidoR5').classList.add('hidden');
        return;
    }
    document.getElementById('sinConvocatoriaR5').classList.add('hidden');
    document.getElementById('contenidoR5').classList.remove('hidden');

    // Estado badge
    const badge = document.getElementById('estadoBadge');
    if (badge) {
        const txt = estado === 'EN_PROGRESO' ? '🔴 En vivo' : estado === 'FINALIZADO' ? '✅ Finalizado' : '📅 Programado';
        badge.innerHTML = `<span class="text-[10px] font-bold text-gray-400">${txt}</span>`;
    }

    const readonly = estado === 'FINALIZADO';
    document.getElementById('btnGuardar').classList.toggle('hidden', readonly);

    // Set tabs
    renderSetTabs();

    const r5       = getR5(data, idP, part);
    const opciones = getOpciones(data, idP, part);

    renderCancha(r5, opciones);
    renderStep(r5, opciones, readonly);
    renderValidacion(r5, opciones);

    // Update set number in save button
    document.getElementById('setNumGuardar').textContent = setActivo;
}

/* ── Set tabs ── */
function renderSetTabs() {
    const tabs = document.getElementById('setTabs');
    if (!tabs) return;
    tabs.innerHTML = [1,2,3].map(n => `
        <button class="set-tab ${n === setActivo ? 'active' : ''}" onclick="cambiarSet(${n})">
            Set ${n}${n === 3 ? '*' : ''}
        </button>`).join('');
}
window.cambiarSet = function(n) {
    setActivo   = n;
    celdaActiva = null;
    renderTodo();
};

/* ── Step switch ── */
window.setStep = function(step) {
    stepActivo  = step;
    celdaActiva = null;
    const data  = window.AppDB.get();
    const idP   = parseInt(document.getElementById('selectPartidoR5').value);
    const part  = getMiParticipacion(data, data.partidos.find(p => p.id === idP));
    const r5    = getR5(data, idP, part);
    const ops   = getOpciones(data, idP, part);
    renderStep(r5, ops, false);
    updateStepButtons(r5, ops);
};

function updateStepButtons(r5, opciones) {
    const posBtn = document.getElementById('stepPosBtn');
    const rolBtn = document.getElementById('stepRolBtn');
    const posCompleta = POSICIONES.every(p => r5.alineacion?.[p.key]);
    const rolCompleto  = ROLES.every(r => r5.roles?.[r.key]);

    posBtn.className = `step-btn ${stepActivo === 'posiciones' ? 'active' : posCompleta ? 'done' : ''}`;
    rolBtn.className = `step-btn ${stepActivo === 'roles' ? 'active' : rolCompleto ? 'done' : ''}`;

    document.getElementById('stepPosDone').textContent = posCompleta && stepActivo !== 'posiciones' ? '✓' : '①';
    document.getElementById('stepRolDone').textContent = rolCompleto && stepActivo !== 'roles' ? '✓' : '②';
}

/* ── Render cancha ── */
function renderCancha(r5, opciones) {
    const alin    = r5.alineacion || {};
    const roles   = r5.roles || {};
    // Build inscripcion → rol map
    const rolDeIns = {};
    ROLES.forEach(r => { if (roles[r.key]) rolDeIns[roles[r.key]] = r; });

    POSICIONES.forEach(pos => {
        const cell  = document.querySelector(`[data-cancha="${pos.key}"]`);
        if (!cell) return;
        const idIns = alin[pos.key];
        const opt   = idIns ? opciones.find(o => o.idIns === idIns) : null;
        const rol   = idIns ? rolDeIns[idIns] : null;

        cell.querySelector('.pos-name').textContent = opt ? opt.nombre : '—';
        cell.classList.toggle('filled', !!idIns);
        cell.classList.toggle('selected', celdaActiva === pos.key);

        const chip = cell.querySelector('.rol-chip');
        if (rol) {
            chip.textContent  = rol.chip;
            chip.style.display = '';
            chip.className = `rol-chip text-[8px] font-black px-1 rounded mt-0.5 text-white ${rol.chipColor}`;
        } else {
            chip.style.display = 'none';
        }
    });

    // Libero
    const libId   = alin.libero;
    const libOpt  = libId ? opciones.find(o => o.idIns === libId) : null;
    const libArea = document.getElementById('liberoArea');
    document.getElementById('liberoNombre').textContent = libOpt ? libOpt.label : '— sin asignar —';
    libArea?.classList.toggle('selected', celdaActiva === 'libero');
}

/* ── Render step panel (right column) ── */
function renderStep(r5, opciones, readonly) {
    document.getElementById('panelPosiciones').classList.toggle('hidden', stepActivo !== 'posiciones');
    document.getElementById('panelRoles').classList.toggle('hidden', stepActivo !== 'roles');
    updateStepButtons(r5, opciones);

    if (stepActivo === 'posiciones') renderPanelPosiciones(r5, opciones, readonly);
    else renderPanelRoles(r5, opciones, readonly);
}

/* ── Panel posiciones ── */
function renderPanelPosiciones(r5, opciones, readonly) {
    const alin     = r5.alineacion || {};
    const instrEl  = document.getElementById('instruccionCelda');
    const labelEl  = document.getElementById('celdaSeleccionadaLabel');
    const listaEl  = document.getElementById('listaJugadoresPosicion');

    // Show/hide celda instruction
    if (celdaActiva) {
        instrEl.classList.remove('hidden');
        const posLabel = celdaActiva === 'libero' ? 'Líbero' :
            POSICIONES.find(p => p.key === celdaActiva)?.label || celdaActiva;
        labelEl.textContent = posLabel;
    } else {
        instrEl.classList.add('hidden');
    }

    // Build map pos → idIns
    const asignados = {};
    POSICIONES.forEach(p => { if (alin[p.key]) asignados[alin[p.key]] = p.key; });
    if (alin.libero) asignados[alin.libero] = 'libero';

    listaEl.innerHTML = opciones.map(o => {
        const enPos   = asignados[o.idIns];
        const enLabel = enPos ? (enPos === 'libero' ? 'Líbero' : POSICIONES.find(p => p.key === enPos)?.roman || enPos) : null;
        const isInCeldaActiva = enPos === celdaActiva;

        return `<button
            class="jugador-pill w-full text-left ${enPos ? 'asignado' : ''} ${isInCeldaActiva ? 'ring-2 ring-blue-500' : ''}"
            onclick="asignarJugador(${o.idIns})"
            ${readonly ? 'disabled' : ''}>
            <span class="jugador-num">${o.num}</span>
            <span class="flex-1 truncate">${o.label}</span>
            ${enPos ? `<span class="text-[10px] font-black text-green-600 ml-auto shrink-0">${enLabel}</span>` : ''}
        </button>`;
    }).join('') +
    (celdaActiva ? `<button class="jugador-pill w-full text-left text-red-500 border-red-200 hover:bg-red-50 mt-1" onclick="limpiarCelda()">
        ✕ Quitar jugador de esta posición
    </button>` : '');
}

/* ── Panel roles ── */
function renderPanelRoles(r5, opciones, readonly) {
    const alin  = r5.alineacion || {};
    const roles = r5.roles || {};
    const listaEl = document.getElementById('listaJugadoresRoles');

    // Only jugadores already assigned to positions
    const asignados = POSICIONES
        .map(p => alin[p.key])
        .filter(Boolean)
        .map(idIns => opciones.find(o => o.idIns === idIns))
        .filter(Boolean);

    if (!asignados.length) {
        listaEl.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">Primero asigna jugadores a las posiciones (paso ①)</p>`;
        return;
    }

    listaEl.innerHTML = asignados.map(o => {
        // Find which role key this jugador has
        const rolKey = Object.keys(roles).find(k => roles[k] === o.idIns);
        const rolInfo = rolKey ? ROLES.find(r => r.key === rolKey) : null;

        const opcionesRol = ROLES.map(r => {
            const ocupadoPor = roles[r.key] && roles[r.key] !== o.idIns ? opciones.find(x => x.idIns === roles[r.key])?.nombre : null;
            return `<option value="${r.key}" ${rolKey === r.key ? 'selected' : ''} ${ocupadoPor ? 'disabled' : ''}>
                ${r.label}${ocupadoPor ? ` (${ocupadoPor})` : ''}
            </option>`;
        }).join('');

        return `<div class="rol-row">
            <div class="flex items-center gap-2 min-w-0">
                <span class="jugador-num shrink-0">${o.num}</span>
                <span class="text-xs font-bold text-gray-700 truncate">${o.label}</span>
            </div>
            <select data-ins="${o.idIns}" onchange="onRolChange(this)"
                    class="select select-bordered select-xs font-bold text-xs ml-2 shrink-0 w-36"
                    ${readonly ? 'disabled' : ''}>
                <option value="">— rol —</option>
                ${opcionesRol}
            </select>
        </div>`;
    }).join('');

    // Líbero role row if assigned
    if (alin.libero) {
        const libOpt = opciones.find(o => o.idIns === alin.libero);
        if (libOpt) {
            listaEl.innerHTML += `<div class="rol-row bg-purple-50 border-purple-200">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="jugador-num bg-purple-100 text-purple-700 shrink-0">${libOpt.num}</span>
                    <span class="text-xs font-bold text-purple-700 truncate">${libOpt.label}</span>
                </div>
                <span class="text-[10px] font-black text-purple-600 px-2 py-1 bg-purple-100 rounded">LÍBERO</span>
            </div>`;
        }
    }
}

/* ── Interacciones con la cancha ── */
window.seleccionarCelda = function(posKey) {
    if (stepActivo !== 'posiciones') { setStep('posiciones'); }
    celdaActiva = celdaActiva === posKey ? null : posKey;
    const data  = window.AppDB.get();
    const idP   = parseInt(document.getElementById('selectPartidoR5').value);
    const part  = getMiParticipacion(data, data.partidos.find(p => p.id === idP));
    const r5    = getR5(data, idP, part);
    const ops   = getOpciones(data, idP, part);
    renderCancha(r5, ops);
    renderPanelPosiciones(r5, ops, false);
};

window.asignarJugador = function(idIns) {
    const data    = window.AppDB.get();
    const idP     = parseInt(document.getElementById('selectPartidoR5').value);
    const partido = data.partidos.find(p => p.id === idP);
    const part    = getMiParticipacion(data, partido);
    const r5      = getR5(data, idP, part);
    const alin    = r5.alineacion ? { ...r5.alineacion } : {};

    if (!celdaActiva) {
        // Find next empty position
        const empty = POSICIONES.find(p => !alin[p.key]);
        if (!empty && !alin.libero) return;
        celdaActiva = empty?.key || 'libero';
    }

    // Remove this jugador from any other position first
    POSICIONES.forEach(p => { if (alin[p.key] === idIns) alin[p.key] = null; });
    if (alin.libero === idIns) alin.libero = null;

    alin[celdaActiva] = idIns;

    // Persist in data
    persistR5(data, idP, part, alin, r5.roles || {});

    // Auto-advance to next empty cell
    const allKeys = [...POSICIONES.map(p => p.key)];
    const emptyNext = allKeys.find(k => !alin[k]);
    celdaActiva = emptyNext || null;

    renderTodo();
};

window.limpiarCelda = function() {
    if (!celdaActiva) return;
    const data    = window.AppDB.get();
    const idP     = parseInt(document.getElementById('selectPartidoR5').value);
    const partido = data.partidos.find(p => p.id === idP);
    const part    = getMiParticipacion(data, partido);
    const r5      = getR5(data, idP, part);
    const alin    = { ...(r5.alineacion || {}) };
    alin[celdaActiva] = null;
    persistR5(data, idP, part, alin, r5.roles || {});
    renderTodo();
};

window.onRolChange = function(sel) {
    const idIns   = parseInt(sel.dataset.ins);
    const rolKey  = sel.value;
    const data    = window.AppDB.get();
    const idP     = parseInt(document.getElementById('selectPartidoR5').value);
    const partido = data.partidos.find(p => p.id === idP);
    const part    = getMiParticipacion(data, partido);
    const r5      = getR5(data, idP, part);
    const roles   = { ...(r5.roles || {}) };

    // Remove this jugador from any existing role
    Object.keys(roles).forEach(k => { if (roles[k] === idIns) delete roles[k]; });
    if (rolKey) roles[rolKey] = idIns;

    persistR5(data, idP, part, r5.alineacion || {}, roles);
    renderTodo();
};

/* ── Persistir R5 (sin guardar alert — solo en memoria) ── */
function persistR5(data, idP, part, alin, roles) {
    if (!data.r5) data.r5 = [];
    const idx = data.r5.findIndex(r =>
        r.id_partido === idP && r.id_participacion === part.id && r.numero_set === setActivo
    );
    const registro = {
        id: idx !== -1 ? data.r5[idx].id : window.genId(),
        id_partido: idP, id_participacion: part.id, numero_set: setActivo,
        alineacion: alin, roles
    };
    if (idx !== -1) data.r5[idx] = registro;
    else data.r5.push(registro);
    window.AppDB.save(data);
}

/* ── Validación ── */
function renderValidacion(r5, opciones) {
    const sec   = document.getElementById('secValidacion');
    const alin  = r5.alineacion || {};
    const roles = r5.roles || {};
    const msgs  = [];

    const posCompletas = POSICIONES.every(p => alin[p.key]);
    if (!posCompletas) {
        const faltanPos = POSICIONES.filter(p => !alin[p.key]).map(p => p.roman).join(', ');
        msgs.push({ tipo: 'warn', txt: `Posiciones vacías: ${faltanPos}` });
    }

    const rolesAsignados = ROLES.map(r => r.key).filter(k => roles[k]);
    if (rolesAsignados.length < 6) {
        msgs.push({ tipo: 'warn', txt: `Faltan ${6 - rolesAsignados.length} roles por asignar` });
    }

    if (msgs.length === 0) {
        sec.innerHTML = `<p class="text-[11px] text-green-600 font-bold">✅ Formación completa</p>`;
    } else {
        sec.innerHTML = msgs.map(m =>
            `<p class="text-[11px] font-semibold ${m.tipo === 'error' ? 'text-red-500' : 'text-amber-600'}">${m.tipo === 'error' ? '❌' : '⚠️'} ${m.txt}</p>`
        ).join('');
    }
}

/* ── Guardar ── */
window.guardarR5Set = function() {
    const data    = window.AppDB.get();
    const idP     = parseInt(document.getElementById('selectPartidoR5').value);
    const partido = data.partidos.find(p => p.id === idP);
    const part    = getMiParticipacion(data, partido);
    const r5      = getR5(data, idP, part);

    const alin  = r5.alineacion || {};
    const roles = r5.roles || {};

    if (!POSICIONES.every(p => alin[p.key])) {
        alert('Completa las 6 posiciones antes de guardar.'); return;
    }
    if (ROLES.filter(r => r.key !== 'libero').some(r => !roles[r.key])) {
        alert('Asigna los 6 roles (armador, opuesto, 2 puntas, 2 centrales) antes de guardar.'); return;
    }

    // Data already persisted on every change — just confirm
    if (typeof registrarActividad === 'function')
        registrarActividad('R5_GUARDADO', `R5 Set ${setActivo} guardado — partido #${idP}`);

    // Visual feedback without alert
    const btn = document.getElementById('btnGuardar');
    const orig = btn.innerHTML;
    btn.innerHTML = '✅ Guardado';
    btn.classList.replace('bg-blue-600', 'bg-green-600');
    setTimeout(() => { btn.innerHTML = orig; btn.classList.replace('bg-green-600', 'bg-blue-600'); }, 1500);
};
