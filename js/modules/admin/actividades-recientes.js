document.addEventListener('DOMContentLoaded', () => {
    renderizarActividades();
 
    const btnLimpiar = document.getElementById('btnLimpiarActividades');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarActividades);
    }
});
 
const ESTILOS_TIPO = {
    PARTIDO_CREADO:    { texto: 'Partido creado',     clase: 'bg-blue-100 text-blue-700' },
    PARTIDO_EDITADO:   { texto: 'Partido editado',    clase: 'bg-amber-100 text-amber-700' },
    PARTIDO_ELIMINADO: { texto: 'Partido eliminado',  clase: 'bg-red-100 text-red-700' },
    ESTADO_CAMBIADO:   { texto: 'Estado de partido',  clase: 'bg-purple-100 text-purple-700' },
    STATS_GUARDADAS:   { texto: 'Estadísticas',       clase: 'bg-green-100 text-green-700' }
};
 
function formatearFecha(isoString) {
    const fecha = new Date(isoString);
    return fecha.toLocaleString('es-EC', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}
 
function renderizarActividades() {
    const tbody = document.getElementById('listaActividades');
    if (!tbody) return;
 
    const actividades = obtenerActividades();
 
    if (actividades.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="py-6 text-center text-gray-400 font-semibold">Aún no hay actividad registrada.</td></tr>`;
        return;
    }
 
    tbody.innerHTML = actividades.map(act => {
        const estilo = ESTILOS_TIPO[act.tipo] || { texto: act.tipo, clase: 'bg-gray-100 text-gray-500' };
        return `
            <tr class="hover:bg-gray-50/50">
                <td class="py-3 pl-6 pr-3 text-gray-500 font-semibold">${formatearFecha(act.fecha)}</td>
                <td class="py-3 px-3">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${estilo.clase}">
                        ${estilo.texto}
                    </span>
                </td>
                <td class="py-3 px-3 text-gray-700 font-semibold">${act.descripcion}</td>
            </tr>
        `;
    }).join('');
}
 
function limpiarActividades() {
    if (!confirm("¿Borrar todo el historial de actividades? Esta acción no se puede deshacer.")) return;
    localStorage.removeItem('volleyActividades');
    renderizarActividades();
}