function sembrarDatosPorDefecto(data) {
    if (!window.VolleyAppData) return data;
    const semilla = window.VolleyAppData;

    // Colecciones identificadas por "id": se agregan las que falten sin duplicar
    const colecciones = [
        'equipos', 'participaciones', 'jugadores', 'inscripciones',
        'partidos', 'estadisticasJugador', 'usuariosDelegados',
        'sancionesJugador', 'multasEquipo'
    ];

    colecciones.forEach(col => {
        if (!Array.isArray(data[col])) data[col] = [];
        if (!Array.isArray(semilla[col])) return;

        const idsExistentes = new Set(data[col].map(item => item.id));
        semilla[col].forEach(item => {
            if (!idsExistentes.has(item.id)) {
                data[col].push(item);
            }
        });
    });

    // Catálogos fijos (categorías/ramas): si vinieran vacíos por algún motivo,
    // se restauran desde la semilla en vez de dejar los selects sin opciones.
    ['categoriasJugador', 'categoriasTorneo', 'ramas'].forEach(col => {
        if (!Array.isArray(data[col]) || data[col].length === 0) {
            data[col] = JSON.parse(JSON.stringify(semilla[col] || []));
        }
    });

    return data;
}
window.sembrarDatosPorDefecto = sembrarDatosPorDefecto;

window.AppDB = {
    KEY: 'volleyData',

    get() {
        const raw = localStorage.getItem(this.KEY);
        let base;

        if (raw) {
            base = JSON.parse(raw);
            base = window.sembrarDatosPorDefecto(base);
        } else if (window.VolleyAppData) {
            base = JSON.parse(JSON.stringify(window.VolleyAppData));
        } else if (typeof window.datosMinimosDeEmergencia === 'function') {
            console.error(
                '⚠️ VolleyStats: no se encontró window.VolleyAppData. ' +
                'Esto pasa cuando js/mock-data.js NO se cargó (revisa F12 → pestaña ' +
                'Network/Red, busca en rojo "mock-data.js" y corrige esa ruta). ' +
                'Mientras tanto se está usando el set de datos mínimo de ' +
                'js/mock-data.js: vas a poder crear tu cuenta y tu equipo, pero no ' +
                'vas a ver equipos, jugadores ni partidos que ya existían.'
            );
            base = window.datosMinimosDeEmergencia();
        } else {
            // Ni siquiera mock-data.js cargó: último recurso mínimo para no crashear.
            console.error('⚠️ VolleyStats: ni js/mock-data.js ni window.VolleyAppData están disponibles. Revisa las rutas de <script>.');
            base = { categoriasJugador: [], categoriasTorneo: [], ramas: [], equipos: [], participaciones: [], jugadores: [], inscripciones: [], partidos: [], estadisticasJugador: [], usuariosDelegados: [], convocatorias: [], r5: [] };
        }

        return window.migrarModeloDelegados(base);
    },

    save(data) {
        localStorage.setItem(this.KEY, JSON.stringify(data));
    }
};

/**
 * migrarModeloDelegados
 * Agrega de forma segura (idempotente) las colecciones y campos nuevos que necesita
 * el flujo de delegados, sin tocar nada de lo que ya existía.
 */
function migrarModeloDelegados(data) {
    if (!data.usuariosDelegados) data.usuariosDelegados = [];
    if (!data.convocatorias) data.convocatorias = [];
    if (!data.r5) data.r5 = [];
    if (!Array.isArray(data.sancionesJugador)) data.sancionesJugador = [];
    if (!Array.isArray(data.multasEquipo)) data.multasEquipo = [];

    // Los jugadores que ya existían en la base se consideran válidos/aprobados.
    // Los que se propongan desde ahora nacen en estado 'PENDIENTE' sin categoría.
    (data.jugadores || []).forEach(j => {
        if (!j.estado) j.estado = 'APROBADO';
    });

    return data;
}
window.migrarModeloDelegados = migrarModeloDelegados;