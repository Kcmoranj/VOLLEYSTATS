/**
 * data-bridge.js
 * Punto único de acceso a los datos para las páginas nuevas (delegado + solicitudes-admin).
 * No reemplaza a los getAppData() locales que ya existen en otros módulos: convive con ellos
 * porque todos leen/escriben la misma llave 'volleyData' en localStorage.
 *
 * FIX IMPORTANTE: antes, si js/mock-data.js no llegaba a cargar (404, ruta mal
 * puesta, etc.), window.VolleyAppData quedaba undefined y esta función hacía
 * JSON.parse(JSON.stringify(undefined)) — eso lanza un error de JS y frena TODO
 * el script de la página antes de dibujar nada. Ahora, si no encuentra ni
 * localStorage ni mock-data.js, usa window.datosMinimosDeEmergencia() — esa
 * función vive en js/mock-data.js, no aquí duplicada — y avisa por consola.
 *
 * FIX #2 (sembrado de datos por defecto): antes, una vez que existía ALGO en
 * localStorage['volleyData'] (por ejemplo, de una prueba anterior), esta
 * función lo usaba TAL CUAL para siempre e ignoraba por completo cualquier
 * cosa nueva que se agregara a mock-data.js (equipos nuevos, el delegado
 * "delegado_lopse", etc.). Por eso un equipo o usuario agregado en mock-data.js
 * "no aparecía": el navegador ya tenía su propia copia vieja guardada y nunca
 * se refrescaba con la semilla nueva. sembrarDatosPorDefecto() combina ambas
 * fuentes: conserva todo lo que el usuario ya creó/editó en localStorage, y
 * además agrega (sin duplicar, comparando por id) cualquier equipo,
 * participación, jugador, inscripción, partido, estadística o usuario
 * delegado que exista en mock-data.js pero todavía no esté en localStorage.
 */
function sembrarDatosPorDefecto(data) {
    if (!window.VolleyAppData) return data;
    const semilla = window.VolleyAppData;

    // Colecciones identificadas por "id": se agregan las que falten sin duplicar
    const colecciones = [
        'equipos', 'participaciones', 'jugadores', 'inscripciones',
        'partidos', 'estadisticasJugador', 'usuariosDelegados',
        'sancionesJugador', 'multasEquipo', 'sustitucionesPartido', 'tiemposMuertosPartido', 'historialPuntos'
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


/**
 * genId — genera un ID entero único dentro de la sesión.
 * Usa Date.now() como base + contador incremental para evitar colisiones
 * cuando se crean varios objetos en el mismo milisegundo.
 */
window.genId = (() => {
    let _counter = 0;
    return () => Date.now() * 1000 + (_counter++ % 1000);
})();

window.AppDB = {
    KEY: 'volleyData',

    SCHEMA_VERSION: 4,

    get() {
        const raw = localStorage.getItem(this.KEY);
        let base;

        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                // If schema version doesn't match, wipe and reload from mock
                if ((parsed._schemaVersion || 0) < this.SCHEMA_VERSION) {
                    localStorage.removeItem(this.KEY);
                    base = window.VolleyAppData
                        ? JSON.parse(JSON.stringify(window.VolleyAppData))
                        : null;
                } else {
                    base = parsed;
                }
            } catch(e) {
                base = null;
            }
            if (base) base = window.sembrarDatosPorDefecto(base);
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
            base = { categoriasJugador: [], categoriasTorneo: [], ramas: [], equipos: [], participaciones: [], jugadores: [], inscripciones: [], partidos: [], estadisticasJugador: [], usuariosDelegados: [], convocatorias: [], r5: [], sustitucionesPartido: [], tiemposMuertosPartido: [], historialPuntos: [] };
        }

        return window.migrarModeloDelegados(base);
    },

    save(data) {
        data._schemaVersion = this.SCHEMA_VERSION;
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
    if (!Array.isArray(data.sustitucionesPartido)) data.sustitucionesPartido = [];
    if (!Array.isArray(data.tiemposMuertosPartido)) data.tiemposMuertosPartido = [];

    // Migrar campo vivo en partidos
    (data.partidos || []).forEach(p => {
        if (!p.vivo) p.vivo = null; // null = no iniciado en vivo
    });

    // Migrar campo roles en r5
    (data.r5 || []).forEach(r => {
        if (!r.roles) r.roles = {};
    });
    if (!Array.isArray(data.historialPuntos)) data.historialPuntos = [];

    // Los jugadores que ya existían en la base se consideran válidos/aprobados.
    // Los que se propongan desde ahora nacen en estado 'PENDIENTE' sin categoría.
    (data.jugadores || []).forEach(j => {
        if (!j.estado) j.estado = 'APROBADO';
    });

    return data;
}
window.migrarModeloDelegados = migrarModeloDelegados;

// ─── Utilidades compartidas ──────────────────────────────────────────────────

/**
 * escHTML — Escapa caracteres HTML para prevenir XSS al insertar datos en innerHTML.
 * Fuente única: todos los módulos usan window.escHTML en lugar de definir la suya.
 */
window.escHTML = function escHTML(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

/**
 * normalizarEstado — Normaliza el estado de un partido a mayúsculas sin espacios extra.
 * Fuente única: reemplaza las 5 definiciones locales de normalizarEstado/normEstado.
 */
window.normalizarEstado = function normalizarEstado(estado) {
    return String(estado || '').toUpperCase().trim();
};

/**
 * logout — Limpia la sesión y redirige al login.
 * Recibe la ruta relativa a index.html desde la página que la llama.
 * Por defecto asume que la página está 2 niveles adentro (pages/admin/ o pages/delegado/).
 */
window.logout = function logout(rutaIndex) {
    localStorage.removeItem('session_admin');
    localStorage.removeItem('session_delegado_id');
    localStorage.removeItem('session_equipo_id');
    window.location.href = rutaIndex || '../../index.html';
};