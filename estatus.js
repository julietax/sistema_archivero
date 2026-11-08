const form = document.getElementById('estatusForm');
const estatusTableBody = document.getElementById('estatusTableBody');
const nombreInput = document.getElementById('nombreEstatus');
const descripcionInput = document.getElementById('descripcionEstatus');
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

// Habilitar o deshabilitar botón según los campos
function actualizarBotonGuardar() {
    const camposCompletos = nombreInput.value.trim() !== '' && descripcionInput.value.trim() !== '';
    btnRegistrar.disabled = !camposCompletos;
}

nombreInput.addEventListener('input', actualizarBotonGuardar);
descripcionInput.addEventListener('input', actualizarBotonGuardar);

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
        estatusTableBody.innerHTML = `<tr><td colspan="3" class="empty-message">No hay estatus registrados</td></tr>`;
        return;
    }

    estatusList.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${e.Estatus}</td>
            <td>${e.Descripcion || ''}</td>
            <td style="text-align: center;">
                <div class="action-btns" style="justify-content: center;">
                    <button type="button" class="action-icon" onclick="editarEstatus(${e.idEstatus}, '${e.Estatus}', '${e.Descripcion || ''}')" title="Editar">✏️</button>
                    <button type="button" class="action-icon" onclick="eliminarEstatus(${e.idEstatus})" title="Eliminar">🗑️</button>
                </div>
            </td>
        `;
        estatusTableBody.appendChild(tr);
    });
}

window.editarEstatus = function(id, nombre, descripcion) {
    idEstatusInput.value = id;
    nombreInput.value = nombre;
    descripcionInput.value = descripcion;
    actualizarBotonGuardar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Evento Guardar (Submit del formulario)
form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const id = idEstatusInput.value;
    const nombre = nombreInput.value.trim();
    const descripcion = descripcionInput.value.trim();

    if (!nombre || !descripcion) {
        mostrarAlertaSistema("Complete los campos obligatorios.");
        return;
    }

    if (nombre.length > 20) {
        mostrarAlertaSistema("El nombre no puede exceder los 20 caracteres.");
        return;
    }

    if (descripcion.length > 35) {
        mostrarAlertaSistema("La descripción no puede exceder los 35 caracteres.");
        return;
    }

    const metodo = id ? 'PUT' : 'POST';
    const url = id ? `/api/estatus-crud/${id}` : '/api/estatus-crud';

    try {
        const res = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, descripcion })
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