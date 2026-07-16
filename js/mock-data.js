window.VolleyAppData = {
    categoriasJugador: [
        { id: 1, nombre: "Toddler" }, { id: 2, nombre: "C-" }, { id: 3, nombre: "C+" },
        { id: 4, nombre: "B-" }, { id: 5, nombre: "B+" }, { id: 6, nombre: "A-" }, { id: 7, nombre: "A+" }
    ],

    categoriasTorneo: [
        { id: 1, nombre: "Toddler" }, { id: 2, nombre: "Cantera" },
        { id: 3, nombre: "Semi Pro" }, { id: 4, nombre: "Pro" }
    ],

    ramas: [
        { id: 1, nombre: "Masculino" }, { id: 2, nombre: "Femenino" }, { id: 3, nombre: "Mixto" }
    ],

    equipos: [
        { id: 1, nombre: "LOPSE" }, { id: 2, nombre: "LEV" },
        { id: 3, nombre: "PALIBALL" }, { id: 4, nombre: "LDE" }, { id: 5, nombre: "BALU" }
    ],

    // CONFIGURACIÓN ADMINISTRATIVA: Quién dirige y dónde juega el equipo
   participaciones: [
    { 
        id: 1, id_equipo: 1, id_rama: 3, id_categoria_torneo: 2, 
        grupo: "A", id_capitan: 3, tecnico: "Adrian Velarde", asistente: "", aprobado: true 
    }, { 
        id: 2, id_equipo: 1, id_rama: 2, id_categoria_torneo: 1, 
        grupo: "A", id_capitan: 3, tecnico: "Francisco Arrobo", asistente: "Bruce Alvarracin", aprobado: true 
    },{ 
        id: 3, id_equipo: 2, id_rama: 1, id_categoria_torneo: 2, 
        grupo: "A", id_capitan: 1, tecnico: "Kiara Moran", asistente: "", aprobado: true 
    },{ 
        id: 4, id_equipo: 3, id_rama: 3, id_categoria_torneo: 2, 
        grupo: "A", id_capitan: 5, tecnico: "", asistente: "", aprobado: false 
    },{ 
        id: 5, id_equipo: 4, id_rama: 2, id_categoria_torneo: 1, 
        grupo: "A", id_capitan: 4, tecnico: "", asistente: "", aprobado: true 
    },
    { 
        id: 6, id_equipo: 5, id_rama: 1, id_categoria_torneo: 2, 
        grupo: "A", id_capitan: 2, tecnico: "", asistente: "", aprobado: false 
    }
],

    // JUGADORES: Datos personales
    // 'estado' == 'APROBADO' para todos los que ya vienen precargados en la base.
    // Los que proponga un delegado desde ahora nacerán como 'PENDIENTE' sin categoría.
    jugadores: [
        { id: 1, nombre: "FRANCISCO JAVIER ARROBO ALCIVAR", id_categoria_jugador: 2, estado: "APROBADO" },
        { id: 2, nombre: "MILTON ROLANDO RAMIREZ RIVERA", id_categoria_jugador: 3, estado: "APROBADO" },
        { id: 3, nombre: "KIARA CAROLINA MORAN JAIME", id_categoria_jugador: 1, estado: "APROBADO" },
        { id: 4, nombre: "BRITHANY DENISSE BOLAÑOS GALARZA", id_categoria_jugador: 1, estado: "APROBADO" },
        { id: 5, nombre: "BYRON ALEXANDER FIGUEROA AGUIAR", id_categoria_jugador: 3, estado: "APROBADO" }
    ],

    // INSCRIPCIONES: Relaciona al jugador con una participación específica
    inscripciones: [
        { id: 1, id_jugador: 1, id_participacion: 1, numero_camiseta: 31 },
        { id: 2, id_jugador: 1, id_participacion: 3, numero_camiseta: 15 },
        { id: 3, id_jugador: 2, id_participacion: 6, numero_camiseta: 92 },
        { id: 4, id_jugador: 3, id_participacion: 1, numero_camiseta: 52 },
        { id: 5, id_jugador: 3, id_participacion: 2, numero_camiseta: 52 },
        { id: 6, id_jugador: 4, id_participacion: 5, numero_camiseta: 89 },
        { id: 7, id_jugador: 5, id_participacion: 4, numero_camiseta: 57 }
    ],

 partidos: [
    { 
        id: 1, 
        fecha: "2026-06-14", 
        hora: "18:00", 
        ubicacion: "Cancha 1", 
        id_local_participacion: 1, 
        id_visitante_participacion: 4, 
        estado: "FINALIZADO",
        sets: [
            { local: 25, visitante: 20 }, 
            { local: 25, visitante: 20 }, 
            { local: 25, visitante: 20 }
        ] 
    },
    { 
        id: 2, 
        fecha: "2026-06-15", 
        hora: "19:00", 
        ubicacion: "Cancha 1", 
        id_local_participacion: 2, 
        id_visitante_participacion: 5, 
        estado: "FINALIZADO",
        sets: [
            { local: 25, visitante: 22 }, 
            { local: 25, visitante: 22 }
        ] 
    },
    { 
        id: 3, 
        fecha: "2026-06-16", 
        hora: "20:00", 
        ubicacion: "Cancha 2", 
        id_local_participacion: 3, 
        id_visitante_participacion: 6, 
        estado: "PROGRAMADO",
        sets: [
            { local: 21, visitante: 25 }, 
            { local: 25, visitante: 18 }, 
            { local: 15, visitante: 10 }
        ] 
    }
],
estadisticasJugador: [
        { id_partido: 1, id_inscripcion: 1, puntos: 18, ataque: 5, bloqueo: 1, saque: 2,defensa: 0, colocacion:10},
        { id_partido: 1, id_inscripcion: 4, puntos: 19, ataque: 3, bloqueo: 0, saque: 1 , defensa:10, colocacion:5},
        { id_partido: 2, id_inscripcion: 5, puntos: 4, ataque: 2, bloqueo: 0, saque: 1 , defensa:1, colocacion:0},
        { id_partido: 2, id_inscripcion: 6, puntos: 2, ataque: 1, bloqueo: 1, saque: 0, defensa:0, colocacion:0 },
        { id_partido: 3, id_inscripcion: 3, puntos: 1, ataque: 1, bloqueo: 0, saque: 0, defensa:0, colocacion:0},
        { id_partido: 1, id_inscripcion: 7, puntos: 12, ataque: 7, bloqueo: 2, saque: 3, defensa:0, colocacion:0}
    ],

    // USUARIOS DELEGADOS: uno por cada equipo ya existente, con usuario y
    // contraseña de prueba, para que el admin ya los "lea" con dueño asignado
    // y puedas entrar directo desde el index sin tener que registrar nada.
    usuariosDelegados: [
        { id: 1001, usuario: "delegado_lopse",    password: "lopse123",    nombreDelegado: "Adrian Velarde",   id_equipo: 1 },
        { id: 1002, usuario: "delegado_lev",      password: "lev123",     nombreDelegado: "Kiara Moran",      id_equipo: 2 },
        { id: 1003, usuario: "delegado_paliball", password: "pali123",    nombreDelegado: "Byron Figueroa",    id_equipo: 3 },
        { id: 1004, usuario: "delegado_lde",      password: "lde123",     nombreDelegado: "Brithany Bolaños",  id_equipo: 4 },
        { id: 1005, usuario: "delegado_balu",     password: "balu123",    nombreDelegado: "Milton Ramirez",    id_equipo: 5 }
    ],

    // Convocatorias (jugadores citados por partido) y R5 (alineación titular).
    // Empiezan vacíos: los llena cada delegado desde su portal.
    convocatorias: [],
    r5: [],

    // Sanciones: tarjetas amarillas/rojas por jugador (con multa opcional) y
    // multas al equipo completo (no ligadas a un jugador puntual). Las carga
    // el admin desde el detalle del partido; el delegado solo las visualiza.
    sancionesJugador: [],
    multasEquipo: []
}
// js/mock-data.js
window.getData = () => {
    const saved = localStorage.getItem('volleyData');
    return saved ? JSON.parse(saved) : window.VolleyAppData;
};

