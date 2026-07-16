// admin-liga.js - ESTRUCTURA LIMPIA Y CORREGIDA

// 1. Variables Globales
let catSeleccionada = null;

// 2. Función de acceso a datos (Prioridad: localStorage)
const getAppData = () => {
    try {
        const local = localStorage.getItem('volleyData');
        if (local) return JSON.parse(local);
    } catch (e) { console.error("Error al leer localStorage:", e); }
    return window.VolleyAppData;
};

const guardarDatos = (data) => window.AppDB
    ? window.AppDB.save(data)
    : localStorage.setItem('volleyData', JSON.stringify(data));

// 3. Render Categorías
const renderCategorias = () => {
    const container = document.getElementById('gridGrupos');
    if (!container) return;
    container.innerHTML = ''; 

    const grid = document.createElement('div');
    grid.className = "grid grid-cols-1 md:grid-cols-3 gap-6";

    const data = getAppData();
    data.categoriasTorneo.forEach(cat => {
        const card = document.createElement('div');
        card.className = "card-admin cursor-pointer hover:shadow-xl transition-all p-8 border-2 border-transparent hover:border-blue-600 rounded-2xl bg-white text-center shadow-sm";
        card.innerHTML = `<h3 class="font-black text-xl uppercase">${(window.escapeHtml ? window.escapeHtml(cat.nombre) : (cat.nombre || ''))}</h3>`;
        
        card.onclick = () => {
            catSeleccionada = cat.id;
            renderGrupos();
        };
        grid.appendChild(card);
    });
    
    container.appendChild(grid);
};

// 4. Función global de asignación (abre el modal)
window.prepararAsignacion = (grupo, ramaId) => {
    const data = getAppData();
    const select = document.getElementById('selectEquipo');
    if (!select) return;

    select.innerHTML = '<option value="">Selecciona equipo...</option>';
    const disponibles = data.equipos.filter(eq => {
        const p = data.participaciones.find(x => x.id_equipo === eq.id && x.id_categoria_torneo === catSeleccionada && x.id_rama === ramaId);
        return p && (!p.grupo || p.grupo === "") && eq.activo !== false;
    });

    disponibles.forEach(eq => select.innerHTML += `<option value="${eq.id}">${(window.escapeHtml ? window.escapeHtml(eq.nombre) : (eq.nombre || ''))}</option>`);
    window.tempAsignacion = { grupo, ramaId };
    document.getElementById('modalAsignar')?.showModal();
};

/**
 * FIX: liga-admin.html tiene un botón `<button onclick="confirmarAsignacion()">Guardar</button>`
 * dentro del modal, pero esta función NUNCA estaba definida en este archivo. Al tocar
 * "Guardar" se disparaba un ReferenceError y jamás se asignaba ningún equipo a un grupo.
 * Ahora sí se define, usando lo que prepararAsignacion() dejó guardado en
 * window.tempAsignacion (grupo + rama) junto con la categoría seleccionada
 * (catSeleccionada) y el equipo elegido en el <select>.
 */
window.confirmarAsignacion = () => {
    const idEquipo = parseInt(document.getElementById('selectEquipo').value);
    if (!idEquipo) {
        alert('Selecciona un equipo.');
        return;
    }
    if (!window.tempAsignacion) return;

    const { grupo, ramaId } = window.tempAsignacion;
    const data = getAppData();

    const participacion = data.participaciones.find(p =>
        p.id_equipo === idEquipo &&
        p.id_categoria_torneo === catSeleccionada &&
        p.id_rama === ramaId
    );

    if (!participacion) {
        alert('No se encontró la participación de ese equipo en esta categoría/rama.');
        return;
    }

    participacion.grupo = grupo;
    guardarDatos(data);

    window.tempAsignacion = null;
    document.getElementById('modalAsignar')?.close();
    renderGrupos();
};

// 5. Render Grupos (Lógica de filtrado optimizada)
const renderGrupos = () => {
    const data = getAppData(); 
    const mainContainer = document.getElementById('gridGrupos');
    mainContainer.innerHTML = ''; 

    const btnVolver = document.createElement('button');
    btnVolver.innerHTML = "← Volver a categorías";
    btnVolver.className = "text-blue-600 font-bold mb-4 hover:underline";
    btnVolver.onclick = renderCategorias;
    mainContainer.appendChild(btnVolver);

    data.ramas.forEach(rama => {
        const ramaSection = document.createElement('section');
        ramaSection.innerHTML = `
            <h2 class="text-2xl font-black text-gray-800 uppercase mb-6 pb-2 border-b-4 border-blue-500">
                ${(window.escapeHtml ? window.escapeHtml(rama.nombre) : (rama.nombre || ''))}
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10"></div>
        `;

        const subGrid = ramaSection.querySelector('.grid');

        ['A', 'B', 'C', 'D'].forEach(g => {
            // Solo mostramos participaciones donde 'aprobado' sea true
            const equiposEnGrupo = data.participaciones.filter(p =>
                p.id_categoria_torneo === catSeleccionada &&
                p.id_rama === rama.id &&
                p.grupo === g &&
                p.aprobado === true
            );

            const card = document.createElement('article');
            card.className = "card-admin bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col justify-between";

            let htmlEquipos = equiposEnGrupo.map(p => {
                const eq = data.equipos.find(e => e.id === p.id_equipo);
                return `<p class="bg-gray-50 text-gray-700 text-xs font-semibold p-2 rounded text-center uppercase mb-1">${eq ? eq.nombre : '...'}</p>`;
            }).join('');

            card.innerHTML = `
                <div class="mb-4">
                    <h3 class="font-bold text-blue-600 text-center uppercase mb-3">Grupo ${g}</h3>
                    <div class="space-y-1">${htmlEquipos || '<p class="text-gray-400 text-[10px] text-center italic">Vacío</p>'}</div>
                </div>
            `;

            const btnAsignar = document.createElement('button');
            btnAsignar.className = "btn btn-sm w-full btn-outline border-blue-600 text-blue-600";
            btnAsignar.textContent = "+ Asignar";
            btnAsignar.onclick = () => window.prepararAsignacion(g, rama.id);

            card.appendChild(btnAsignar);
            subGrid.appendChild(card);
        });

        mainContainer.appendChild(ramaSection);
    });
};

// 6. Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Si los datos ya están en el window, renderizamos
    if (window.VolleyAppData) renderCategorias();
});
function logout() {
    localStorage.removeItem("session_admin");
    localStorage.removeItem("session_delegado_id");
    localStorage.removeItem("session_equipo_id");
    window.location.href = "../../index.html";
}