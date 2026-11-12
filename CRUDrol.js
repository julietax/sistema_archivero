let roles = [];

const form = document.getElementById('roleForm');
const rolesTableBody = document.getElementById('rolesTableBody');
const idRolesInput = document.getElementById('idRoles');
const nombreInput = document.getElementById('nombre');
const descripcionInput = document.getElementById('descripcion');
const btnCancelar = document.getElementById('btnCancelar');
const btnLimpiar = document.getElementById('btnLimpiar');
const btnGuardar = document.getElementById('btnGuardar');

// Elementos UI del sistema para alertas y modales
const alertSistema = document.getElementById('alertSistema');
const alertTexto = document.getElementById('alertTexto');
const modalConfirmacion = document.getElementById('modalConfirmacion');
const modalMensaje = document.getElementById('modalMensaje');
const btnModalAceptar = document.getElementById('btnModalAceptar');
const btnModalCancelar = document.getElementById('btnModalCancelar');

// Habilitar / Deshabilitar el botón Guardar dinámicamente según los campos
function validarFormulario() {
    const nombreCompleto = nombreInput.value.trim() !== '';
    const descripcionCompleta = descripcionInput.value.trim() !== '';

    if (btnGuardar) {
        btnGuardar.disabled = !(nombreCompleto && descripcionCompleta);
    }
}

// Escuchar cambios de escritura en tiempo real
nombreInput.addEventListener('input', validarFormulario);
descripcionInput.addEventListener('input', validarFormulario);

// Mostrar alerta del sistema
function mostrarAlertaSistema(mensaje) {
    if (alertSistema && alertTexto) {
        alertTexto.textContent = mensaje;
        alertSistema.classList.remove('d-none');
    } else {
        alert(mensaje); // Fallback por si no existe el div en el HTML
    }
}

// Ocultar alerta del sistema
function ocultarAlertaSistema() {
    if (alertSistema) {
        alertSistema.classList.add('d-none');
    }
}

// Ventana flotante de confirmación personalizada (Modal elegante)
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
    } else {
        // Fallback por si el modal HTML no está en el DOM
        if (confirm(mensaje)) {
            callbackAceptar();
        }
    }
}

async function cargarRoles() {
    try {
        const response = await fetch('/api/roles');
        roles = await response.json();
        renderTable();
    } catch (error) {
        console.error("Error al cargar roles:", error);
    }
}

function renderTable() {
    rolesTableBody.innerHTML = '';
    
    if (roles.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="3" class="empty-message">No hay roles registrados</td>`;
        rolesTableBody.appendChild(tr);
        return;
    }

    roles.forEach(rol => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${rol.Nombre}</td>
            <td>${rol.Descripcion}</td>
            <td style="text-align: center;">
                <div class="action-btns" style="justify-content: center;">
                    <button class="action-icon" onclick="editarRol(${rol.idRoles})" title="Editar">✏️</button>
                    <button class="action-icon" onclick="eliminarRol(${rol.idRoles})" title="Eliminar">🗑️</button>
                </div>
            </td>
        `;
        rolesTableBody.appendChild(tr);
    });
}

form.addEventListener('submit', async function(e) {
    e.preventDefault();
    ocultarAlertaSistema();

    const id = idRolesInput.value;
    const nombre = nombreInput.value.trim();
    const descripcion = descripcionInput.value.trim();

    if (!nombre || !descripcion) {
        mostrarAlertaSistema("Completa todos los campos obligatorios.");
        return;
    }

    const dataRol = { nombre, descripcion };

    try {
        const url = id ? `/api/roles/${id}` : '/api/roles';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataRol)
        });

        const resultado = await response.json().catch(() => ({}));

        if (!response.ok) {
            mostrarAlertaSistema(resultado.error || `El servidor respondió con error ${response.status}.`);
            return;
        }

        limpiarFormulario();
        cargarRoles();
    } catch (error) {
        console.error("Error al guardar el rol:", error);
        mostrarAlertaSistema("No se pudo conectar con el servidor.");
    }
});

window.editarRol = function(id) {
    const rol = roles.find(r => r.idRoles == id);
    if (rol) {
        ocultarAlertaSistema();
        idRolesInput.value = rol.idRoles;
        nombreInput.value = rol.Nombre;
        descripcionInput.value = rol.Descripcion;
        validarFormulario();
        if (btnGuardar) btnGuardar.textContent = 'Actualizar';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.eliminarRol = function(id) {
    solicitarConfirmacion("¿Estás seguro de que deseas eliminar este rol?", async () => {
        try {
            const response = await fetch(`/api/roles/${id}`, { method: 'DELETE' });
            if (response.ok) {
                ocultarAlertaSistema();
                cargarRoles();
            } else {
                mostrarAlertaSistema("No se pudo eliminar el rol (puede estar vinculado a un usuario).");
            }
        } catch (error) {
            console.error("Error al eliminar rol:", error);
            mostrarAlertaSistema("No se pudo conectar con el servidor.");
        }
    });
};

btnCancelar.addEventListener('click', limpiarFormulario);
btnLimpiar.addEventListener('click', limpiarFormulario);

function limpiarFormulario() {
    form.reset();
    idRolesInput.value = '';
    validarFormulario();
    ocultarAlertaSistema();
    if (btnGuardar) btnGuardar.textContent = 'Guardar';
}

// Inicialización al cargar la página
cargarRoles();
validarFormulario();