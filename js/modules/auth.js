if (typeof window.migrarModeloDelegados !== 'function') {
    window.migrarModeloDelegados = function (data) {
        if (!data.usuariosDelegados) data.usuariosDelegados = [];
        if (!data.convocatorias) data.convocatorias = [];
        if (!data.r5) data.r5 = [];
        (data.jugadores || []).forEach(j => { if (!j.estado) j.estado = 'APROBADO'; });
        return data;
    };
}
if (!window.AppDB) {
    // Mismo fix que en data-bridge.js: si mock-data.js no llegó a cargar antes,
    // window.sembrarDatosPorDefecto() puede no existir todavía; se define aquí
    // también como respaldo para no depender del orden de carga de los <script>.
    if (typeof window.sembrarDatosPorDefecto !== 'function') {
        window.sembrarDatosPorDefecto = function (data) {
            if (!window.VolleyAppData) return data;
            const semilla = window.VolleyAppData;
            const colecciones = ['equipos', 'participaciones', 'jugadores', 'inscripciones', 'partidos', 'estadisticasJugador', 'usuariosDelegados'];
            colecciones.forEach(col => {
                if (!Array.isArray(data[col])) data[col] = [];
                if (!Array.isArray(semilla[col])) return;
                const idsExistentes = new Set(data[col].map(item => item.id));
                semilla[col].forEach(item => {
                    if (!idsExistentes.has(item.id)) data[col].push(item);
                });
            });
            ['categoriasJugador', 'categoriasTorneo', 'ramas'].forEach(col => {
                if (!Array.isArray(data[col]) || data[col].length === 0) {
                    data[col] = JSON.parse(JSON.stringify(semilla[col] || []));
                }
            });
            return data;
        };
    }

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
                    '⚠️ VolleyStats: no se encontró window.VolleyAppData (js/mock-data.js no ' +
                    'cargó). Revisa F12 → pestaña Network/Red. Usando el set mínimo de mock-data.js.'
                );
                base = window.datosMinimosDeEmergencia();
            } else {
                console.error('⚠️ VolleyStats: ni js/mock-data.js ni window.VolleyAppData están disponibles. Revisa las rutas de <script>.');
                base = { categoriasJugador: [], categoriasTorneo: [], ramas: [], equipos: [], participaciones: [], jugadores: [], inscripciones: [], partidos: [], estadisticasJugador: [], usuariosDelegados: [], convocatorias: [], r5: [] };
            }
            return window.migrarModeloDelegados(base);
        },
        save(data) { localStorage.setItem(this.KEY, JSON.stringify(data)); }
    };
}

// ============ ADMIN ============

function login(usuario, password) {
    if (usuario === "admin" && password === "1234") {
        localStorage.setItem("session_admin", "true");
        window.location.href = "pages/admin/dashboard.html";
    } else {
        document.getElementById("alertaError").classList.remove("hidden");
    }
}

function logout() {
    localStorage.removeItem("session_admin");
    window.location.href = "../index.html";
}

function verificarSesion() {
    if (!localStorage.getItem("session_admin")) {
        window.location.href = "../index.html";
    }
}

// ============ DELEGADO: cuenta (sin equipo todavía) ============

/**
 * Crea SOLO la cuenta del delegado (usuario, contraseña, nombre). El equipo
 * se crea después, ya logueado, desde mi-equipo.html.
 */
function registrarDelegado({ usuario, password, nombreDelegado }) {
    const data = window.AppDB.get();

    usuario = (usuario || '').trim();
    if (!usuario || !password) return { ok: false, mensaje: 'Usuario y contraseña son obligatorios.' };
    if (data.usuariosDelegados.some(u => u.usuario.toLowerCase() === usuario.toLowerCase())) {
        return { ok: false, mensaje: 'Ese nombre de usuario ya está en uso.' };
    }

    const usuarioDelegado = {
        id: Date.now(),
        usuario,
        password,
        nombreDelegado: (nombreDelegado || '').trim() || usuario,
        id_equipo: null // todavía no ha creado su equipo
    };
    data.usuariosDelegados.push(usuarioDelegado);
    window.AppDB.save(data);

    return { ok: true, usuario: usuarioDelegado };
}

function loginDelegado(usuario, password) {
    const data = window.AppDB.get();
    const u = data.usuariosDelegados.find(x => x.usuario === usuario && x.password === password);
    if (!u) return false;
    localStorage.setItem('session_delegado_id', u.id);
    localStorage.setItem('session_equipo_id', u.id_equipo ?? '');
    return true;
}

function verificarSesionDelegado() {
    if (!localStorage.getItem('session_delegado_id')) {
        window.location.href = 'acceso-delegado.html';
    }
}

function logoutDelegado() {
    localStorage.removeItem('session_delegado_id');
    localStorage.removeItem('session_equipo_id');
    window.location.href = 'acceso-delegado.html';
}

function getDelegadoActual() {
    const data = window.AppDB.get();
    const id = parseInt(localStorage.getItem('session_delegado_id'));
    return data.usuariosDelegados.find(u => u.id === id) || null;
}

function getMiEquipo(data) {
    const idEquipo = parseInt(localStorage.getItem('session_equipo_id'));
    if (isNaN(idEquipo)) return null;
    return data.equipos.find(e => e.id === idEquipo) || null;
}

function getParticipacionesDeMiEquipo(data) {
    const idEquipo = parseInt(localStorage.getItem('session_equipo_id'));
    if (isNaN(idEquipo)) return [];
    return data.participaciones.filter(p => p.id_equipo === idEquipo);
}

// ============ DELEGADO: crear el equipo (post-login, primera vez) ============

/**
 * Llamar desde mi-equipo.html cuando el delegado logueado todavía no tiene
 * equipo (getMiEquipo devuelve null). Crea el equipo + su primera
 * participación (queda pendiente de aprobación) y liga la cuenta a ese equipo.
 */
function crearEquipoParaDelegado({ nombreEquipo, idCategoria, idRama }) {
    const data = window.AppDB.get();
    const delegado = getDelegadoActual();
    if (!delegado) return { ok: false, mensaje: 'Tu sesión expiró, vuelve a iniciar sesión.' };

    nombreEquipo = (nombreEquipo || '').trim();
    if (!nombreEquipo) return { ok: false, mensaje: 'El nombre del equipo es obligatorio.' };
    if (!idCategoria || !idRama) return { ok: false, mensaje: 'Selecciona categoría y rama.' };

    const nuevoIdEquipo = Math.max(0, ...data.equipos.map(e => e.id)) + 1;
    const equipo = { id: nuevoIdEquipo, nombre: nombreEquipo.toUpperCase() };
    data.equipos.push(equipo);

    const participacion = {
        id: Date.now(),
        id_equipo: equipo.id,
        id_categoria_torneo: parseInt(idCategoria),
        id_rama: parseInt(idRama),
        grupo: 'A',
        id_capitan: null,
        tecnico: '',
        asistente: '',
        aprobado: false
    };
    data.participaciones.push(participacion);

    // Ligar la cuenta del delegado a este equipo recién creado
    const u = data.usuariosDelegados.find(x => x.id === delegado.id);
    u.id_equipo = equipo.id;

    window.AppDB.save(data);
    localStorage.setItem('session_equipo_id', equipo.id);

    if (typeof registrarActividad === 'function') {
        registrarActividad('EQUIPO_SOLICITADO', `El delegado ${delegado.nombreDelegado} creó el equipo ${equipo.nombre}`);
    }

    return { ok: true, equipo, participacion };
}