

const CLAVE_ACTIVIDADES = 'volleyActividades';
const MAX_ACTIVIDADES_GUARDADAS = 200; // evita que el log crezca sin límite

function obtenerActividades() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_ACTIVIDADES)) || [];
    } catch (e) {
        console.error('⚠️ No se pudo leer el historial de actividades:', e);
        return [];
    }
}

function registrarActividad(tipo, descripcion) {
    const actividades = obtenerActividades();

    actividades.unshift({
        tipo,
        descripcion,
        fecha: new Date().toISOString()
    });

    // Recortamos el historial si se pasa del máximo permitido
    if (actividades.length > MAX_ACTIVIDADES_GUARDADAS) {
        actividades.length = MAX_ACTIVIDADES_GUARDADAS;
    }

    localStorage.setItem(CLAVE_ACTIVIDADES, JSON.stringify(actividades));
}

// Exponer explícitamente en window por si este archivo se carga junto a otros
// que verifican `typeof registrarActividad === 'function'` en un scope distinto.
window.registrarActividad = registrarActividad;
window.obtenerActividades = obtenerActividades;