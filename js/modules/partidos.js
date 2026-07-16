function escHTML(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

let _data      = null;
let _tabEstado = 'todos';
let _tabCancha = 'todas';

document.addEventListener('DOMContentLoaded', () => {
    _data = window.AppDB
        ? window.AppDB.get()
        : (JSON.parse(localStorage.getItem('volleyData')) || window.VolleyAppData);
    if (!_data) return;

    poblarFiltros();

    // Default: start on Próximos and pre-select the next scheduled date
    const fechaProxima = proximaFechaAgendada();
    if (fechaProxima) {
        const sel = document.getElementById('filtroFecha');
        if (sel) sel.value = fechaProxima;
    }

    setTab('proximos');

    document.getElementById('filtroTexto')?.addEventListener('input', renderPartidos);
    document.getElementById('filtroFecha')?.addEventListener('change', renderPartidos);
    document.getElementById('filtroCategoria')?.addEventListener('change', renderPartidos);
    document.getElementById('filtroRama')?.addEventListener('change', renderPartidos);

    window.verDetallePartido = (id) => {
        window.location.href = `estadisticas-partido.html?id=${id}`;
    };
});

/* ── Helpers ── */
function normEstado(e) { return String(e || '').toUpperCase().trim(); }

function proximaFechaAgendada() {
    if (!_data) return null;
    const hoy = new Date().toISOString().slice(0, 10);
    const fechas = _data.partidos
        .filter(p => normEstado(p.estado) !== 'FINALIZADO' && p.fecha >= hoy)
        .map(p => p.fecha)
        .sort();
    return fechas[0] || null;
}

/* ── Poblar filtros ── */
function poblarFiltros() {
    // Fechas distintas
    const selFecha = document.getElementById('filtroFecha');
    if (selFecha) {
        const fechas = [...new Set(_data.partidos.map(p => p.fecha).filter(Boolean))].sort();
        fechas.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f;
            // Format nicely: "Sáb 14 Jun" style
            try {
                const d = new Date(f + 'T12:00:00');
                opt.textContent = d.toLocaleDateString('es-EC', { weekday:'short', day:'numeric', month:'short' });
            } catch {
                opt.textContent = f;
            }
            selFecha.appendChild(opt);
        });
    }

    const selCat  = document.getElementById('filtroCategoria');
    const selRama = document.getElementById('filtroRama');
    _data.categoriasTorneo.forEach(c => {
        selCat.innerHTML += `<option value="${c.id}">${escHTML(c.nombre)}</option>`;
    });
    _data.ramas.forEach(r => {
        selRama.innerHTML += `<option value="${r.id}">${escHTML(r.nombre)}</option>`;
    });
}

/* ── Tabs estado ── */
window.setTab = function(tab) {
    _tabEstado = tab;
    ['tabTodos','tabProximos','tabResultados'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const isActive = id === `tab${tab.charAt(0).toUpperCase()+tab.slice(1)}`;
        el.className = 'tab-btn px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all '
            + (isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100');
    });
    renderPartidos();
};

/* ── Filter & sort ── */
function filtrarPartidos() {
    const texto  = document.getElementById('filtroTexto')?.value.toLowerCase().trim() || '';
    const fecha  = document.getElementById('filtroFecha')?.value || '';
    const catId  = parseInt(document.getElementById('filtroCategoria')?.value) || 0;
    const ramaId = parseInt(document.getElementById('filtroRama')?.value) || 0;

    let lista = [..._data.partidos];

    if (_tabEstado === 'proximos')   lista = lista.filter(p => normEstado(p.estado) !== 'FINALIZADO');
    if (_tabEstado === 'resultados') lista = lista.filter(p => normEstado(p.estado) === 'FINALIZADO');

    lista = lista.filter(p => {
        const lp = _data.participaciones.find(x => x.id === p.id_local_participacion);
        const vp = _data.participaciones.find(x => x.id === p.id_visitante_participacion);
        const el = _data.equipos.find(e => e.id === lp?.id_equipo);
        const ev = _data.equipos.find(e => e.id === vp?.id_equipo);
        if (texto  && !(el?.nombre||'').toLowerCase().includes(texto)
                   && !(ev?.nombre||'').toLowerCase().includes(texto)) return false;
        if (fecha  && p.fecha !== fecha)             return false;
        if (catId  && lp?.id_categoria_torneo !== catId)  return false;
        if (ramaId && lp?.id_rama !== ramaId)              return false;
        return true;
    });

    lista.sort((a, b) => {
        const da = new Date(a.fecha + 'T' + (a.hora || '00:00'));
        const db = new Date(b.fecha + 'T' + (b.hora || '00:00'));
        return _tabEstado === 'resultados' ? db - da : da - db;
    });

    return lista;
}

