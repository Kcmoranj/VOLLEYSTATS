/** Escapa HTML para prevenir XSS al insertar datos de usuario en innerHTML */
function escHTML(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
/**
 * liga-admin.js
 * Módulo de liga para la vista admin.
 * Usa window.AppDB como única fuente de datos.
 */

document.addEventListener('DOMContentLoaded', () => {
    inicializarFiltros();
    renderLiga();
});

function inicializarFiltros() {
    const data = window.AppDB.get();
    const selCat  = document.getElementById('selCat');
    const selRama = document.getElementById('selRama');
    if (!selCat || !selRama) return;
    data.categoriasTorneo.forEach(c => { selCat.innerHTML  += `<option value="${c.id}">${c.nombre}</option>`; });
    data.ramas.forEach(r =>            { selRama.innerHTML += `<option value="${r.id}">${r.nombre}</option>`; });
}

window.renderLiga = () => {
    const cat  = document.getElementById('selCat')?.value;
    const rama = document.getElementById('selRama')?.value;
    const grid = document.getElementById('gridGrupos');
    if (!cat || !rama || !grid) return;

    const data = window.AppDB.get();
    const participaciones = data.participaciones.filter(p =>
        p.aprobado &&
        String(p.id_categoria_torneo) === String(cat) &&
        String(p.id_rama) === String(rama)
    );

    grid.innerHTML = ['A', 'B', 'C', 'D'].map(g => {
        const enGrupo = participaciones.filter(p => p.grupo === g);
        const items = enGrupo.map(p => {
            const eq = data.equipos.find(e => e.id === p.id_equipo);
            return `<div class="p-2 bg-blue-50 text-blue-800 rounded font-bold text-xs flex justify-between items-center">
                ${escHTML(eq?.nombre || '-'}
                <button onclick="quitarDeGrupo(${p.id})" class="text-red-500 font-black ml-2">×</button>
            </div>`;
        }).join('');
        return `<div class="card-admin">
            <h2 class="font-black text-blue-600 mb-4">GRUPO ${g}</h2>
            <div class="space-y-2 min-h-[100px]">
                ${items || '<p class="text-gray-300 text-xs italic">Sin equipos</p>'}
            </div>
            <button class="btn btn-xs w-full mt-4" onclick="abrirModalAsignarGrupo('${g}')">+ Asignar Equipo</button>
        </div>`;
    }).join('');
};

window.abrirModalAsignarGrupo = (grupo) => {
    const cat  = document.getElementById('selCat')?.value;
    const rama = document.getElementById('selRama')?.value;
    const data = window.AppDB.get();
    const sel  = document.getElementById('selectEquipo');
    if (!sel) return;

    const sinGrupo = data.participaciones.filter(p =>
        p.aprobado &&
        String(p.id_categoria_torneo) === String(cat) &&
        String(p.id_rama) === String(rama) &&
        !p.grupo
    );

    sel.innerHTML = sinGrupo.length > 0
        ? sinGrupo.map(p => {
            const eq = data.equipos.find(e => e.id === p.id_equipo);
            return `<option value="${p.id}">${escHTML(eq?.nombre || p.id}</option>`;
          }).join('')
        : '<option disabled>No hay equipos disponibles</option>';

    const modal = document.getElementById('modalAsignar');
    if (modal) { modal.dataset.grupoDestino = grupo; modal.showModal(); }
};

window.confirmarAsignacion = () => {
    const idPart = parseInt(document.getElementById('selectEquipo')?.value);
    if (!idPart) return;
    const grupo = document.getElementById('modalAsignar')?.dataset.grupoDestino;
    const data  = window.AppDB.get();
    const p     = data.participaciones.find(x => x.id === idPart);
    if (p) p.grupo = grupo;
    window.AppDB.save(data);
    document.getElementById('modalAsignar')?.close();
    renderLiga();
};

window.quitarDeGrupo = (idPart) => {
    const data = window.AppDB.get();
    const p    = data.participaciones.find(x => x.id === idPart);
    if (p) p.grupo = null;
    window.AppDB.save(data);
    renderLiga();
};

function logout() {
    localStorage.removeItem('session_admin');
    localStorage.removeItem('session_delegado_id');
    localStorage.removeItem('session_equipo_id');
    window.location.href = '../../index.html';
}