const formulario = document.getElementById('tipoDocumentoForm');
const tabla = document.getElementById('tiposDocumentoTableBody');
const idInput = document.getElementById('idTipoDocumento');
const nombreInput = document.getElementById('nombre');
const descripcionInput = document.getElementById('descripcion');
const btnGuardar = document.getElementById('btnGuardar');

const alertSistema = document.getElementById('alertSistema');
const alertTexto = document.getElementById('alertTexto');

let tipos = [];

function mostrarAlertaSistema(mensaje) {
    if (alertSistema && alertTexto) {
        alertTexto.textContent = mensaje;
        alertSistema.classList.remove('d-none');
    }
}

function ocultarAlertaSistema() {
    if (alertSistema) alertSistema.classList.add('d-none');
}

function confirmarModal(mensaje) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalConfirmacion');
        const texto = document.getElementById('modalMensaje');
        const btnAceptar = document.getElementById('btnModalAceptar');
        const btnCancelarModal = document.getElementById('btnModalCancelar');

        if (!modal) {
            resolve(confirm(mensaje));
            return;
        }

        texto.textContent = mensaje;
        modal.classList.remove('d-none');

        const cerrar = (resultado) => {
            modal.classList.add('d-none');
            btnAceptar.onclick = null;
            btnCancelarModal.onclick = null;
            resolve(resultado);
        };

        btnAceptar.onclick = () => cerrar(true);
        btnCancelarModal.onclick = () => cerrar(false);
    });
}

function validarFormularioTipos() {
    ocultarAlertaSistema();
    const nombreLleno = nombreInput.value.trim() !== '';
    const descripcionLlena = descripcionInput.value.trim() !== '';
    btnGuardar.disabled = !(nombreLleno && descripcionLlena);
}

nombreInput.addEventListener('input', validarFormularioTipos);
descripcionInput.addEventListener('input', validarFormularioTipos);

async function cargarTipos() {
    try {
        const respuesta = await fetch('/api/tipos-documento');
        if (!respuesta.ok) throw new Error('Error del servidor');
        tipos = await respuesta.json();
        mostrarTipos();
    } catch (error) {
        console.error("Error al cargar tipos de documento:", error);
    }
}

function mostrarTipos() {
    tabla.innerHTML = '';

    if (tipos.length === 0) {
        tabla.innerHTML = '<tr><td colspan="3" class="empty-message">No hay tipos de documentos registrados</td></tr>';
        return;
    }

    tipos.forEach(tipo => {
        const fila = document.createElement('tr');

        const nombre = document.createElement('td');
        nombre.textContent = tipo.Nombre;

        const descripcion = document.createElement('td');
        descripcion.textContent = tipo.Descripcion;

        const acciones = document.createElement('td');
        acciones.style.textAlign = 'center';
        acciones.innerHTML = `
            <div class="action-btns" style="justify-content: center;">
                <button type="button" class="action-icon" title="Editar">✏️</button>
                <button type="button" class="action-icon" title="Eliminar">🗑️</button>
            </div>
        `;

        const [editar, eliminar] = acciones.querySelectorAll('button');
        editar.onclick = () => editarTipo(tipo.idTipo_documento);
        eliminar.onclick = () => eliminarTipo(tipo.idTipo_documento);

        fila.append(nombre, descripcion, acciones);
        tabla.appendChild(fila);
    });
}

function editarTipo(id) {
    const tipo = tipos.find(t => t.idTipo_documento === id);
    if (!tipo) return;

    ocultarAlertaSistema();
    idInput.value = tipo.idTipo_documento;
    nombreInput.value = tipo.Nombre;
    descripcionInput.value = tipo.Descripcion;
    btnGuardar.textContent = 'Actualizar';
    
    validarFormularioTipos();
    nombreInput.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormulario() {
    formulario.reset();
    idInput.value = '';
    btnGuardar.textContent = 'Guardar';
    ocultarAlertaSistema();
    validarFormularioTipos();
}

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    ocultarAlertaSistema();

    if (btnGuardar.disabled) return;

    const id = idInput.value;
    const datos = {
        nombre: nombreInput.value.trim(),
        descripcion: descripcionInput.value.trim()
    };

    if (datos.nombre.length > 30 || datos.descripcion.length > 50) {
        mostrarAlertaSistema('El nombre no puede superar los 30 caracteres y la descripción los 50.');
        return;
    }

    try {
        const respuesta = await fetch(
            id ? `/api/tipos-documento/${id}` : '/api/tipos-documento',
            {
                method: id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            }
        );

        if (!respuesta.ok) {
            const error = await respuesta.json().catch(() => ({}));
            mostrarAlertaSistema(error.error || 'Error al guardar el tipo de documento.');
            return;
        }

        limpiarFormulario();
        await cargarTipos();
    } catch (error) {
        console.error('Error al guardar tipo de documento:', error);
        mostrarAlertaSistema('No se pudo conectar con el servidor.');
    }
});

async function eliminarTipo(id) {
    solicitarConfirmacion('¿Seguro que deseas eliminar este tipo de documento?', async () => {
        try {
            const respuesta = await fetch(`/api/tipos-documento/${id}`, {
                method: 'DELETE'
            });

            if (!respuesta.ok) {
                const err = await respuesta.json().catch(() => ({}));
                mostrarAlertaSistema(err.error || 'No se pudo eliminar el tipo de documento.');
                return;
            }

            ocultarAlertaSistema();
            await cargarTipos();
        } catch (error) {
            console.error('Error al eliminar tipo de documento:', error);
            mostrarAlertaSistema('No se pudo conectar con el servidor.');
        }
    });
}

document.getElementById('btnCancelar').onclick = limpiarFormulario;
document.getElementById('btnLimpiar').onclick = limpiarFormulario;

validarFormularioTipos();
cargarTipos();