document.addEventListener('DOMContentLoaded', () => {
    // 1. FUSIÓN Y CARGA DE DATOS DE FORMA SEGURA
    let data = null;
    const localData = localStorage.getItem('volleyData');
    
    // Cargamos de volleyData o en su defecto de VolleyAppData (mock-data)
    data = localData ? JSON.parse(localData) : window.VolleyAppData;

    // FIX (doble fuente de verdad para jugadores): antes acá se inyectaba también
    // lo guardado en 'volley_jugadores', pisando lo que ya venía en 'volleyData'.
    // Como Solicitudes (aprobar/rechazar jugador) solo actualiza 'volleyData',
    // esa segunda copia podía quedar vieja y mostrar datos desactualizados
    // (jugadores rechazados que "reaparecen", aprobaciones que no se reflejan).
    // 'volleyData' es ahora la única fuente de verdad.

    if (!data) {
        console.error("No se pudieron cargar los datos.");
        return;
    }

    // 2. Referencias a elementos del DOM
    const grid = document.getElementById('gridJugadores');
    const inputBuscar = document.getElementById('inputBuscarJugador');
    const pNombre = document.getElementById('perfil_nombre');
    const pCategoria = document.getElementById('perfil_categoria');
    const pInscripciones = document.getElementById('perfil_inscripciones');

    // 3. Función render principal
    window.renderJugadores = (filtro = "") => {
        if (!grid) return;
        grid.innerHTML = "";
        
        const jugadoresFiltrados = data.jugadores.filter(j => 
            j.nombre.toLowerCase().includes(filtro.toLowerCase())
        );

        jugadoresFiltrados.forEach(j => {
            const catJugador = data.categoriasJugador.find(c => c.id === j.id_categoria_jugador);
            
            grid.innerHTML += `
            <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="avatar placeholder">
                        <div class="bg-slate-100 text-slate-400 rounded-full w-12 flex items-center justify-center">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"></path></svg>
                        </div>
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-800 text-sm leading-tight">${j.nombre}</h4>
                        <span class="badge badge-ghost badge-sm font-bold text-blue-600 mt-1">${catJugador?.nombre || 'Sin categoría'}</span>
                    </div>
                </div>
                <label for="modal_perfil" onclick="verPerfilJugador(${j.id})" class="btn btn-primary btn-sm rounded-lg text-white font-bold cursor-pointer">
                    Ver Perfil
                </label>
            </div>`;
        });
    };

    // 4. Función abrir perfil
    window.verPerfilJugador = (id) => {
        const jugador = data.jugadores.find(j => j.id === id);
        if (!jugador) return;

        const catJugador = data.categoriasJugador.find(c => c.id === jugador.id_categoria_jugador);

        if (pNombre) pNombre.innerText = jugador.nombre;
        if (pCategoria) pCategoria.innerText = `Categoría del Jugador: ${catJugador?.nombre || '-'}`;

        const inscripciones = data.inscripciones.filter(i => i.id_jugador === id);
        if (!pInscripciones) return;
        pInscripciones.innerHTML = "";

        if (inscripciones.length === 0) {
            pInscripciones.innerHTML = `<p class="text-gray-400 text-center text-sm italic">Sin inscripciones activas.</p>`;
        } else {
            inscripciones.forEach(ins => {
                const participacion = data.participaciones.find(p => p.id === ins.id_participacion);
                
                const eq = data.equipos.find(e => e.id === participacion?.id_equipo);
                const rama = data.ramas.find(r => r.id === participacion?.id_rama);
                const catTorneo = data.categoriasTorneo.find(ct => ct.id === participacion?.id_categoria_torneo);

                pInscripciones.innerHTML += `
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center mb-2">
                    <div>
                        <p class="font-bold text-gray-800 text-sm">${eq?.nombre || 'Sin equipo'}</p>
                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">
                            ${catTorneo?.nombre || '-'} • ${rama?.nombre || '-'}
                        </p>
                    </div>
                    <div class="text-center">
                        <p class="text-[10px] text-gray-400 font-bold uppercase">Camiseta</p>
                        <p class="text-xl font-black text-blue-600 leading-none mt-1">#${ins.numero_camiseta}</p>
                    </div>
                </div>`;
            });
        }
    };

    // 5. Eventos
    inputBuscar?.addEventListener('input', (e) => renderJugadores(e.target.value));
    
    // Renderizado inicial con los datos fusionados
    renderJugadores(); 
});

// 6. CERRAR SESIÓN SEGURO (Mantiene a salvo tus datos creados)
function logout() {
    localStorage.removeItem('isLoggedIn'); 
    localStorage.removeItem('userToken');
    window.location.href = "../index.html";
}