/* ── Render ── */
function renderPartidos() {
    const lista = filtrarPartidos();

    const contador = document.getElementById('contadorPartidos');
    if (contador) contador.textContent = `${lista.length} partido${lista.length !== 1 ? 's' : ''}`;

    const canchas       = [...new Set(lista.map(p => p.ubicacion).filter(Boolean))].sort();
    const usarTabs      = canchas.length >= 2;
    const tabsContainer = document.getElementById('canchaTabsContainer');
    const listaSimple   = document.getElementById('listaPartidos');

    if (usarTabs) {
        tabsContainer.classList.remove('hidden');
        listaSimple.classList.add('hidden');
        renderCanchaTabs(canchas, lista);
    } else {
        tabsContainer.classList.add('hidden');
        listaSimple.classList.remove('hidden');
        listaSimple.innerHTML = lista.length === 0
            ? `<div class="col-span-2 text-center py-16 text-gray-400 font-semibold">
                <p class="text-4xl mb-3">🏐</p><p>No hay partidos con ese filtro.</p></div>`
            : lista.map(buildCard).join('');
    }
}

function renderCanchaTabs(canchas, lista) {
    const tabBtns  = document.getElementById('canchaTabBtns');
    const columnas = document.getElementById('canchaColumnas');
    if (_tabCancha !== 'todas' && !canchas.includes(_tabCancha)) _tabCancha = 'todas';

    const allCls = _tabCancha === 'todas' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200';
    tabBtns.innerHTML = `<button onclick="setCanchaTab('todas')"
        class="px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${allCls}">
        🏐 Todas</button>` + canchas.map(c => {
        const cls = _tabCancha === c ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200';
        return `<button onclick="setCanchaTab('${escHTML(c)}')"
            class="px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${cls}">
            📍 ${escHTML(c)}</button>`;
    }).join('');

    const visible = _tabCancha === 'todas' ? canchas : [_tabCancha];
    const cols = visible.length;
    columnas.className = `grid gap-6 grid-cols-1${cols >= 2 ? ' md:grid-cols-2' : ''}${cols >= 3 ? ' lg:grid-cols-3' : ''}`;

    if (_tabCancha === 'todas') {
        columnas.innerHTML = canchas.map(cancha => {
            const pList = lista.filter(p => p.ubicacion === cancha);
            return `<div>
                <div class="flex items-center gap-2 mb-3">
                    <span class="text-sm font-black text-gray-700 uppercase">📍 ${escHTML(cancha)}</span>
                    <span class="badge badge-ghost badge-sm font-bold">${pList.length}</span>
                </div>
                <div class="space-y-3">${pList.map(buildCard).join('')}</div>
                ${!pList.length ? `<p class="text-gray-400 italic text-sm text-center py-4">Sin partidos.</p>` : ''}
            </div>`;
        }).join('');
    } else {
        const pList = lista.filter(p => p.ubicacion === _tabCancha);
        columnas.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-full">
            ${pList.length ? pList.map(buildCard).join('') : `<p class="text-gray-400 italic text-sm col-span-2 text-center py-8">Sin partidos en esta cancha.</p>`}
        </div>`;
    }
}

window.setCanchaTab = function(cancha) {
    _tabCancha = cancha;
    renderPartidos();
};

function buildCard(p) {
    const lp  = _data.participaciones.find(x => x.id === p.id_local_participacion);
    const vp  = _data.participaciones.find(x => x.id === p.id_visitante_participacion);
    const eqL = _data.equipos.find(e => e.id === lp?.id_equipo);
    const eqV = _data.equipos.find(e => e.id === vp?.id_equipo);
    const cat = _data.categoriasTorneo.find(c => c.id === lp?.id_categoria_torneo);
    const ram = _data.ramas.find(r => r.id === lp?.id_rama);

    const estado = normEstado(p.estado);
    let sL = 0, sV = 0;
    (p.sets || []).forEach(s => { if (s.local > s.visitante) sL++; else sV++; });
    const lGano = sL > sV, vGano = sV > sL, porJugar = !sL && !sV && estado !== 'FINALIZADO';

    const strSets = p.sets?.length
        ? p.sets.map(s => `<span class="bg-slate-50 border border-slate-200 text-slate-500 px-2 py-0.5 rounded text-[11px] font-semibold">${s.local}–${s.visitante}</span>`).join(' ')
        : '<span class="text-slate-400 italic text-[11px]">Por jugar</span>';

    const estadoBadge = estado === 'FINALIZADO'
        ? (p.wo ? '<span class="badge badge-warning badge-sm text-white font-bold">W.O.</span>'
                : '<span class="badge badge-ghost badge-sm font-bold">Finalizado</span>')
        : estado === 'EN_PROGRESO'
        ? '<span class="badge badge-error badge-sm text-white font-bold animate-pulse">En vivo</span>'
        : '<span class="badge badge-sm font-bold" style="background:#fef3c7;color:#92400e">Programado</span>';

    const border = estado === 'FINALIZADO' ? 'border-l-slate-400'
                 : estado === 'EN_PROGRESO' ? 'border-l-red-500'
                 : 'border-l-blue-500';

    return `
    <div class="bg-white rounded-xl border border-slate-200 border-l-4 ${border} shadow-sm hover:shadow-md transition-all cursor-pointer p-4"
         onclick="verDetallePartido(${p.id})">
        <div class="flex justify-between items-start mb-2 text-xs text-slate-500">
            <div>
                <span>📅 ${p.fecha}</span>
                <span class="mx-1 text-slate-300">·</span>
                <span>🕒 ${p.hora || '—'}</span>
            </div>
            ${estadoBadge}
        </div>
        <span class="inline-block bg-blue-50 text-blue-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-blue-100 mb-3">
            🏆 ${escHTML(cat?.nombre||'—')} · ${escHTML(ram?.nombre||'—')}
        </span>
        <div class="grid grid-cols-7 items-center gap-1">
            <div class="col-span-2 text-center ${!porJugar && !lGano ? 'opacity-40' : ''}">
                <div class="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-base mx-auto mb-1">🛡️</div>
                <span class="text-xs font-bold text-slate-800 leading-tight">${escHTML(eqL?.nombre||'Local')}</span>
            </div>
            <div class="col-span-3 flex flex-col items-center">
                <div class="flex items-center gap-3 text-2xl font-black text-slate-800">
                    <span class="${lGano?'text-blue-600':''}"> ${sL}</span>
                    <span class="text-slate-300 text-xl font-light">–</span>
                    <span class="${vGano?'text-blue-600':''}"> ${sV}</span>
                </div>
                <div class="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">sets</div>
            </div>
            <div class="col-span-2 text-center ${!porJugar && !vGano ? 'opacity-40' : ''}">
                <div class="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-base mx-auto mb-1">🛡️</div>
                <span class="text-xs font-bold text-slate-800 leading-tight">${escHTML(eqV?.nombre||'Visitante')}</span>
            </div>
        </div>
        <div class="flex justify-center gap-1 mt-3 pt-2 border-t border-slate-50">${strSets}</div>
    </div>`;
}

function logout() {
    localStorage.removeItem('session_admin');
    localStorage.removeItem('session_delegado_id');
    localStorage.removeItem('session_equipo_id');
    window.location.href = '../index.html';
}
