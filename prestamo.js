const form = document.getElementById('prestamoForm');
const prestamosTableBody = document.getElementById('prestamosTableBody');
const solicitanteSelect = document.getElementById('solicitante');
const matriculaSelect = document.getElementById('matriculaSelect');
const trabajadorSelect = document.getElementById('trabajadorSelect');
const estanteCajaInfo = document.getElementById('estanteCajaInfo');
const idPrestamoInput = document.getElementById('idPrestamo');
const btnCancelar = document.getElementById('btnCancelar');
const btnLimpiar = document.getElementById('btnLimpiar');
const fechaPrestamoInput = document.getElementById('fechaPrestamo');
const fechaEntregaInput = document.getElementById('fechaEntrega');
const btnRegistrar = document.getElementById('btnRegistrar');

// Elementos UI del sistema
const alertSistema = document.getElementById('alertSistema');
const alertTexto = document.getElementById('alertTexto');
const modalConfirmacion = document.getElementById('modalConfirmacion');
const modalMensaje = document.getElementById('modalMensaje');
const btnModalAceptar = document.getElementById('btnModalAceptar');
const btnModalCancelar = document.getElementById('btnModalCancelar');

let listaExpedientes = [];
let listaPrestamosActivos = [];

// Mostrar alerta del sistema
function mostrarAlertaSistema(mensaje) {
    if (alertSistema && alertTexto) {
        alertTexto.textContent = mensaje;
        alertSistema.classList.remove('d-none');
    }
}

// Ocultar alerta del sistema
function ocultarAlertaSistema() {
    if (alertSistema) {
        alertSistema.classList.add('d-none');
    }
}

// Ventana flotante de confirmación (reemplazo de confirm)
function solicitarConfirmacion(mensaje, callbackAceptar) {
    if (modalConfirmacion && modalMensaje) {
        modalMensaje.textContent = mensaje;
        modalConfirmacion.classList.remove('d-none');

        btnModalAceptar.onclick = () => {
            modalConfirmacion.classList.add('d-none');
            callbackAceptar();
        };
        btnModalCancelar.onclick = () => {
            modalConfirmacion.classList.add('d-none');
        };
    }
}

// ==========================================
// NUEVO: fechas (hora local, no UTC)
// ==========================================

