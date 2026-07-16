VolleyStats
===========
Sistema de gestión de torneos de voleibol.
Frontend puro: HTML + Tailwind CSS + DaisyUI.
Sin backend — todos los datos viven en localStorage del navegador.

Acceso rápido
─────────────
Abre index.html en el navegador.

  Admin     usuario: admin       contraseña: 1234
  Delegado  usuario: delegado_lopse  (u otro creado desde admin → Solicitudes)

─────────────────────────────────────────────────────────────
ESTRUCTURA DEL PROYECTO
─────────────────────────────────────────────────────────────

volleystats/
├── index.html                   # Pantalla de login (admin + delegado)
│
├── css/
│   ├── brand.css                # Tokens de marca (colores, variables CSS)
│   └── style.css                # Estilos globales complementarios
│
├── js/
│   ├── mock-data.js             # Datos semilla y función getData()
│   ├── data-manager.js          # Wrapper legacy (solo partidos + estadísticas)
│   │
│   ├── shared/
│   │   ├── data-bridge.js       # window.AppDB — punto de acceso único a datos
│   │   │                          También expone window.genId() para IDs únicos
│   │   ├── elegibilidad.js      # window.Elegibilidad — reglas de categoría jugador
│   │   └── sanciones.js         # window.Sanciones — tarjetas, suspensiones,
│   │                              inhabilitaciones
│   │
│   └── modules/
│       ├── auth.js              # login, loginDelegado, verificarSesion,
│       │                          getMiEquipo, getParticipacionesDeMiEquipo
│       ├── partidos.js          # Vista pública: calendario con filtros y tabs
│       ├── liga.js              # Tabla de posiciones pública
│       ├── jugadores.js         # Directorio público con buscador y filtro nivel
│       ├── estadisticas.js      # Ranking de jugadores por categoría/rama
│       ├── equipos.js           # Vista pública de equipos (estado habilitado)
│       │
│       ├── admin/
│       │   ├── dashboard.js             # Panel de control admin
│       │   ├── partidos-admin.js        # Gestión de partidos
│       │   ├── estadisticas-admin.js    # Registro de estadísticas + WO + R5
│       │   ├── detalle-equipo.js        # Detalle equipo admin (editar nómina)
│       │   ├── equipos-admin.js         # Lista de equipos admin
│       │   ├── liga-admin.js            # Gestión de tabla de liga
│       │   ├── admin-liga.js            # Asignación de grupos y categorías
│       │   ├── solicitudes-admin.js     # Aprobar/rechazar jugadores y equipos
│       │   ├── sanciones.js             # Tarjetas, suspensiones, inhabilitaciones
│       │   ├── actividades-recientes.js # Log de actividad reciente
│       │   └── registrar-actividad.js   # Helper: escribir en el log
│       │
│       └── delegado/
│           ├── dashboard-delegado.js    # Panel del delegado
│           ├── mi-equipo.js             # Gestión del equipo del delegado
│           ├── convocatoria.js          # Lista de convocados por partido
│           ├── r5.js                    # Alineación titular por set (Set 1/2/3)
│           ├── sanciones.js             # Vista de sanciones (solo lectura)
│           ├── detalle-equipo.js        # Detalle equipo desde portal delegado
│           └── dashboard-delegado.js    # Panel resumen
│
└── pages/
    ├── partidos.html            # Calendario público — filtros: equipo, fecha,
    │                              categoría, rama; tabs: Todos/Próximos/Resultados
    ├── liga.html                # Tabla de posiciones pública
    ├── jugadores.html           # Directorio público: buscador + filtro por nivel
    ├── estadisticas.html        # Estadísticas por categoría/rama
    ├── detalle-equipo.html      # Perfil público de un equipo (plantel + historial)
    ├── estadisticas-partido.html # Detalle de un partido (ranking de jugadores)
    │
    ├── admin/
    │   ├── dashboard.html           # Panel admin
    │   ├── partidos-admin.html      # Gestión de partidos
    │   ├── estadisticas-admin.html  # Ingresar estadísticas, controlar estado
    │   │                              del partido, cargar R5 del delegado
    │   ├── equipos-admin.html       # Lista de equipos
    │   ├── detalle-equipo.html      # Detalle equipo admin
    │   ├── jugadores-admin.html     # Directorio de jugadores (admin)
    │   ├── liga-admin.html          # Tabla de posiciones (admin)
    │   ├── programar-partido.html   # Crear nuevo partido
    │   ├── sanciones-admin.html     # Tarjetas + inhabilitaciones
    │   ├── solicitudes-admin.html   # Aprobar/rechazar propuestas
    │   └── actividades-recientes.html # Log de actividad
    │
    └── delegado/
        ├── acceso-delegado.html     # Login específico de delegado
        ├── dashboard-delegado.html  # Panel resumen del delegado
        ├── mi-equipo.html           # Gestión del equipo
        ├── mis-partidos.html        # Calendario + resultados + estadísticas
        ├── convocatoria.html        # Convocar jugadores por partido
        ├── r5.html                  # Alineación titular por set (diagrama de cancha)
        └── sanciones.html           # Sanciones del equipo (solo lectura)

