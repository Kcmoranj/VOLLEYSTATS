let participacionActivaId = null;

document.addEventListener('DOMContentLoaded', () => {
    verificarSesionDelegado();
    inicializarPagina();
    document.getElementById('formCrearEquipo')?.addEventListener('submit', crearEquipoSubmit);
    document.getElementById('formAgregarCategoria')?.addEventListener('submit', crearNuevaParticipacion);
    document.getElementById('inputBuscarJugadorDB')?.addEventListener('input', buscarJugadoresDisponibles);
    document.getElementById('formProponerJugador')?.addEventListener('submit', proponerJugadorNuevo);
    document.getElementById('formDatosEquipo')?.addEventListener('submit', guardarDatosEquipo);
});

/**
 * Punto de entrada de la página: si el delegado logueado todavía no tiene
 * equipo (1 cuenta = 1 equipo), se muestra el formulario "Crear mi equipo".
 * Una vez creado, se muestra el resto (participaciones, plantel, etc).
 */
function inicializarPagina() {
    const data = window.AppDB.get();
    const equipo = getMiEquipo(data);

    const bloqueCrear = document.getElementById('bloqueCrearEquipo');
    const bloqueGestion = document.getElementById('bloqueGestionEquipo');

    // El botón "+ Agregar categoría/rama" abre un modal cuyos selects solo se
    // llenan una vez que ya existe un equipo (ver inicializarSelectorParticipaciones).
    // Antes quedaba visible incluso sin equipo creado, y al abrirse mostraba el
    // modal vacío (sin opciones de categoría/rama). Ahora se oculta hasta que
    // el delegado haya creado su equipo.
    const btnAgregarCategoria = document.querySelector('[onclick*="modalAgregarCategoria"]');
    if (btnAgregarCategoria) btnAgregarCategoria.classList.toggle('hidden', !equipo);

    if (!equipo) {
        bloqueCrear.classList.remove('hidden');
        bloqueGestion.classList.add('hidden');

        const selCat = document.getElementById('crearCategoria');
        const selRama = document.getElementById('crearRama');
        selCat.innerHTML = data.categoriasTorneo.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        selRama.innerHTML = data.ramas.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('');
        return;
    }

    bloqueCrear.classList.add('hidden');
    bloqueGestion.classList.remove('hidden');
    document.getElementById('nombreMiEquipo').textContent = `: ${equipo.nombre}`;

    inicializarSelectorParticipaciones();
}

function crearEquipoSubmit(e) {
    e.preventDefault();
    const resultado = crearEquipoParaDelegado({
        nombreEquipo: document.getElementById('inputNombreEquipoNuevo').value,
        idCategoria: document.getElementById('crearCategoria').value,
        idRama: document.getElementById('crearRama').value
    });

    if (!resultado.ok) { alert(resultado.mensaje); return; }
    inicializarPagina();
}

function inicializarSelectorParticipaciones() {
    const data = window.AppDB.get();
    const participaciones = getParticipacionesDeMiEquipo(data);
    const select = document.getElementById('selectParticipacion');

    if (participaciones.length === 0) {
        document.getElementById('sinParticipaciones').classList.remove('hidden');
        document.getElementById('contenidoParticipacion').classList.add('hidden');
        select.innerHTML = '';
        return;
    }

    select.innerHTML = participaciones.map(p => {
        const cat = data.categoriasTorneo.find(c => c.id === p.id_categoria_torneo)?.nombre || '-';
        const rama = data.ramas.find(r => r.id === p.id_rama)?.nombre || '-';
        const estado = p.aprobado ? '✅' : '⏳';
        return `<option value="${p.id}">${estado} ${cat} · ${rama}</option>`;
    }).join('');

    select.onchange = () => renderParticipacionActiva(parseInt(select.value));
    participacionActivaId = participaciones[0].id;
    renderParticipacionActiva(participacionActivaId);

    // Poblar selects del modal "Agregar categoría"
    const selCat = document.getElementById('nuevaCategoria');
    const selRama = document.getElementById('nuevaRama');
    if (selCat) selCat.innerHTML = data.categoriasTorneo.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    if (selRama) selRama.innerHTML = data.ramas.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('');
}

