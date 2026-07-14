document.addEventListener('DOMContentLoaded', renderPartidos);

function renderPartidos() {
    const data = DataManager.getAll();
    const contenedor = document.getElementById('listaPartidos');
    
    contenedor.innerHTML = data.partidos.map(p => {
        const local = data.equipos.find(e => e.id == p.id_local)?.nombre;
        const visitante = data.equipos.find(e => e.id == p.id_visitante)?.nombre;
        
        return `
            <div class="card-admin flex justify-between items-center">
                <div>
                    <p class="font-black text-sm">${local} vs ${visitante}</p>
                    <p class="text-[10px] text-gray-400 font-bold uppercase">${p.fecha || 'Sin programar'} - ${p.hora || '--:--'}</p>
                </div>
                <button onclick="abrirModal(${p.id})" class="btn btn-xs">Programar</button>
            </div>
        `;
    }).join('');
}


window.abrirModal = (id) => {
    document.getElementById('modalPartido').dataset.id = id;
    document.getElementById('modalPartido').showModal();
};

window.guardarProgramacion = () => {
    const id = document.getElementById('modalPartido').dataset.id;
    const fecha = document.getElementById('inputFecha').value;
    const hora = document.getElementById('inputHora').value;
    
    let data = DataManager.getAll();
    let p = data.partidos.find(x => x.id == id);
    p.fecha = fecha;
    p.hora = hora;
    
    DataManager.save(data);
    document.getElementById('modalPartido').close();
    renderPartidos();
};
function logout() {
    localStorage.clear();
    window.location.href = "../../index.html";
}