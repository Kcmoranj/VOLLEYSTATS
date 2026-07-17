/**
 * elegibilidad.js
 * ÚNICA fuente de verdad para saber en qué categorías de torneo puede jugar
 * un jugador según su categoría de jugador.
 *
 * Regla de negocio (evita "sandbagging": nadie juega hacia abajo de su nivel,
 * pero sí puede jugar en su nivel natural o en niveles más exigentes):
 *
 *   Toddler        -> Toddler, Cantera, Semi Pro, Pro   (juega en todas)
 *   C-  / C+       -> Cantera, Semi Pro, Pro
 *   B-  / B+       -> Semi Pro, Pro
 *   A-  / A+       -> Pro
 *
 * Antes esta lógica vivía duplicada/rota dentro de detalle-equipo.js
 * (llamaba a funciones que no existían: obtenerNombreCategoria / obtenerNombreTorneo).
 * Ahora todo pasa por window.Elegibilidad para que admin y delegado usen
 * exactamente las mismas reglas.
 */
window.Elegibilidad = (function () {

    const REGLAS = {
        'Toddler': ['Toddler', 'Cantera', 'Semi Pro', 'Pro'],
        'C-':      ['Cantera', 'Semi Pro', 'Pro'],
        'C+':      ['Cantera', 'Semi Pro', 'Pro'],
        'B-':      ['Semi Pro', 'Pro'],
        'B+':      ['Semi Pro', 'Pro'],
        'A-':      ['Pro'],
        'A+':      ['Pro']
    };

    // data.categoriasJugador -> { id: nombre }
    function nombreCategoriaJugador(data, idCategoriaJugador) {
        return data.categoriasJugador.find(c => c.id === idCategoriaJugador)?.nombre || null;
    }

    // data.categoriasTorneo -> { id: nombre }
    function nombreCategoriaTorneo(data, idCategoriaTorneo) {
        return data.categoriasTorneo.find(c => c.id === idCategoriaTorneo)?.nombre || null;
    }

    /**
     * ¿Puede este jugador (por su categoría) jugar en esta categoría de torneo?
     * Si el jugador todavía no tiene categoría asignada (pendiente de aprobación
     * del admin), no es elegible para ningún torneo todavía.
     */
    function jugadorEsElegible(data, jugador, idCategoriaTorneo) {
        if (!jugador || jugador.id_categoria_jugador == null) return false;
        if (jugador.estado && jugador.estado !== 'APROBADO') return false;

        const nombreCatJugador = nombreCategoriaJugador(data, jugador.id_categoria_jugador);
        const nombreCatTorneo = nombreCategoriaTorneo(data, idCategoriaTorneo);
        if (!nombreCatJugador || !nombreCatTorneo) return false;

        const permitidas = REGLAS[nombreCatJugador];
        return !!permitidas && permitidas.includes(nombreCatTorneo);
    }

    /** Nombres de categorías de torneo permitidas para una categoría de jugador dada */
    function categoriasPermitidasPara(nombreCategoriaJugadorStr) {
        return REGLAS[nombreCategoriaJugadorStr] || [];
    }


    /**
     * ¿El jugador ya está inscrito en OTRO equipo que juegue la misma
     * categoría de torneo Y rama? Si es así, no puede inscribirse en este equipo.
     * @param {*} excludeParticipacionId  la participación del equipo actual (se excluye del check)
     */
    function jugadorYaEnCategoriaRama(data, idJugador, idCategoriaTorneo, idRama, excludeParticipacionId) {
        // Todas las inscripciones de este jugador en otras participaciones
        const otrasInscripciones = (data.inscripciones || []).filter(
            i => i.id_jugador === idJugador && i.id_participacion !== excludeParticipacionId
        );
        return otrasInscripciones.some(ins => {
            const part = (data.participaciones || []).find(p => p.id === ins.id_participacion);
            return part && part.id_categoria_torneo === idCategoriaTorneo && part.id_rama === idRama;
        });
    }


    /**
     * Returns the nombre of the competing equipo if jugador is already
     * inscribed in another equipo in the same categoria/rama, or null if clean.
     * Used for the double-check just before saving an inscription.
     */
    function equipoConflictoCategoriaRama(data, idJugador, idCategoriaTorneo, idRama, excludeParticipacionId) {
        const otrasIns = (data.inscripciones || []).filter(
            i => i.id_jugador === idJugador && i.id_participacion !== excludeParticipacionId
        );
        for (const ins of otrasIns) {
            const part = (data.participaciones || []).find(p => p.id === ins.id_participacion);
            if (part && part.id_categoria_torneo === idCategoriaTorneo && part.id_rama === idRama) {
                const equipo = (data.equipos || []).find(e => e.id === part.id_equipo);
                return equipo?.nombre || 'otro equipo';
            }
        }
        return null;
    }

    return { REGLAS, jugadorEsElegible, categoriasPermitidasPara, nombreCategoriaJugador, nombreCategoriaTorneo, jugadorYaEnCategoriaRama, equipoConflictoCategoriaRama };
})();