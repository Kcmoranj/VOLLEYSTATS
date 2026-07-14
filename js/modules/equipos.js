document.addEventListener('DOMContentLoaded', () => {
    renderEquipos();
});

function renderEquipos() {
    // FIX: DataManager solo expone getAppData() y save() (ver js/data-manager.js).
    // DataManager.getAll() no existe: esta llamada tiraba
    // "DataManager.getAll is not a function" y la página nunca renderizaba nada.
    const data = DataManager.getAppData();
    const tbody = document.getElementById('tablaEquipos');
    
    tbody.innerHTML = data.equipos.map(e => `
        <tr class="hover:bg-gray-50 cursor-pointer" onclick="abrirDetalle(${e.id})">
            <td class="font-bold">${e.nombre}</td>
            <td>${e.pago_estado ? '✅ Habilitado' : '❌ Inhabilitado'}</td>
            <td><button class="btn btn-xs btn-outline">Ver</button></td>
        </tr>
    `).join('');
}

window.abrirDetalle = (id) => {
    const data = DataManager.getAppData();
    const e = data.equipos.find(x => x.id === id);
    
    document.getElementById('nombreEquipo').textContent = e.nombre;
    const btn = document.getElementById('btnPago');
    btn.className = `btn btn-sm w-full mb-6 text-white ${e.pago_estado ? 'btn-success' : 'btn-error'}`;
    btn.textContent = e.pago_estado ? 'Habilitado' : 'Inhabilitado';
    btn.dataset.id = e.id;

    // FIX: las inscripciones no tienen un campo `id_equipo` (ese campo no existe
    // en el modelo de datos). Cada inscripción apunta a una `id_participacion`,
    // y es la participación la que tiene `id_equipo`. El filtro anterior
    // (`ins.id_equipo === e.id`) siempre daba una lista vacía. Ahora se resuelve
    // primero qué participaciones pertenecen a este equipo, y luego se filtran
    // las inscripciones que pertenezcan a esas participaciones.
    const idsParticipacionesDelEquipo = data.participaciones
        .filter(p => p.id_equipo === e.id)
        .map(p => p.id);

    const jugadores = data.inscripciones
        .filter(ins => idsParticipacionesDelEquipo.includes(ins.id_participacion))
        .map(ins => data.jugadores.find(j => j.id === ins.id_jugador)?.nombre || "Desconocido");
    
    document.getElementById('listaJugadoresEquipo').innerHTML = jugadores
        .map(n => `<li class="p-2 bg-gray-50 rounded text-sm font-medium">${n}</li>`).join('');

    document.getElementById('modalDetalle').showModal();
};

window.togglePago = () => {
    const id = parseInt(document.getElementById('btnPago').dataset.id);
    let data = DataManager.getAppData();
    let e = data.equipos.find(x => x.id === id);
    
    e.pago_estado = !e.pago_estado;
    DataManager.save(data);
    renderEquipos();
    abrirDetalle(id); // Recarga el modal
};
function logout() {
    localStorage.clear();
    window.location.href = "../index.html";
}