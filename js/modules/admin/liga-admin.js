document.addEventListener('DOMContentLoaded', () => {
    inicializarFiltros();
    renderLiga();
});

// 1. Cargar filtros
function inicializarFiltros() {
    const data = DataManager.getAll();
    const selCat = document.getElementById('selCat');
    const selRama = document.getElementById('selRama');

    data.categoriasTorneo.forEach(c => selCat.innerHTML += `<option value="${c.id}">${c.nombre}</option>`);
    data.ramas.forEach(r => selRama.innerHTML += `<option value="${r.id}">${r.nombre}</option>`);
}

// 2. Renderizar Grupos (Solo mira el estado 'aprobado')
window.renderLiga = () => {
    const cat = document.getElementById('selCat').value;
    const rama = document.getElementById('selRama').value;
    const grid = document.getElementById('gridGrupos');
    
    if (!cat || !rama) return;

    const data = DataManager.getAll();
    // Filtro simplificado: solo estado 'aprobado'
    const equiposAprobados = data.equipos.filter(e => e.estado === 'aprobado');

    grid.innerHTML = ['A', 'B', 'C', 'D'].map(g => `
        <div class="card-admin">
            <h2 class="font-black text-blue-600 mb-4">GRUPO ${g}</h2>
            <div class="space-y-2 min-h-[100px]">
                ${equiposAprobados
                    .filter(e => e.grupo === g && e.categoria_torneo == cat && e.rama == rama)
                    .map(e => `
                        <div class="p-2 bg-blue-50 text-blue-800 rounded font-bold text-xs flex justify-between items-center">
                            ${e.nombre}
                            <button onclick="quitarEquipo(${e.id})" class="text-red-500 font-black">x</button>
                        </div>
                    `).join('')}
            </div>
            <button class="btn btn-xs w-full mt-4" onclick="abrirModalAsignar('${g}')">+ Asignar Equipo</button>
        </div>
    `).join('');
};

// 3. Modal: Equipos aprobados sin grupo
window.abrirModalAsignar = (grupo) => {
    const data = DataManager.getAll();
    const select = document.getElementById('selectEquipo');
    
    const sinGrupo = data.equipos.filter(e => e.estado === 'aprobado' && !e.grupo);

    select.innerHTML = sinGrupo.length > 0 
        ? sinGrupo.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('')
        : '<option disabled>No hay equipos disponibles</option>';
        
    document.getElementById('modalAsignar').dataset.grupoDestino = grupo;
    document.getElementById('modalAsignar').showModal();
};

window.confirmarAsignacion = () => {
    const idEquipo = document.getElementById('selectEquipo').value;
    if (!idEquipo) return;
    
    const grupo = document.getElementById('modalAsignar').dataset.grupoDestino;
    const cat = document.getElementById('selCat').value;
    const rama = document.getElementById('selRama').value;

    let data = DataManager.getAll();
    let equipo = data.equipos.find(e => e.id == idEquipo);
    
    equipo.grupo = grupo;
    equipo.categoria_torneo = parseInt(cat);
    equipo.rama = parseInt(rama);

    DataManager.save(data);
    document.getElementById('modalAsignar').close();
    renderLiga();
};

window.quitarEquipo = (id) => {
    let data = DataManager.getAll();
    let equipo = data.equipos.find(e => e.id == id);
    equipo.grupo = null;
    DataManager.save(data);
    renderLiga();
};
function logout() {
    localStorage.clear();
    window.location.href = "../../index.html";
}