function renderParticipacionActiva(idParticipacion) {
    participacionActivaId = idParticipacion;
    const data = window.AppDB.get();
    const p = data.participaciones.find(x => x.id === idParticipacion);
    if (!p) return;

    document.getElementById('sinParticipaciones').classList.add('hidden');
    document.getElementById('contenidoParticipacion').classList.remove('hidden');

    const cat = data.categoriasTorneo.find(c => c.id === p.id_categoria_torneo)?.nombre || '-';
    const rama = data.ramas.find(r => r.id === p.id_rama)?.nombre || '-';

    document.getElementById('tituloParticipacion').textContent = `${cat} · ${rama}`;
    document.getElementById('badgeEstadoParticipacion').innerHTML = p.aprobado
        ? `<span class="badge badge-success text-white font-bold">APROBADO</span>`
        : `<span class="badge badge-warning text-white font-bold">PENDIENTE DE APROBACIÓN</span>`;

    document.getElementById('inputTecnico').value = p.tecnico || '';
    document.getElementById('inputAsistente').value = p.asistente || '';

    renderRoster(p, data);
    renderSelectCapitan(p, data);
}

function renderRoster(p, data) {
    const inscripciones = data.inscripciones.filter(i => i.id_participacion === p.id);
    const tbody = document.getElementById('tablaRoster');

    if (inscripciones.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-400 py-6 font-semibold">Aún no has agregado jugadores.</td></tr>`;
        return;
    }

    tbody.innerHTML = inscripciones.map(ins => {
        const j = data.jugadores.find(x => x.id === ins.id_jugador);
        const catJugador = j?.id_categoria_jugador != null
            ? data.categoriasJugador.find(c => c.id === j.id_categoria_jugador)?.nombre
            : null;

        const estadoBadge = !j ? '' :
            j.estado === 'PENDIENTE'
                ? `<span class="badge badge-warning badge-sm text-white font-bold">Pendiente de aprobación</span>`
                : `<span class="badge badge-success badge-sm text-white font-bold">Aprobado</span>`;

        return `
        <tr class="hover:bg-gray-50">
            <td class="font-bold text-gray-400">#${ins.numero_camiseta}</td>
            <td class="font-bold text-gray-800">${j?.nombre || 'Desconocido'}</td>
            <td>${catJugador ? `<span class="badge badge-ghost badge-sm">${catJugador}</span>` : estadoBadge}</td>
            <td class="text-right">
                <button onclick="quitarDelRoster(${ins.id})" class="btn btn-xs btn-ghost text-red-500 font-bold">Quitar</button>
            </td>
        </tr>`;
    }).join('');
}

function renderSelectCapitan(p, data) {
    const select = document.getElementById('selectCapitan');
    if (!select) return;
    const inscripciones = data.inscripciones.filter(i => i.id_participacion === p.id);
    select.innerHTML = '<option value="">Sin capitán asignado</option>' + inscripciones.map(ins => {
        const j = data.jugadores.find(x => x.id === ins.id_jugador);
        return `<option value="${j?.id}" ${p.id_capitan === j?.id ? 'selected' : ''}>${j?.nombre || '-'}</option>`;
    }).join('');
}

// --- Datos del equipo (técnico / asistente / capitán) ---
function guardarDatosEquipo(e) {
    e.preventDefault();
    const data = window.AppDB.get();
    const p = data.participaciones.find(x => x.id === participacionActivaId);
    if (!p) return;

    p.tecnico = document.getElementById('inputTecnico').value.trim();
    p.asistente = document.getElementById('inputAsistente').value.trim();
    p.id_capitan = parseInt(document.getElementById('selectCapitan').value) || null;

    window.AppDB.save(data);
    alert('Datos del equipo guardados.');
}