// Alias para evitar errores en tus otros archivos
window.getAppData = window.getData;

/**
 * datosMinimosDeEmergencia
 * Única definición del set de datos mínimo (categorías/ramas fijas del torneo,
 * todo lo demás vacío) que usan js/shared/data-bridge.js, js/modules/auth.js,
 * equipos-admin.html, jugadores-admin.html y detalle-equipo.js SOLO cuando no
 * encuentran nada en localStorage ni en window.VolleyAppData. Vive aquí, en
 * mock-data.js, para no tener la misma lista de categorías/ramas copiada y
 * pegada en cuatro archivos distintos.
 */
window.datosMinimosDeEmergencia = function () {
    return {
        categoriasJugador: [
            { id: 1, nombre: "Toddler" }, { id: 2, nombre: "C-" }, { id: 3, nombre: "C+" },
            { id: 4, nombre: "B-" }, { id: 5, nombre: "B+" }, { id: 6, nombre: "A-" }, { id: 7, nombre: "A+" }
        ],
        categoriasTorneo: [
            { id: 1, nombre: "Toddler" }, { id: 2, nombre: "Cantera" },
            { id: 3, nombre: "Semi Pro" }, { id: 4, nombre: "Pro" }
        ],
        ramas: [
            { id: 1, nombre: "Masculino" }, { id: 2, nombre: "Femenino" }, { id: 3, nombre: "Mixto" }
        ],
        equipos: [], participaciones: [], jugadores: [], inscripciones: [],
        partidos: [], estadisticasJugador: [],
        usuariosDelegados: [], convocatorias: [], r5: [],
        sancionesJugador: [], multasEquipo: []
    };
};