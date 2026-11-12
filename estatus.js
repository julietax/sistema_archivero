const form = document.getElementById('estatusForm');
const estatusTableBody = document.getElementById('estatusTableBody');
const nombreInput = document.getElementById('nombreEstatus');
const idEstatusInput = document.getElementById('idEstatus');
const btnCancelar = document.getElementById('btnCancelar');
const btnLimpiar = document.getElementById('btnLimpiar');
const btnRegistrar = document.getElementById('btnRegistrar');

const alertSistema = document.getElementById('alertSistema');
const alertTexto = document.getElementById('alertTexto');

function mostrarAlertaSistema(mensaje) {
    if (alertSistema && alertTexto) {
        alertTexto.textContent = mensaje;
        alertSistema.classList.remove('d-none');
    }
}

function ocultarAlertaSistema() {
    if (alertSistema) alertSistema.classList.add('d-none');
}

// El botón Guardar solo se habilita si el nombre tiene texto
function actualizarBotonGuardar() {
    btnRegistrar.disabled = nombreInput.value.trim() === '';
}

nombreInput.addEventListener('input', actualizarBotonGuardar);

// Cargar listado de estatus
async function cargarEstatus() {
    try {
        const res = await fetch('/api/estatus-crud');
        const estatusList = await res.json();
        renderTabla(estatusList);
    } catch (error) {
        console.error("Error al cargar estatus:", error);
    }
}

function renderTabla(estatusList) {
    estatusTableBody.innerHTML = '';
    if (!estatusList || estatusList.length === 0) {
        estatusTableBody.innerHTML = `<tr><td colspan="2" class="empty-message">No hay estatus registrados</td></tr>`;
        return;
    }

    estatusList.forEach(e => {
        const tr = document.createElement('tr');

        const tdNombre = document.createElement('td');
        tdNombre.textContent = e.Estatus;   // textContent evita inyección de HTML

        const tdAcciones = document.createElement('td');
        tdAcciones.style.textAlign = 'center';
        tdAcciones.innerHTML = `
            <div class="action-btns" style="justify-content: center;">
                <button type="button" class="action-icon" title="Editar">✏️</button>
                <button type="button" class="action-icon" title="Eliminar">🗑️</button>
            </div>`;
        const [btnEditar, btnEliminar] = tdAcciones.querySelectorAll('button');
        btnEditar.addEventListener('click', () => editarEstatus(e.idEstatus, e.Estatus));
        btnEliminar.addEventListener('click', () => eliminarEstatus(e.idEstatus));

        tr.append(tdNombre, tdAcciones);
        estatusTableBody.appendChild(tr);
    });
}

window.editarEstatus = function(id, nombre) {
    idEstatusInput.value = id;
    nombreInput.value = nombre;
    actualizarBotonGuardar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Evento Guardar (Submit del formulario)
form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const id = idEstatusInput.value;
    const nombre = nombreInput.value.trim();

    if (!nombre) {
        mostrarAlertaSistema("Complete los campos obligatorios.");
        return;
    }

    if (nombre.length > 20) {
        mostrarAlertaSistema("El nombre no puede exceder los 20 caracteres.");
        return;
    }

    const metodo = id ? 'PUT' : 'POST';
    const url = id ? `/api/estatus-crud/${id}` : '/api/estatus-crud';

    try {
        const res = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre })
        });

        if (res.ok) {
            limpiarTodo();
            await cargarEstatus();
        } else {
            const err = await res.json();
            mostrarAlertaSistema(err.error || "Error al guardar estatus.");
        }
    } catch (error) {
        console.error("Error en fetch:", error);
        mostrarAlertaSistema("Error de conexión con el servidor.");
    }
});

window.eliminarEstatus = async function(id) {
    if (confirm("¿Estás seguro de eliminar este estatus?")) {
        try {
            const res = await fetch(`/api/estatus-crud/${id}`, { method: 'DELETE' });
            if (res.ok) {
                limpiarTodo();
                await cargarEstatus();
            } else {
                const err = await res.json();
                mostrarAlertaSistema(err.error || "No se pudo eliminar.");
            }
        } catch (error) {
            mostrarAlertaSistema("Error de conexión al eliminar.");
        }
    }
};

function limpiarTodo() {
    form.reset();
    idEstatusInput.value = '';
    ocultarAlertaSistema();
    actualizarBotonGuardar();
}

btnCancelar.addEventListener('click', limpiarTodo);
btnLimpiar.addEventListener('click', limpiarTodo);

// Inicializar
cargarEstatus();
actualizarBotonGuardar();