// --- Agregar otra categoría/rama (nueva participación, queda pendiente) ---
function crearNuevaParticipacion(e) {
    e.preventDefault();
    const data = window.AppDB.get();
    const equipo = getMiEquipo(data);
    const idCat = parseInt(document.getElementById('nuevaCategoria').value);
    const idRama = parseInt(document.getElementById('nuevaRama').value);

    const existe = data.participaciones.some(p => p.id_equipo === equipo.id && p.id_categoria_torneo === idCat && p.id_rama === idRama);
    if (existe) { alert('Ya tienes una participación en esa categoría y rama.'); return; }

    data.participaciones.push({
        id: window.genId ? window.genId() : Date.now(),
        id_equipo: equipo.id,
        id_categoria_torneo: idCat,
        id_rama: idRama,
        grupo: 'A',
        id_capitan: null,
        tecnico: '',
        asistente: '',
        aprobado: false
    });

    window.AppDB.save(data);
    document.getElementById('modalAgregarCategoria').close();
    inicializarSelectorParticipaciones();
}

// --- Buscar jugadores existentes elegibles para esta participación ---
// FIX: además de la elegibilidad por categoría (Elegibilidad.jugadorEsElegible),
// ahora también se excluye a cualquier jugador que YA esté inscrito en OTRO
// equipo para esta misma categoría/rama (Elegibilidad.jugadorYaEnCategoriaRama).
// Antes esto no se validaba: un jugador podía terminar jugando para dos
// equipos distintos en el mismo cuadro de la misma categoría/rama, cosa que
// sí debe seguir permitida SOLO si es una categoría/rama diferente.
function buscarJugadoresDisponibles(e) {
    const texto = e.target.value.toLowerCase().trim();
    const resultados = document.getElementById('resultadosBusquedaJugador');
    if (texto.length < 2) { resultados.innerHTML = ''; return; }

    const data = window.AppDB.get();
    const p = data.participaciones.find(x => x.id === participacionActivaId);
    if (!p) return;

    const yaInscritos = new Set(data.inscripciones.filter(i => i.id_participacion === p.id).map(i => i.id_jugador));

    const coincidencias = data.jugadores.filter(j =>
        j.nombre.toLowerCase().includes(texto) &&
        !yaInscritos.has(j.id) &&
        window.Elegibilidad.jugadorEsElegible(data, j, p.id_categoria_torneo) &&
        !window.Elegibilidad.jugadorYaEnCategoriaRama(data, j.id, p.id_categoria_torneo, p.id_rama, p.id)
    ).slice(0, 8);

    resultados.innerHTML = coincidencias.length > 0
        ? coincidencias.map(j => {
            const cat = data.categoriasJugador.find(c => c.id === j.id_categoria_jugador)?.nombre || '-';
            return `
            <div class="flex items-center justify-between p-2 border-b border-gray-50 text-xs">
                <span class="font-bold">${j.nombre} <span class="badge badge-ghost badge-xs ml-1">${cat}</span></span>
                <div class="flex items-center gap-2">
                    <input type="number" min="0" placeholder="#" class="input input-bordered input-xs w-14 text-center" id="camiseta-${j.id}">
                    <button class="btn btn-xs btn-primary" onclick="agregarJugadorExistente(${j.id})">Agregar</button>
                </div>
            </div>`;
        }).join('')
        : `<p class="text-xs text-gray-400 italic p-2">Sin jugadores elegibles con ese nombre (recuerda: un jugador no puede jugar dos veces la misma categoría/rama en equipos distintos). Si no existe, proponlo abajo.</p>`;
}