─────────────────────────────────────────────────────────────
SCHEMA DE DATOS (localStorage key: "volleyData")
─────────────────────────────────────────────────────────────

equipos[]              id, nombre
participaciones[]      id, id_equipo, id_categoria_torneo, id_rama,
                       aprobado, grupo, tecnico, asistente, id_capitan
jugadores[]            id, nombre, id_categoria_jugador, estado
inscripciones[]        id, id_jugador, id_participacion, numero_camiseta
categoriasTorneo[]     id, nombre
categoriasJugador[]    id, nombre
ramas[]                id, nombre
partidos[]             id, id_local_participacion, id_visitante_participacion,
                       fecha, hora, ubicacion, estado, sets[], wo, wo_equipo
estadisticasJugador[]  id, id_partido, id_inscripcion,
                       puntos, saque, ataque, bloqueo, defensa, colocacion
convocatorias[]        id, id_partido, id_participacion, convocados[]
r5[]                   id, id_partido, id_participacion, numero_set,
                       alineacion{ pos1..pos6, libero }
usuariosDelegados[]    id, usuario, password, id_equipo, nombreDelegado
sancionesJugador[]     id, id_inscripcion, id_partido, tipo, motivo,
                       partidos_suspension, fecha
multasEquipo[]         id, id_equipo, id_participacion, id_partido,
                       motivo, monto, fecha, pagada

─────────────────────────────────────────────────────────────
ESTADOS DE PARTIDO
─────────────────────────────────────────────────────────────

PROGRAMADO   →   EN_PROGRESO   →   FINALIZADO
(Se puede retroceder con el botón ↩️ en estadisticas-admin)

─────────────────────────────────────────────────────────────
FLUJO TÍPICO DE USO
─────────────────────────────────────────────────────────────

1. Admin programa partido (programar-partido.html)
2. Delegado convoca jugadores (convocatoria.html)
3. Delegado llena R5 por set (r5.html)
4. Admin abre estadísticas del partido → carga R5 automáticamente
   con el botón "🏐 Cargar R5"
5. Admin registra estadísticas y finaliza el partido
6. Delegado puede ver resultados y estadísticas en mis-partidos.html
7. Público ve el resultado en partidos.html

─────────────────────────────────────────────────────────────
COLORES DE MARCA
─────────────────────────────────────────────────────────────

Primary    #2563EB  (blue-600)
Danger     #dc2626  (red-600)
Warning    #d97706  (amber-600)  — WO, tarjetas, sanciones
Success    #16a34a  (green-600)
Bg         #F3F4F6
Card       #ffffff
Border     #e5e7eb

Variables disponibles en css/brand.css como --vs-primary, --vs-danger, etc.