// Convierte una fecha a formato AAAA-MM-DD con la hora local
function formatearFecha(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

const hoy = formatearFecha(new Date());

// Fecha límite: hoy + 15 días
const fechaLimiteDate = new Date();
fechaLimiteDate.setDate(fechaLimiteDate.getDate() + 15);
const fechaMaxima = formatearFecha(fechaLimiteDate);

// La fecha de préstamo siempre es hoy y no se puede editar.
// defaultValue hace que form.reset() la regrese a hoy en vez de dejarla vacía.
fechaPrestamoInput.defaultValue = hoy;
fechaPrestamoInput.value = hoy;

// La fecha de entrega solo puede ir de hoy a 15 días después
fechaEntregaInput.setAttribute('min', hoy);
fechaEntregaInput.setAttribute('max', fechaMaxima);

// Revisa que la fecha de entrega tenga valor y esté dentro del rango.
// Se comparan como texto porque el formato AAAA-MM-DD se ordena bien así.
function fechaEntregaValida() {
    const f = fechaEntregaInput.value;
    return f !== '' && f >= hoy && f <= fechaMaxima;
}

// ==========================================
// Carga inicial
// ==========================================
async function inicializarPantalla() {
    try {
        // Cargar Solicitantes (Usuarios)
        const resUsuarios = await fetch('/api/usuarios-select');
        const usuarios = await resUsuarios.json();
        solicitanteSelect.innerHTML = '<option value="">Seleccione un usuario...</option>';
        usuarios.forEach(u => {
            solicitanteSelect.innerHTML += `<option value="${u.idUsuarios}">${u.NombreCompleto}</option>`;
        });

        // Cargar Expedientes y Ubicación Física
        const resDocs = await fetch('/api/trabajadores-expedientes');
        listaExpedientes = await resDocs.json();

        matriculaSelect.innerHTML = '<option value="">Seleccione matrícula...</option>';
        trabajadorSelect.innerHTML = '<option value="">Seleccione trabajador...</option>';

        listaExpedientes.forEach(d => {
            matriculaSelect.innerHTML += `<option value="${d.idDocumento}">${d.No_trabajador}</option>`;
            trabajadorSelect.innerHTML += `<option value="${d.idDocumento}">${d.NombreTrabajador}</option>`;
        });

        await cargarPrestamos();
    } catch (error) {
        console.error("Error al inicializar datos de préstamos:", error);
    }
}

// ==========================================
// Validaciones
// ==========================================

// CAMBIO: solo dice si el expediente ya está prestado (ya no toca el botón)
function expedienteEstaPrestado(idDoc) {
    if (!idDoc) return false;

    const expSeleccionado = listaExpedientes.find(x => x.idDocumento == idDoc);
    if (!expSeleccionado) return false;

    return listaPrestamosActivos.some(p => String(p.Expediente) === String(expSeleccionado.No_trabajador));
}

// CAMBIO: solo muestra u oculta la alerta y regresa true si está disponible
function validarDisponibilidadExpediente(idDoc) {
    ocultarAlertaSistema();

    if (expedienteEstaPrestado(idDoc)) {
        mostrarAlertaSistema("No se puede seleccionar este expediente: Ya se encuentra actualmente prestado.");
        return false;
    }
    return true;
}

// NUEVO: el botón Registrar solo se habilita si todo está completo y correcto
function actualizarBotonRegistrar() {
    const camposCompletos =
        solicitanteSelect.value !== '' &&
        matriculaSelect.value !== '' &&
        trabajadorSelect.value !== '' &&
        fechaEntregaValida();

    const disponible = !expedienteEstaPrestado(matriculaSelect.value);

    btnRegistrar.disabled = !(camposCompletos && disponible);
}

// NUEVO: se llama cada vez que el usuario cambia algo del formulario
function revisarFormulario() {
    const disponible = validarDisponibilidadExpediente(matriculaSelect.value);

    // Si el expediente está bien pero la fecha de entrega está fuera de rango, se avisa
    if (disponible && fechaEntregaInput.value && !fechaEntregaValida()) {
        mostrarAlertaSistema("La fecha de entrega debe ser de hoy en adelante y máximo 15 días después (hasta " + fechaMaxima + ").");
    }

    actualizarBotonRegistrar();
}

// ==========================================
// Eventos de los campos
// ==========================================

// Sincronización cruzada: matrícula <-> trabajador
function seleccionarExpediente(idDoc) {
    matriculaSelect.value = idDoc;
    trabajadorSelect.value = idDoc;

    if (idDoc) {
        mostrarUbicacion(idDoc);
    } else {
        estanteCajaInfo.value = "";
    }
    revisarFormulario();
}

matriculaSelect.addEventListener('change', function() {
    seleccionarExpediente(this.value);
});

trabajadorSelect.addEventListener('change', function() {
    seleccionarExpediente(this.value);
});

solicitanteSelect.addEventListener('change', revisarFormulario);
fechaEntregaInput.addEventListener('change', revisarFormulario);

function mostrarUbicacion(idDoc) {
    const encontrado = listaExpedientes.find(x => x.idDocumento == idDoc);
    if (encontrado) {
        estanteCajaInfo.value = `Estante: ${encontrado.Estante} | Caja: ${encontrado.Caja} (${encontrado.DescripcionCaja})`;
    }
}

// ==========================================
// Listado
// ==========================================
async function cargarPrestamos() {
    try {
        const response = await fetch('/api/prestamos');
        listaPrestamosActivos = await response.json();
        renderTablaPrestamos(listaPrestamosActivos);
    } catch (error) {
        console.error("Error al cargar los préstamos:", error);
    }
}

function renderTablaPrestamos(prestamos) {
    prestamosTableBody.innerHTML = '';

    if (prestamos.length === 0) {
        prestamosTableBody.innerHTML = `<tr><td colspan="6" class="empty-message">No hay préstamos registrados</td></tr>`;
        return;
    }

    prestamos.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.Expediente}</td>
            <td>${p.Trabajador || 'N/A'}</td>
            <td>${p.Fecha_prestamo ? p.Fecha_prestamo.split('T')[0] : ''}</td>
            <td>${p.Fecha_entrega ? p.Fecha_entrega.split('T')[0] : ''}</td>
            <td>${p.Solicitante || 'N/A'}</td>
            <td style="text-align: center;">
                <div class="action-btns" style="justify-content: center;">
                    <button class="action-icon" onclick="eliminarPrestamo(${p.idPrestamo})" title="Eliminar">🗑️</button>
                </div>
            </td>
        `;
        prestamosTableBody.appendChild(tr);
    });
}

// ==========================================
// Guardar
// ==========================================
form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const usuario_id = solicitanteSelect.value;
    const documento_id = matriculaSelect.value;
    const fecha_prestamo = fechaPrestamoInput.value;
    const fecha_entrega = fechaEntregaInput.value;

    if (!validarDisponibilidadExpediente(documento_id)) {
        return;
    }

    if (!usuario_id || !documento_id || !fecha_prestamo || !fecha_entrega) {
        mostrarAlertaSistema("Por favor complete todos los campos obligatorios.");
        return;
    }

    // CAMBIO: ahora se valida contra el rango de hoy a 15 días
    if (!fechaEntregaValida()) {
        mostrarAlertaSistema("La fecha de entrega debe ser de hoy en adelante y máximo 15 días después (hasta " + fechaMaxima + ").");
        return;
    }

    try {
        const response = await fetch('/api/prestamos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id, documento_id, fecha_prestamo, fecha_entrega })
        });

        if (response.ok) {
            limpiarTodo();
            await cargarPrestamos();
        } else {
            const errData = await response.json();
            mostrarAlertaSistema("No se pudo registrar el préstamo: " + (errData.error || "Error desconocido"));
        }
    } catch (error) {
        console.error("Error al registrar préstamo:", error);
        mostrarAlertaSistema("Error de conexión con el servidor.");
    }
});

window.eliminarPrestamo = function(id) {
    solicitarConfirmacion("¿Estás seguro de eliminar este registro de préstamo?", async () => {
        try {
            const response = await fetch(`/api/prestamos/${id}`, { method: 'DELETE' });
            if (response.ok) {
                limpiarTodo();
                await cargarPrestamos();
            } else {
                mostrarAlertaSistema("Ocurrió un error al intentar eliminar el préstamo.");
            }
        } catch (error) {
            console.error("Error al eliminar:", error);
            mostrarAlertaSistema("Error de conexión al eliminar.");
        }
    });
};

function limpiarTodo() {
    form.reset();                 // la fecha de préstamo regresa a hoy por el defaultValue
    idPrestamoInput.value = '';
    estanteCajaInfo.value = '';
    ocultarAlertaSistema();
    actualizarBotonRegistrar();   // CAMBIO: con el form vacío, el botón queda deshabilitado
}

btnCancelar.addEventListener('click', limpiarTodo);
btnLimpiar.addEventListener('click', limpiarTodo);

inicializarPantalla();
actualizarBotonRegistrar();       // NUEVO: el botón arranca deshabilitado