function agregarJugadorExistente(idJugador) {
    const numeroInput = document.getElementById(`camiseta-${idJugador}`);
    const numero = parseInt(numeroInput?.value);
    if (isNaN(numero) || numero < 0) { alert('Ingresa un número de camiseta válido.'); return; }

    const data = window.AppDB.get();
    const p = data.participaciones.find(x => x.id === participacionActivaId);

    // FIX: doble chequeo justo antes de guardar (por si la lista de sugerencias
    // quedó desactualizada, ej. dos pestañas abiertas a la vez).
    const conflicto = window.Elegibilidad.equipoConflictoCategoriaRama(data, idJugador, p.id_categoria_torneo, p.id_rama, p.id);
    if (conflicto) {
        alert(`Este jugador ya está inscrito con "${conflicto}" en esta misma categoría y rama. No puede jugar dos veces el mismo cuadro.`);
        return;
    }

    const ocupado = data.inscripciones.some(i => i.id_participacion === participacionActivaId && i.numero_camiseta === numero);
    if (ocupado) { alert(`El número #${numero} ya está ocupado en tu equipo.`); return; }

    data.inscripciones.push({ id: window.genId ? window.genId() : Date.now(), id_jugador: idJugador, id_participacion: participacionActivaId, numero_camiseta: numero });
    window.AppDB.save(data);

    document.getElementById('inputBuscarJugadorDB').value = '';
    document.getElementById('resultadosBusquedaJugador').innerHTML = '';
    renderParticipacionActiva(participacionActivaId);
}

// --- Proponer un jugador que no existe en la base (queda PENDIENTE, sin categoría) ---
// Un jugador propuesto recién nace, así que no puede tener todavía un conflicto
// de categoría/rama con otro equipo (no valida contra sí mismo).
function proponerJugadorNuevo(e) {
    e.preventDefault();
    const nombre = document.getElementById('inputNombrePropuesto').value.trim().toUpperCase();
    const numero = parseInt(document.getElementById('inputCamisetaPropuesto').value);

    if (!nombre) { alert('Ingresa el nombre del jugador.'); return; }
    if (isNaN(numero) || numero < 0) { alert('Ingresa un número de camiseta válido.'); return; }

    const data = window.AppDB.get();

    // Validar número de camiseta duplicado
    const camisetaOcupada = data.inscripciones.some(
        i => i.id_participacion === participacionActivaId && i.numero_camiseta === numero
    );
    if (camisetaOcupada) { alert(`El número #${numero} ya está ocupado en tu equipo.`); return; }

    // Validar nombre duplicado — evita proponer al mismo jugador dos veces
    const nombreOcupado = data.jugadores.some(
        j => j.nombre === nombre
    );
    if (nombreOcupado) {
        alert(`Ya existe un jugador con el nombre "${nombre}" en el sistema. Si es el mismo jugador, búscalo en "Agregar jugador ya aprobado".`);
        return;
    }

    const nuevoJugador = {
        id: window.genId ? window.genId() : Date.now(),
        nombre,
        id_categoria_jugador: null, // el admin se lo asigna al aprobarlo
        estado: 'PENDIENTE'
    };
    data.jugadores.push(nuevoJugador);
    data.inscripciones.push({ id: window.genId ? window.genId() : Date.now(), id_jugador: nuevoJugador.id, id_participacion: participacionActivaId, numero_camiseta: numero });

    window.AppDB.save(data);

    if (typeof registrarActividad === 'function') {
        registrarActividad('JUGADOR_PROPUESTO', `Se propuso al jugador ${nombre} para revisión del admin`);
    }

    document.getElementById('formProponerJugador').reset();
    document.getElementById('modalProponerJugador').close();
    renderParticipacionActiva(participacionActivaId);
}

function quitarDelRoster(idInscripcion) {
    if (!confirm('¿Quitar a este jugador de tu equipo?')) return;
    const data = window.AppDB.get();
    data.inscripciones = data.inscripciones.filter(i => i.id !== idInscripcion);
    window.AppDB.save(data);
    renderParticipacionActiva(participacionActivaId);
}